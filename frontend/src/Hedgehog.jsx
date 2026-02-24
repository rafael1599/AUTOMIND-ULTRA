import React, { useMemo } from 'react'
import * as THREE from 'three'

export default function Hedgehog({ radius = 1 }) {
    // Generate spikes positions once
    const spikes = useMemo(() => {
        const count = 12
        const pts = []
        for (let i = 0; i < count; i++) {
            const phi = Math.acos(-1 + (2 * i) / count)
            const theta = Math.sqrt(count * Math.PI) * phi
            pts.push(new THREE.Vector3().setFromSphericalCoords(1.4, phi, theta))
        }
        return pts
    }, [])

    return (
        <group scale={radius * 0.7}>
            {/* Central Core */}
            <mesh castShadow>
                <sphereGeometry args={[0.6, 16, 16]} />
                <meshStandardMaterial color="#0f172a" metalness={1} roughness={0.2} />
            </mesh>

            {/* Sharp Spikes pointing in all directions */}
            {spikes.map((pos, i) => (
                <group key={i} position={pos.clone().multiplyScalar(0.3)}>
                    <mesh rotation={new THREE.Euler().setFromQuaternion(
                        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize())
                    )}>
                        <coneGeometry args={[0.15, 1.8, 8]} />
                        <meshStandardMaterial color="#1e293b" metalness={1} roughness={0.1} />

                        {/* Glowing Tip */}
                        <mesh position={[0, 0.9, 0]}>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={5} />
                        </mesh>
                    </mesh>
                </group>
            ))}

            {/* Inner Heat Glow */}
            <pointLight intensity={2} distance={radius * 2} color="#ff0000" />

            {/* Core decoration */}
            <mesh>
                <octahedronGeometry args={[0.65, 0]} />
                <meshStandardMaterial color="#ff0000" wireframe />
            </mesh>
        </group>
    )
}
