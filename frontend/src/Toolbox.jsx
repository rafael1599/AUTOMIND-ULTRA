import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function Toolbox({ position, visible }) {
    const groupRef = useRef()

    useFrame((state) => {
        if (groupRef.current && visible) {
            // Gentle floating animation
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
            groupRef.current.rotation.y += 0.02
        }
    })

    if (!visible) return null

    return (
        <group position={position} ref={groupRef} scale={4.5}>
            {/* Main Yellow Body */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[0.4, 0.35, 0.5]} />
                <meshStandardMaterial color="#EAB308" roughness={0.4} metalness={0.7} />
            </mesh>

            {/* Top Metal Grip Section */}
            <mesh position={[0, 0.17, 0]}>
                <boxGeometry args={[0.42, 0.05, 0.52]} />
                <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Black Decorative Band (Middle) */}
            <mesh position={[0, -0.02, 0]}>
                <boxGeometry args={[0.41, 0.08, 0.51]} />
                <meshStandardMaterial color="#111827" />
            </mesh>

            {/* Handle / Connection Point */}
            <mesh position={[0, 0.22, 0]} castShadow>
                <boxGeometry args={[0.1, 0.05, 0.1]} />
                <meshStandardMaterial color="#374151" />
            </mesh>
        </group>
    )
}
