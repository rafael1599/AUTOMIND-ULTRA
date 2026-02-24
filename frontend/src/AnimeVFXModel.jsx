import React from 'react'
import { useGLTF } from '@react-three/drei'

export default function AnimeVFXModel() {
    const { scene } = useGLTF('/anime_vfx.glb')
    const clonedScene = React.useMemo(() => scene.clone(), [scene])
    return <primitive object={clonedScene} />
}

useGLTF.preload('/anime_vfx.glb')
