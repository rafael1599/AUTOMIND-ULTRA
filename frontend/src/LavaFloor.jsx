import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function LavaFloor({ size, userIntervention }) {
    const meshRef = useRef()

    // Shader que crea un círculo de lava localizado
    const lavaShader = useMemo(() => ({
        uniforms: {
            uTime: { value: 0 },
            uCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uActive: { value: 0.0 }, // 1.0 si hay intervención, 0.0 si no
            uColorLava: { value: new THREE.Color('#ff2200') },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uCenter;
            uniform float uActive;
            uniform vec3 uColorLava;
            varying vec2 vUv;

            void main() {
                // Distancia desde el centro de la intervención
                float dist = distance(vUv, uCenter);
                
                // Círculo de lava (radio aproximado de 5-10% del mapa)
                float radius = 0.08 + sin(uTime * 3.0) * 0.01;
                float mask = smoothstep(radius, radius - 0.05, dist);
                
                // Efecto de bordes quemados/irregulares
                mask *= 1.0 - (sin(vUv.x * 50.0 + uTime) * cos(vUv.y * 50.0) * 0.1);

                vec3 color = uColorLava;
                float alpha = mask * uActive * 0.8;

                // Añadir un pulso central más brillante
                float core = smoothstep(0.02, 0.0, dist);
                color += vec3(1.0, 0.5, 0.0) * core;

                gl_FragColor = vec4(color, alpha);
            }
        `
    }), [])

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime
            if (userIntervention) {
                // Invertimos Y porque las UVs del plano en Three.js suelen estar invertidas respecto al eje Z del mundo
                meshRef.current.material.uniforms.uCenter.value.set(
                    userIntervention.x,
                    1.0 - userIntervention.y
                )
                meshRef.current.material.uniforms.uActive.value = 1.0
            } else {
                meshRef.current.material.uniforms.uActive.value = 0.0
            }
        }
    })

    return (
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[size / 2, 0.04, size / 2]}
        >
            <planeGeometry args={[size, size]} />
            <shaderMaterial
                args={[lavaShader]}
                transparent={true}
                depthWrite={false}
            />
        </mesh>
    )
}
