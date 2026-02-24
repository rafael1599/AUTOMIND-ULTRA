import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function MapCamera({ stateRef, worldSize }) {
    const lastTargetPos = useRef(new THREE.Vector3(0, 0, 0))

    useFrame((state, delta) => {
        if (!stateRef.current || !stateRef.current.robot) return

        const { x, y } = stateRef.current.robot

        // Robot current 3D pos (Adjusted for the Scene's [-worldSize/2] offset)
        const rx = x * worldSize - worldSize / 2
        const rz = y * worldSize - worldSize / 2
        const currentRobotPos = new THREE.Vector3(rx, 0, rz)

        // Smoothing position
        lastTargetPos.current.lerp(currentRobotPos, delta * 5)

        // Move camera to follow robot on X and Z
        state.camera.position.x = lastTargetPos.current.x
        state.camera.position.z = lastTargetPos.current.z

        // Ensure it is looking straight down at the robot
        state.camera.lookAt(lastTargetPos.current)
    })

    return null
}
