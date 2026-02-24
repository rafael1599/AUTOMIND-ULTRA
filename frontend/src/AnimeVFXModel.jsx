import React from 'react'
import { useGLTF } from '@react-three/drei'

export default function AnimeVFXModel() {
    const { scene } = useGLTF('/anime_vfx.glb')
    return <primitive object={scene} />
}

useGLTF.preload('/anime_vfx.glb')
