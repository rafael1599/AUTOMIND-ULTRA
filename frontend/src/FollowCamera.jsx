import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function FollowCamera({ stateRef, worldSize }) {
    const lastTargetPos = useRef(null)
    const angleRef = useRef(0)

    useFrame((state, delta) => {
        if (!stateRef.current || !stateRef.current.robot) return

        const { x, y } = stateRef.current.robot
        const { tool, goal, game_state } = stateRef.current

        // Robot current 3D pos (Adjusted for the Scene's [-worldSize/2] offset)
        const rx = x * worldSize - worldSize / 2
        const rz = y * worldSize - worldSize / 2
        const currentRobotPos = new THREE.Vector3(rx, 1.5, rz)

        // Initialize target pos if first frame
        if (!lastTargetPos.current) {
            lastTargetPos.current = currentRobotPos.clone()
            state.camera.position.set(rx + 20, 25, rz + 20)
        }

        // Determine current objective pos (Adjusted for offset)
        const objX = (tool && !tool.picked) ? tool.x : goal.x
        const objY = (tool && !tool.picked) ? tool.y : goal.y
        const objectivePos = new THREE.Vector3(objX * worldSize - worldSize / 2, 0, objY * worldSize - worldSize / 2)

        // CAMERA POSITION: "Behind" the robot looking towards the objective
        // Direction from objective to robot
        const dirToBack = new THREE.Vector3().subVectors(currentRobotPos, objectivePos)
        dirToBack.y = 0 // Keep it on the horizontal plane
        dirToBack.normalize()

        // Camera distance and height
        const distance = 27
        const height = 25

        // Position: Robot + offset in direction opposite to objective
        const targetCamX = rx + dirToBack.x * distance
        const targetCamZ = rz + dirToBack.z * distance
        const targetCamPos = new THREE.Vector3(targetCamX, height, targetCamZ)

        // Smoothing position: Follow the "behind" point smoothly
        state.camera.position.lerp(targetCamPos, delta * 2)

        // FOCO: 80% Robot, 20% Objetivo, pero miramos más "arriba" (Sumamos offset en Y)
        const lookAtPoint = new THREE.Vector3().lerpVectors(currentRobotPos, objectivePos, 0.2)
        lookAtPoint.y += 5 // Offset para "mirar hacia arriba" y centrar el horizonte

        // Final look target (Smoothly following)
        if (!lastTargetPos.current) lastTargetPos.current = lookAtPoint.clone()
        lastTargetPos.current.lerp(lookAtPoint, delta * 4)
        state.camera.lookAt(lastTargetPos.current)
    })

    return null
}
