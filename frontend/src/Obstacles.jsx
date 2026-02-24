import React, { Suspense } from 'react'
import AnimeVFXModel from './AnimeVFXModel'

export default function Obstacles({ obstacles, dynObstacles = [], worldSize }) {
    return (
        <group>
            {/* Static Obstacles */}
            {obstacles.map((obs, idx) => {
                const x = obs.x * worldSize
                const z = obs.y * worldSize
                const r = obs.r * worldSize

                return (
                    <group key={`static-${idx}`} position={[x, 0.5, z]}>
                        <mesh>
                            <cylinderGeometry args={[r, r, 1.0, 32]} />
                            <meshStandardMaterial color="#222" metalness={0.8} />
                        </mesh>
                        <mesh position={[0, 0.51, 0]}>
                            <cylinderGeometry args={[r * 0.9, r * 0.9, 0.1, 32]} />
                            <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={2} />
                        </mesh>
                        <pointLight distance={r * 5} intensity={1} color="#ff0055" />
                    </group>
                )
            })}

            {/* Dynamic Obstacles (Using Anime VFX Model) */}
            {dynObstacles.map((obs, idx) => {
                const x = obs.x * worldSize
                const z = obs.y * worldSize
                const r = obs.r * worldSize

                return (
                    <group key={`dyn-${idx}`} position={[x, 1.2, z]}>
                        <Suspense fallback={<mesh><sphereGeometry args={[r]} /><meshBasicMaterial wireframe /></mesh>}>
                            <group scale={r * 4} rotation={[0, Math.PI / 2, 0]}>
                                <AnimeVFXModel />
                            </group>
                        </Suspense>
                        <pointLight distance={r * 10} intensity={2} color="#00ffff" />
                        <pointLight position={[0, -1, 0]} distance={r * 5} intensity={1} color="#ff00ff" />
                    </group>
                )
            })}
        </group>
    )
}
