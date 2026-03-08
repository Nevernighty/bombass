import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GameState } from '../types';
import { toWorld } from '../constants';

function NotificationsLayerInner({ stateRef }: { stateRef: React.MutableRefObject<GameState> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const state = stateRef.current;
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    state.notifications.forEach((notif, i) => {
      if (i >= children.length) return;
      const billboard = children[i] as any;
      const [wx, , wz] = toWorld(notif.x, notif.y);
      const height = 4 + (2000 - notif.timer) * 0.004;
      billboard.position.set(wx, height, wz);
      billboard.visible = true;
      const textMesh = billboard.children?.[0];
      if (textMesh) {
        textMesh.fillOpacity = Math.min(1, notif.timer / 500);
        textMesh.color = notif.color;
        textMesh.text = notif.text;
      }
    });

    for (let i = state.notifications.length; i < children.length; i++) {
      children[i].visible = false;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Billboard key={i} visible={false}>
          <Text
            fontSize={0.7}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.06}
            outlineColor="#000000"
            fontWeight="bold"
          >
            {''}
          </Text>
        </Billboard>
      ))}
    </group>
  );
}

export const NotificationsLayer = React.forwardRef<THREE.Group, { stateRef: React.MutableRefObject<GameState> }>(
  (props, ref) => <NotificationsLayerInner {...props} />
);
