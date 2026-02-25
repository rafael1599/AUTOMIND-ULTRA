import React from 'react'
import { Stars, ContactShadows, Environment } from '@react-three/drei'
import Robot from './Robot'
import Floor from './Floor'
import Obstacles from './Obstacles'
import Goal from './Goal'
import Toolbox from './Toolbox'
import InstancedObstacles from './InstancedObstacles'
import LavaFloor from './LavaFloor'

export default function Scene({
    gameState,
    worldSize,
    obstacles = [],
    dynObstacles = [],
    userIntervention = null,
    onPlaceObstacle,
    onUserIntervention,
    showDroneFollow = false,
    hideStars = false
}) {
    return (
        <>
            <color attach="background" args={['#03050a']} />

            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1.5}
                color="#00ffff"
                castShadow
                shadow-mapSize={[1024, 1024]}
            />

            {!hideStars && <Stars radius={200} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />}

            <group position={[-worldSize / 2, 0, -worldSize / 2]}>
                <Floor
                    size={worldSize}
                    onPlaceObstacle={onPlaceObstacle}
                    onUserIntervention={onUserIntervention}
                />

                {/* God's Finger / Heatmap Glow */}
                {userIntervention && (
                    <group position={[
                        userIntervention.x * worldSize,
                        0,
                        userIntervention.y * worldSize
                    ]}>
                        <pointLight
                            position={[0, 5, 0]}
                            intensity={20}
                            distance={30}
                            color="#ff3300"
                        />
                        <mesh position={[0, 2, 0]}>
                            <sphereGeometry args={[4, 32, 32]} />
                            <meshStandardMaterial
                                color="#ff0000"
                                emissive="#ff0000"
                                emissiveIntensity={15}
                                transparent
                                opacity={0.4}
                            />
                        </mesh>
                    </group>
                )}

                {userIntervention && <LavaFloor size={worldSize} userIntervention={userIntervention} />}

                <Goal
                    position={[gameState.current.goal.x * worldSize, 0, gameState.current.goal.y * worldSize]}
                    isActive={gameState.current.tool ? gameState.current.tool.picked : false}
                />

                <Toolbox
                    position={[
                        gameState.current.tool ? gameState.current.tool.x * worldSize : 0,
                        0,
                        gameState.current.tool ? gameState.current.tool.y * worldSize : 0
                    ]}
                    visible={gameState.current.tool ? !gameState.current.tool.picked : true}
                />

                <InstancedObstacles
                    obstacles={obstacles}
                    worldSize={worldSize}
                />

                <Obstacles
                    obstacles={[]} // Handled by instancing
                    dynObstacles={dynObstacles}
                    worldSize={worldSize}
                />

                <Robot
                    stateRef={gameState}
                    worldSize={worldSize}
                />
            </group>

            <ContactShadows position={[0, -0.01, 0]} opacity={0.8} scale={30} blur={2} far={10} />
            <Environment preset="city" />
        </>
    )
}
