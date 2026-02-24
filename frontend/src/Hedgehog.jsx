import React from 'react'
import * as THREE from 'three'

export default function Hedgehog({ radius = 1 }) {
    return (
        <group scale={radius * 1.5}>
            {/* Dark Metallic Material */}
            {/* Intersecting beams to form the Czech Hedgehog */}
            <mesh rotation={[0, 0, 0]}>
                <boxGeometry args={[2, 0.2, 0.2]} />
                <meshStandardMaterial color="#111827" metalness={1} roughness={0.1} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.2, 2, 0.2]} />
                <meshStandardMaterial color="#111827" metalness={1} roughness={0.1} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.2, 0.2, 2]} />
                <meshStandardMaterial color="#111827" metalness={1} roughness={0.1} />
            </mesh>

            {/* Red warning tip at the center */}
            <mesh>
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
            </mesh>

            {/* Subtle light to highlight the metal */}
            <pointLight position={[0, 1, 0]} intensity={0.5} distance={5} color="#00ffff" />
        </group>
    )
}
