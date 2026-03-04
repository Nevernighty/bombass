import { GameState, GameStation, Train, Drone } from './types';
import { METRO_LINES, STATIONS, GAME_CONFIG, DNIPRO_RIVER_POINTS, SURFACE_ROUTES, SHAPE_COLORS, PassengerShape } from './constants';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private droneImg: HTMLImageElement | null = null;
  private droneLoaded = false;
  private time = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    // Load drone image
    this.droneImg = new Image();
    this.droneImg.src = new URL('../assets/drone-shahed.png', import.meta.url).href;
    this.droneImg.onload = () => { this.droneLoaded = true; };
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  private toScreen(nx: number, ny: number, cam: GameState['camera']): [number, number] {
    const sx = (nx * this.width - cam.x) * cam.zoom + this.width / 2;
    const sy = (ny * this.height - cam.y) * cam.zoom + this.height / 2;
    return [sx, sy];
  }

  render(state: GameState, dt: number) {
    this.time += dt;
    const { ctx } = this;
    const cam = state.camera;

    // Screen shake
    ctx.save();
    if (state.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * state.screenShake,
        (Math.random() - 0.5) * state.screenShake
      );
    }

    // Background - day/night cycle
    const nightAmount = state.isNight ? 0.8 : 0;
    const raidDesaturate = state.isAirRaid ? 0.5 : 0;
    
    const bgR = Math.round(12 + (1 - nightAmount) * 20 - raidDesaturate * 10);
    const bgG = Math.round(15 + (1 - nightAmount) * 25 - raidDesaturate * 15);
    const bgB = Math.round(30 + (1 - nightAmount) * 20 + raidDesaturate * 5);
    ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // Air raid warning rings
    if (state.isAirRaid) {
      const pulse = (Math.sin(this.time / 300) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.1 + pulse * 0.15})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const r = 50 + (this.time / 10 + i * 100) % 400;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw Dnipro river
    this.drawRiver(cam, nightAmount);

    // Draw surface routes
    this.drawSurfaceRoutes(state, cam);

    // Draw metro lines
    this.drawMetroLines(state, cam, nightAmount);

    // Draw stations
    state.stations.forEach(station => {
      this.drawStation(station, state, cam, nightAmount);
    });

    // Draw surface vehicles
    state.surfaceVehicles.forEach(v => {
      const route = SURFACE_ROUTES.find(r => r.id === v.routeId);
      if (!route) return;
      const [sx, sy] = this.toScreen(v.x, v.y, cam);
      ctx.fillStyle = v.isFrozen ? '#555' : route.color;
      ctx.globalAlpha = v.isFrozen ? 0.4 : 1;
      
      if (v.type === 'bus') {
        this.drawRoundedRect(sx - 8, sy - 5, 16, 10, 3);
      } else if (v.type === 'tram') {
        ctx.fillRect(sx - 10, sy - 4, 20, 8);
      } else {
        ctx.fillRect(sx - 12, sy - 5, 24, 10);
      }
      ctx.globalAlpha = 1;
    });

    // Draw trains
    state.trains.forEach(train => {
      this.drawTrain(train, state, cam);
    });

    // Draw drones
    state.drones.filter(d => !d.isDestroyed).forEach(drone => {
      this.drawDrone(drone, state, cam);
    });

    // Draw explosions
    state.explosions.forEach(exp => {
      const [ex, ey] = this.toScreen(exp.x, exp.y, cam);
      ctx.globalAlpha = exp.alpha;
      const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, exp.radius * cam.zoom);
      grad.addColorStop(0, '#ff6600');
      grad.addColorStop(0.5, '#ff3300');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ex, ey, exp.radius * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw repair units
    state.repairUnits.forEach(r => {
      const [rx, ry] = this.toScreen(r.x, r.y, cam);
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(rx, ry - 8);
      ctx.lineTo(rx + 8, ry + 4);
      ctx.lineTo(rx - 8, ry + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.fillText('ДСНС', rx - 12, ry + 16);
    });

    // QTE indicator
    if (state.qteActive) {
      const drone = state.drones.find(d => d.id === state.qteDroneId);
      if (drone) {
        const [dx, dy] = this.toScreen(drone.x, drone.y, cam);
        const timerFrac = state.qteTimer / 2000;
        ctx.strokeStyle = `rgba(255, 255, 0, ${0.5 + Math.sin(this.time / 100) * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(dx, dy, 30, 0, Math.PI * 2 * timerFrac);
        ctx.stroke();

        ctx.fillStyle = '#ff0';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Натисни [${state.qteKey}]`, dx, dy - 40);
        ctx.textAlign = 'start';
      }
    }

    ctx.restore();
  }

  private drawRiver(cam: GameState['camera'], nightAmount: number) {
    const { ctx } = this;
    ctx.beginPath();
    const pts = DNIPRO_RIVER_POINTS.map(p => this.toScreen(p.x, p.y, cam));
    
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cpx = (prev[0] + cur[0]) / 2;
      const cpy = (prev[1] + cur[1]) / 2;
      ctx.quadraticCurveTo(prev[0], prev[1], cpx, cpy);
    }

    // Make it a wide band
    const riverColor = nightAmount > 0.5 ? 'rgba(20, 40, 80, 0.6)' : 'rgba(30, 70, 120, 0.4)';
    ctx.strokeStyle = riverColor;
    ctx.lineWidth = 40 * cam.zoom;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Shimmer
    ctx.strokeStyle = nightAmount > 0.5 ? 'rgba(40, 80, 140, 0.3)' : 'rgba(50, 100, 160, 0.2)';
    ctx.lineWidth = 20 * cam.zoom;
    ctx.stroke();
  }

  private drawMetroLines(state: GameState, cam: GameState['camera'], nightAmount: number) {
    const { ctx } = this;
    const lines = ['red', 'blue', 'green'] as const;

    lines.forEach(line => {
      const lineStations = state.stations.filter(s => s.line === line);
      if (lineStations.length < 2) return;

      const { color, glowColor } = METRO_LINES[line];

      // Glow effect at night
      if (nightAmount > 0.3) {
        ctx.beginPath();
        const pts = lineStations.map(s => this.toScreen(s.x + s.jellyOffset.x * 0.001, s.y + s.jellyOffset.y * 0.001, cam));
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 8 * cam.zoom;
        ctx.globalAlpha = nightAmount * 0.4;
        ctx.filter = `blur(${4 * cam.zoom}px)`;
        ctx.stroke();
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }

      // Main line
      ctx.beginPath();
      const pts = lineStations.map(s => this.toScreen(s.x + s.jellyOffset.x * 0.001, s.y + s.jellyOffset.y * 0.001, cam));
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        // Smooth bezier between stations
        const prev = pts[i - 1];
        const cur = pts[i];
        const cpx = (prev[0] + cur[0]) / 2;
        const cpy = (prev[1] + cur[1]) / 2;
        ctx.quadraticCurveTo(prev[0], prev[1], cpx, cpy);
      }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4 * cam.zoom;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
  }

  private drawStation(station: GameStation, state: GameState, cam: GameState['camera'], nightAmount: number) {
    const { ctx } = this;
    const jx = station.jellyOffset.x * 0.002;
    const jy = station.jellyOffset.y * 0.002;
    const [sx, sy] = this.toScreen(station.x + jx, station.y + jy, cam);
    const r = GAME_CONFIG.STATION_RADIUS * cam.zoom;

    // Fire effect
    if (station.isOnFire) {
      for (let i = 0; i < 5; i++) {
        const fx = sx + (Math.random() - 0.5) * r * 3;
        const fy = sy - Math.random() * r * 2;
        const fr = Math.random() * 6 + 2;
        ctx.fillStyle = Math.random() > 0.5 ? '#ff4400' : '#ffaa00';
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.arc(fx, fy, fr * cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Station circle
    const lineColor = METRO_LINES[station.line].color;
    if (station.isDestroyed) {
      ctx.fillStyle = '#333';
      ctx.strokeStyle = '#555';
    } else {
      ctx.fillStyle = station.isTransfer ? '#fff' : lineColor;
      ctx.strokeStyle = '#fff';
    }

    // Jelly scale effect
    const jellyScale = 1 + Math.sin(station.jellyOffset.x * 0.5) * 0.1 + Math.sin(station.jellyOffset.y * 0.5) * 0.1;

    ctx.beginPath();
    ctx.arc(sx, sy, r * jellyScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2 * cam.zoom;
    ctx.stroke();

    // Transfer station indicator
    if (station.isTransfer) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3 * cam.zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.6 * jellyScale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // HP bar for damaged stations
    if (station.hp < station.maxHp && !station.isDestroyed) {
      const barW = 30 * cam.zoom;
      const barH = 4 * cam.zoom;
      ctx.fillStyle = '#333';
      ctx.fillRect(sx - barW / 2, sy + r + 4, barW, barH);
      ctx.fillStyle = station.hp > 50 ? '#2ecc71' : station.hp > 25 ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(sx - barW / 2, sy + r + 4, barW * (station.hp / station.maxHp), barH);
    }

    // Repair progress
    if (station.isRepairing) {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3 * cam.zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 6 * cam.zoom, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * station.repairProgress);
      ctx.stroke();
    }

    // Passenger indicators
    const maxShow = Math.min(station.passengers.length, 6);
    for (let i = 0; i < maxShow; i++) {
      const angle = (i / maxShow) * Math.PI * 2 - Math.PI / 2;
      const px = sx + Math.cos(angle) * (r + 10 * cam.zoom);
      const py = sy + Math.sin(angle) * (r + 10 * cam.zoom);
      this.drawPassengerShape(station.passengers[i].shape, px, py, 4 * cam.zoom);
    }

    // Overflow warning
    if (station.passengers.length >= GAME_CONFIG.MAX_PASSENGERS_PER_STATION - 1) {
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(this.time / 200) * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 15 * cam.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Station name
    ctx.fillStyle = state.isNight ? 'rgba(200,200,220,0.8)' : 'rgba(220,220,240,0.9)';
    ctx.font = `${Math.max(8, 10 * cam.zoom)}px sans-serif`;
    ctx.textAlign = 'center';

    // Background for label
    const name = station.nameUa;
    const textW = ctx.measureText(name).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(sx - textW / 2 - 2, sy - r - 14 * cam.zoom, textW + 4, 12 * cam.zoom);
    ctx.fillStyle = 'rgba(220,220,240,0.9)';
    ctx.fillText(name, sx, sy - r - 4 * cam.zoom);
    ctx.textAlign = 'start';
  }

  private drawPassengerShape(shape: PassengerShape, x: number, y: number, r: number) {
    const { ctx } = this;
    ctx.fillStyle = SHAPE_COLORS[shape];
    ctx.beginPath();
    switch (shape) {
      case 'circle':
        ctx.arc(x, y, r, 0, Math.PI * 2);
        break;
      case 'square':
        ctx.rect(x - r, y - r, r * 2, r * 2);
        break;
      case 'triangle':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.closePath();
        break;
      case 'diamond':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        break;
      case 'star':
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const ix = x + Math.cos(angle) * r;
          const iy = y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(ix, iy);
          else ctx.lineTo(ix, iy);
          const innerAngle = angle + Math.PI / 5;
          ctx.lineTo(x + Math.cos(innerAngle) * r * 0.4, y + Math.sin(innerAngle) * r * 0.4);
        }
        ctx.closePath();
        break;
    }
    ctx.fill();
  }

  private drawTrain(train: Train, state: GameState, cam: GameState['camera']) {
    const { ctx } = this;
    const [tx, ty] = this.toScreen(train.x, train.y, cam);
    const isSelected = state.selectedTrain === train.id;
    const lineColor = METRO_LINES[train.line].color;

    // Train body
    ctx.fillStyle = lineColor;
    const w = 14 * cam.zoom;
    const h = 8 * cam.zoom;

    ctx.save();
    ctx.translate(tx, ty);

    // Selection glow
    if (isSelected) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
    }

    this.drawRoundedRect(-w / 2, -h / 2, w, h, 3 * cam.zoom);
    ctx.shadowBlur = 0;

    // Passenger count indicator
    if (train.passengers.length > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${8 * cam.zoom}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${train.passengers.length}`, 0, 3 * cam.zoom);
      ctx.textAlign = 'start';
    }

    // Direction arrow
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const arrowX = train.direction * 8 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(arrowX, 0);
    ctx.lineTo(arrowX - train.direction * 4 * cam.zoom, -3 * cam.zoom);
    ctx.lineTo(arrowX - train.direction * 4 * cam.zoom, 3 * cam.zoom);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawDrone(drone: Drone, state: GameState, cam: GameState['camera']) {
    const { ctx } = this;
    const [dx, dy] = this.toScreen(drone.x, drone.y, cam);
    const wobbleY = Math.sin(drone.wobble) * 3;

    if (this.droneLoaded && this.droneImg) {
      ctx.save();
      ctx.translate(dx, dy + wobbleY);
      ctx.rotate(drone.angle);
      const size = 32 * cam.zoom;
      ctx.drawImage(this.droneImg, -size / 2, -size / 2, size, size);

      // Red glow
      ctx.globalAlpha = 0.3 + Math.sin(this.time / 200) * 0.2;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
      ctx.drawImage(this.droneImg, -size / 2, -size / 2, size, size);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = '#333';
      ctx.save();
      ctx.translate(dx, dy + wobbleY);
      ctx.rotate(drone.angle);
      ctx.beginPath();
      ctx.moveTo(15 * cam.zoom, 0);
      ctx.lineTo(-8 * cam.zoom, -10 * cam.zoom);
      ctx.lineTo(-5 * cam.zoom, 0);
      ctx.lineTo(-8 * cam.zoom, 10 * cam.zoom);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSurfaceRoutes(state: GameState, cam: GameState['camera']) {
    const { ctx } = this;
    state.unlockedRoutes.forEach(routeId => {
      const route = SURFACE_ROUTES.find(r => r.id === routeId);
      if (!route) return;

      ctx.setLineDash(route.type === 'bus' ? [8, 4] : route.type === 'tram' ? [4, 4] : [12, 4]);
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 2 * cam.zoom;
      ctx.globalAlpha = state.isAirRaid ? 0.2 : 0.6;
      ctx.beginPath();
      route.stops.forEach((stop, i) => {
        const [sx, sy] = this.toScreen(stop.x, stop.y, cam);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Stop dots
      route.stops.forEach(stop => {
        const [sx, sy] = this.toScreen(stop.x, stop.y, cam);
        ctx.fillStyle = route.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 4 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  // Hit test for clicking on stations/trains
  hitTestStation(mx: number, my: number, state: GameState): string | null {
    const cam = state.camera;
    for (const station of state.stations) {
      const [sx, sy] = this.toScreen(station.x, station.y, cam);
      const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
      if (dist < GAME_CONFIG.STATION_HIT_RADIUS * cam.zoom) {
        return station.id;
      }
    }
    return null;
  }

  hitTestTrain(mx: number, my: number, state: GameState): string | null {
    const cam = state.camera;
    for (const train of state.trains) {
      const [tx, ty] = this.toScreen(train.x, train.y, cam);
      const dist = Math.sqrt((mx - tx) ** 2 + (my - ty) ** 2);
      if (dist < 18 * cam.zoom) {
        return train.id;
      }
    }
    return null;
  }
}
