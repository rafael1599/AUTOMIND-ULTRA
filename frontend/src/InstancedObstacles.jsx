import React from 'react'
import { useGLTF, Clone } from '@react-three/drei'

export default function InstancedObstacles({ obstacles, worldSize }) {
    const { scene } = useGLTF('/xen_hedgehog_blue.glb')

    if (!obstacles || obstacles.length === 0) return null

    return (
        <group>
            {obstacles.map((obs, i) => {
                const x = obs.x * worldSize
                const z = obs.y * worldSize
                const s = obs.r * worldSize * 2.5 // Increased scale for better visibility

                return (
                    <Clone
                        key={`hedgehog-${i}-${obstacles.length}`}
                        object={scene}
                        position={[x, 0, z]}
                        scale={[s, s, s]}
                        rotation={[0, i * 0.7, 0]}
                        castShadow
                        receiveShadow
                    />
                )
            })}
        </group>
    )
}

useGLTF.preload('/xen_hedgehog_blue.glb')
