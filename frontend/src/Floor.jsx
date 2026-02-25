import React from 'react'

export default function Floor({ size, onPlaceObstacle, onUserIntervention }) {
    const getCoords = (e) => {
        const localX = e.point.x + (size / 2)
        const localZ = e.point.z + (size / 2)
        return { x: localX / size, y: localZ / size }
    }

    const handleClick = (e) => {
        if (!onPlaceObstacle) return
        e.stopPropagation()
        const coords = getCoords(e)
        onPlaceObstacle(coords.x, coords.y)
    }

    const handlePointerDown = (e) => {
        if (!onUserIntervention) return
        e.stopPropagation()
        e.target.setPointerCapture(e.pointerId)
        const coords = getCoords(e)
        onUserIntervention(coords.x, coords.y)
    }

    const handlePointerMove = (e) => {
        if (!onUserIntervention) return
        // We only send updates if the pointer is down (captured)
        if (e.buttons > 0) {
            const coords = getCoords(e)
            onUserIntervention(coords.x, coords.y)
        }
    }

    const handlePointerUp = (e) => {
        if (!onUserIntervention) return
        onUserIntervention(null, null)
    }

    return (
        <group position={[size / 2, 0, size / 2]}>
            {/* The 3D Slab (Floor with 3x thickness) */}
            <mesh
                position={[0, -1.5, 0]}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                receiveShadow
            >
                <boxGeometry args={[size, 3, size]} />
                <meshStandardMaterial color="#0a0f18" metalness={0.9} roughness={0.1} />
            </mesh>

            {/* Edge detail to make it look like a floating platform */}
            <mesh position={[0, -1.5, 0]}>
                <boxGeometry args={[size + 0.1, 2.98, size + 0.1]} />
                <meshStandardMaterial color="#1f2937" wireframe />
            </mesh>

            {/* Grid Overlay for Cyberpunk feel */}
            <gridHelper args={[size, 20, '#0f2040', '#0a1020']} position={[0, 0.01, 0]} />
            <gridHelper args={[size, 5, '#00ffff', '#0f2040']} position={[0, 0.02, 0]} />
        </group>
    )
}
