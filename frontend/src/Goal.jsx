import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Octahedron } from '@react-three/drei'

export default function Goal({ position, isActive }) {
    const goalRef = useRef()

    // Choose colors based on status
    const color = isActive ? "#00ff88" : "#ff5500"

    useFrame((state) => {
        if (goalRef.current) {
            // Bobbing floating effect
            goalRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2
            // Spinning effect
            goalRef.current.rotation.y += isActive ? 0.05 : 0.02
            goalRef.current.rotation.x += isActive ? 0.02 : 0.01
        }
    })

    return (
        <group position={position}>
            {/* The Neon Floor Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <torusGeometry args={[2.5, 0.08, 16, 64]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isActive ? 10 : 2}
                />
            </mesh>

            {/* Glowing Floor Plate (Beacon) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[2.6, 32]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={0.3}
                />
            </mesh>

            <group ref={goalRef}>
                <Octahedron args={[0.3]}>
                    <meshStandardMaterial color={color} emissive={color} wireframe />
                </Octahedron>
                <Octahedron args={[0.2]}>
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 2 : 0.5} />
                </Octahedron>
                <pointLight distance={5} intensity={isActive ? 5 : 1} color={color} />
            </group>
        </group>
    )
}
