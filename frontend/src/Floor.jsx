import React from 'react'

export default function Floor({ size, onPlaceObstacle }) {
    const handleClick = (e) => {
        e.stopPropagation()
        // e.point is the 3D intersect coordinate
        // The group holding the world is shifted to zero at bottom-left for easier [0,size] mapping.
        // e.point is global, but event local point is available too if we use local coords.
        // However, onClick gives us `e.intersections[0].point`.

        // Instead of doing complex math, we use point relative to the plane group which is placed at [-size/2, 0, -size/2]
        // React Three Fiber event `.point` gives world coordinates. 
        // Wait, since we wrapped Floor in a `<group position={[-size/2, 0, -size/2]}>`, 
        // the floor itself should probably be at `[size/2, 0, size/2]` internally so its center aligns.

        const localX = e.point.x + (size / 2)
        const localZ = e.point.z + (size / 2)

        // Normalize back to 0-1
        const normX = localX / size
        const normY = localZ / size

        onPlaceObstacle(normX, normY)
    }

    return (
        <group position={[size / 2, 0, size / 2]}>
            {/* The 3D Slab (Floor with 3x thickness) */}
            <mesh position={[0, -1.5, 0]} onClick={handleClick} receiveShadow>
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
