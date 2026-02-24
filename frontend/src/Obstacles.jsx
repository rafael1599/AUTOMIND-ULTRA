import React, { Suspense } from 'react'
import AnimeVFXModel from './AnimeVFXModel'
import Hedgehog from './Hedgehog'

export default function Obstacles({ obstacles, dynObstacles = [], worldSize }) {
    return (
        <group>
            {/* Static Obstacles (Procedural Tank Barriers) */}
            {obstacles.map((obs, idx) => {
                const x = obs.x * worldSize
                const z = obs.y * worldSize
                const r = obs.r * worldSize

                return (
                    <group key={`static-${idx}`} position={[x, 0.5, z]}>
                        <Hedgehog radius={r} />
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
                            <group scale={r * 0.4} rotation={[0, Math.PI / 2, 0]}>
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
