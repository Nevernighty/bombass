import React, { useRef, useEffect, useCallback } from 'react';
import { GameState } from '../types';
import { STATIONS, METRO_LINES, LINE_STATIONS } from '../constants';

interface MinimapProps {
  stateRef: React.MutableRefObject<GameState>;
  onPanTo: (nx: number, ny: number) => void;
}

const W = 180;
const H = 140;

export const Minimap = React.memo(function Minimap({ stateRef, onPanTo }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(6,10,20,0.85)';
    ctx.fillRect(0, 0, W, H);

    const activeSet = new Set(s.activeStationIds);

    // Draw lines
    (['red', 'blue', 'green'] as const).forEach(line => {
      const ids = LINE_STATIONS[line].filter(id => activeSet.has(id));
      if (ids.length < 2) return;
      ctx.strokeStyle = METRO_LINES[line].color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ids.forEach((id, i) => {
        const st = STATIONS.find(ss => ss.id === id);
        if (!st) return;
        const x = st.x * W, y = st.y * H;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Draw stations
    s.stations.forEach(st => {
      if (!activeSet.has(st.id)) return;
      const x = st.x * W, y = st.y * H;
      ctx.fillStyle = st.isDestroyed ? '#444' : METRO_LINES[st.line].color;
      ctx.beginPath();
      ctx.arc(x, y, st.isTransfer ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw trains
    s.trains.forEach(t => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(t.x * W, t.y * H, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw drones
    s.drones.filter(d => !d.isDestroyed).forEach(d => {
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      const dx = d.x * W, dy = d.y * H;
      ctx.moveTo(dx, dy - 3);
      ctx.lineTo(dx - 2, dy + 2);
      ctx.lineTo(dx + 2, dy + 2);
      ctx.closePath();
      ctx.fill();
    });

    // Camera viewport indicator
    const cam = s.camera;
    const vw = 30 / Math.max(cam.zoom, 0.3);
    const vh = 24 / Math.max(cam.zoom, 0.3);
    const cx = (0.5 - cam.x * 0.01) * W;
    const cy = (0.5 - cam.y * 0.01) * H;
    ctx.strokeStyle = s.isAirRaid ? '#ff4444' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - vw / 2, cy - vh / 2, vw, vh);

    // Border
    ctx.strokeStyle = s.isAirRaid ? '#ff4444' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = s.isAirRaid ? 2 : 1;
    ctx.strokeRect(0, 0, W, H);

    animRef.current = requestAnimationFrame(draw);
  }, [stateRef]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    onPanTo(nx, ny);
  }, [onPanTo]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onClick={handleClick}
      className="absolute bottom-16 right-2 rounded-lg cursor-pointer pointer-events-auto"
      style={{ width: W, height: H, imageRendering: 'pixelated' }}
    />
  );
});
