import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import HUD from './HUD'
import Scene from './Scene'
import FollowCamera from './FollowCamera'
import MapCamera from './MapCamera'

const WS_URL = "ws://localhost:8000/ws"
const ENV_SIZE = 120 // Even bigger scale

export default function App() {
  const [connected, setConnected] = useState(false)

  const gameState = useRef({
    robot: { x: 0.5, y: 0.5, angle: 0 },
    goal: { x: 0.8, y: 0.8 },
    tool: { x: 0.2, y: 0.2, picked: false },
    battery: 1.0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0],
    obstacles: [],
    dyn_obstacles: [],
    game_state: 'playing'
  })

  const [uiState, setUiState] = useState({
    battery: 1.0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0],
    game_state: 'playing',
    mode: 'swarm',
    setMode: (m) => {
      setUiState(prev => ({ ...prev, mode: m }))
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "set_mode", mode: m }))
        if (m === 'god') {
          wsRef.current.send(JSON.stringify({ type: "clear_map" }))
        }
      }
    },
    clearMap: () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "clear_map" }))
      }
    }
  })
  const wsRef = useRef(null)

  useEffect(() => {
    let ws = new WebSocket(WS_URL)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "state_update") {
          gameState.current = data
          setUiState(prev => ({ ...prev, ...data }))
        }
      } catch (err) { console.error("Parse error", err) }
    }
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close() }
  }, [])

  const handlePlaceObstacle = (x, y) => {
    if (uiState.mode !== 'static') return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: "place_obstacle", x, y }))
  }

  const handleUserIntervention = (x, y) => {
    if (uiState.mode !== 'god') return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: "user_intervention", x, y }))
  }

  return (
    <div
      className="w-screen h-screen flex flex-row overflow-hidden bg-black font-sans text-white select-none"
    >

      {/* 2D MAP VIEW (Left) */}
      <div className="w-1/3 h-full border-r border-cyan-900/50 relative">
        <div className="absolute top-4 left-4 z-20 bg-black/60 px-3 py-1 rounded text-[10px] font-mono border border-cyan-500/30">
          STRATEGIC MAP (TOP-DOWN)
        </div>
        <Canvas camera={{ position: [0, 200, 0], fov: 40 }}>
          <Scene
            gameState={gameState}
            worldSize={ENV_SIZE}
            obstacles={uiState.obstacles}
            dynObstacles={uiState.dyn_obstacles}
            userIntervention={uiState.userIntervention}
            onPlaceObstacle={handlePlaceObstacle}
            onUserIntervention={handleUserIntervention}
            hideStars={true}
          />
        </Canvas>
      </div>

      {/* 3D ACTION VIEW (Right) */}
      <div className="w-2/3 h-full relative">
        <div className="absolute top-4 right-4 z-20 bg-black/60 px-3 py-1 rounded text-[10px] font-mono border border-blue-500/30 text-blue-400">
          DIRECTOR VIEW (CINEMATIC)
        </div>
        <Canvas
          shadows
          camera={{ position: [20, 30, 20], fov: 45 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <Scene
            gameState={gameState}
            worldSize={ENV_SIZE}
            obstacles={uiState.obstacles}
            dynObstacles={uiState.dyn_obstacles}
            userIntervention={uiState.userIntervention}
            onPlaceObstacle={handlePlaceObstacle}
            onUserIntervention={handleUserIntervention}
          />
          <FollowCamera stateRef={gameState} worldSize={ENV_SIZE} />
        </Canvas>
      </div>

      <HUD connected={connected} state={uiState} />
    </div>
  )
}
