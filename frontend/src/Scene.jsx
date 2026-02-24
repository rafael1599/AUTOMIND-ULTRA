import React from 'react'
import { Stars, ContactShadows, Environment } from '@react-three/drei'
import Robot from './Robot'
import Floor from './Floor'
import Obstacles from './Obstacles'
import Goal from './Goal'
import Toolbox from './Toolbox'

export default function Scene({ gameState, worldSize, onPlaceObstacle, showDroneFollow = false }) {
    return (
        <>
            <color attach="background" args={['#050811']} />

            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 20, 10]} intensity={1} color="#00ffff" />
            <directionalLight position={[-10, 10, -5]} intensity={0.5} color="#ff00ff" />
            <pointLight position={[0, 5, 0]} intensity={2} color="#00f3ff" distance={50} />

            <Stars radius={200} depth={50} count={10000} factor={4} saturation={1} fade speed={1} />

            <group position={[-worldSize / 2, 0, -worldSize / 2]}>
                <Floor size={worldSize} onPlaceObstacle={onPlaceObstacle} />

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

                <Obstacles
                    obstacles={gameState.current.obstacles}
                    dynObstacles={gameState.current.dyn_obstacles}
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
