import { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import DroneModel from './DroneModel'

export default function Robot({ stateRef, worldSize }) {
    const robotRef = useRef()
    const heightRef = useRef(0.8)

    useFrame((state, delta) => {
        if (!robotRef.current || !stateRef.current) return

        const { x, y, angle } = stateRef.current.robot
        const picked = stateRef.current.tool?.picked

        const targetX = x * worldSize
        const targetZ = y * worldSize
        const targetA = -angle

        // Elevate significantly when picked, but DESCEND on success
        const gameState = stateRef.current.game_state
        let targetHeight = picked ? 3.5 : 1.2
        if (gameState === 'success') {
            targetHeight = -5.0 // Sink into the floor
        }

        heightRef.current = THREE.MathUtils.lerp(heightRef.current, targetHeight, delta * (gameState === 'success' ? 1 : 3))

        const targetPos = new THREE.Vector3(targetX, heightRef.current, targetZ)

        // Lerp position
        robotRef.current.position.lerp(targetPos, delta * 15)

        // Slerp rotation
        const targetRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetA)
        robotRef.current.quaternion.slerp(targetRotation, delta * 15)
    })

    const picked = stateRef.current?.tool?.picked

    return (
        <group ref={robotRef} position={[0, 0, 0]}>
            <Suspense fallback={null}>
                <group rotation={[0, Math.PI / 2, 0]} scale={0.1}>
                    <DroneModel />
                </group>
            </Suspense>

            {/* Carried Box (Only visible when picked) */}
            {picked && (
                <group position={[0, -1.8, 0]} scale={4.5}>
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

                    {/* Connectors to Drone */}
                    <mesh position={[0.1, 0.25, 0]} castShadow>
                        <boxGeometry args={[0.02, 0.2, 0.02]} />
                        <meshStandardMaterial color="#374151" />
                    </mesh>
                    <mesh position={[-0.1, 0.25, 0]} castShadow>
                        <boxGeometry args={[0.02, 0.2, 0.02]} />
                        <meshStandardMaterial color="#374151" />
                    </mesh>
                </group>
            )}

            {/* Light coming from Robot onto floor */}
            <spotLight
                position={[0, 1, 0]}
                angle={0.6}
                penumbra={0.5}
                intensity={3}
                castShadow
                color="#00ffff"
            />
            <pointLight position={[0, 0.5, 0]} distance={3} intensity={1} color="#00ffff" />
        </group>
    )
}
