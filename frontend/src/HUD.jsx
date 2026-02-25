import React from 'react'

export default function HUD({ connected, state }) {
    const { sensors = [0, 0, 0, 0, 0, 0, 0, 0], robot, battery = 1.0, tool } = state

    const getDangerColor = (val) => {
        if (val > 0.8) return 'text-red-500'
        if (val > 0.4) return 'text-yellow-400'
        return 'text-cyan-400'
    }

    const batteryPercent = Math.max(0, battery * 100)
    let batteryColor = "bg-green-500"
    if (batteryPercent < 50) batteryColor = "bg-yellow-500"
    if (batteryPercent < 20) batteryColor = "bg-red-500 animate-pulse"

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between z-10">
            {/* Top Bar */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                        AUTO-TRAP v2.0
                    </h1>
                    <p className="text-xs text-cyan-200 tracking-widest uppercase mt-1 opacity-70">
                        Advanced Logistics & Pathfinding Routine
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-black/50 px-4 py-2 border border-cyan-900/50 rounded-lg backdrop-blur-md mb-2">
                        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`font-mono text-sm tracking-wider ${connected ? 'text-green-400' : 'text-red-400'}`}>
                            {connected ? 'LINK ESTABLISHED' : 'NO SIGNAL'}
                        </span>
                    </div>

                    {/* Mission Active Objective */}
                    <div className="flex flex-col items-end bg-black/60 px-4 py-2 border border-cyan-500/30 rounded backdrop-blur">
                        <span className="text-[10px] text-cyan-500 font-mono uppercase tracking-widest">Current Objective</span>
                        <span className={`text-sm font-bold tracking-widest uppercase ${tool?.picked ? 'text-green-400' : 'text-yellow-400'}`}>
                            {tool?.picked ? 'DELIVER TO GOAL' : 'RETRIEVE TOOLBOX'}
                        </span>
                    </div>

                    {/* Intervention Mode Switcher */}
                    <div className="mt-4 flex flex-col items-end pointer-events-auto">
                        <span className="text-[9px] text-cyan-500/50 font-mono uppercase tracking-[0.2em] mb-2">Intervention Mode</span>
                        <div className="flex gap-1 bg-black/80 p-1 rounded-lg border border-cyan-900/50 backdrop-blur">
                            <button
                                onClick={() => state.setMode?.('swarm')}
                                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${state.mode === 'swarm' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-cyan-500/40 hover:text-cyan-400'}`}
                            >
                                RANDOM SWARM
                            </button>
                            <button
                                onClick={() => state.setMode?.('god')}
                                className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${state.mode === 'god' ? 'bg-red-500 text-black shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-red-500/40 hover:text-red-400'}`}
                            >
                                GOD'S FINGER
                            </button>
                        </div>
                        {state.mode === 'god' && (
                            <button
                                onClick={() => state.clearMap?.()}
                                className="mt-2 px-4 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-500 text-[10px] font-black border border-red-500/50 rounded animate-pulse transition-all"
                            >
                                ⚡ PURGE ALL ENTITIES
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Warning Overlay */}
            {state.warning && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-red-600/90 text-white font-black tracking-widest text-xl px-8 py-4 rounded border-2 border-red-400 shadow-[0_0_30px_rgba(255,0,0,0.8)] animate-ping z-50">
                    ⚠️ {state.warning}
                </div>
            )}

            {/* Game State Overlays */}
            {state.game_state === 'game_over' && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 font-black tracking-[0.5em] text-4xl px-12 py-6 rounded border-4 border-red-500 shadow-[0_0_50px_rgba(255,0,0,0.8)] z-50 flex flex-col items-center">
                    <span>GAME OVER</span>
                    <span className="text-sm tracking-widest mt-2 font-mono text-red-300">BATTERY DEPLETED / FATAL COLLISION</span>
                </div>
            )}

            {state.game_state === 'success' && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-green-900/90 text-green-100 font-black tracking-[0.5em] text-4xl px-12 py-6 rounded border-4 border-green-500 shadow-[0_0_50px_rgba(0,255,0,0.8)] z-50 flex flex-col items-center">
                    <span>MISSION SUCCESS</span>
                    <span className="text-sm tracking-widest mt-2 font-mono text-green-300">PREPARING NEXT EPISODE...</span>
                </div>
            )}

            {/* Bottom Bar: Telemetry & Radar */}
            <div className="flex justify-between items-end w-full">
                {/* Left Side: Battery & Coordinates */}
                <div className="flex gap-6 items-end">
                    {/* Battery Bar */}
                    <div className="bg-black/80 border border-cyan-900/40 p-4 rounded-xl backdrop-blur-md w-64">
                        <div className="flex justify-between items-end mb-2 border-b border-cyan-900/30 pb-2">
                            <h2 className="text-cyan-500/50 text-xs font-bold tracking-widest uppercase">Power Core</h2>
                            <span className="font-mono text-xs text-cyan-100">{batteryPercent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded h-4 overflow-hidden shadow-inner border border-gray-700/50">
                            <div
                                className={`h-full ${batteryColor} transition-all duration-300`}
                                style={{ width: `${batteryPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Global Position */}
                    <div className="bg-black/60 border border-cyan-900/40 p-4 rounded-xl backdrop-blur-md">
                        <h2 className="text-cyan-500/50 text-xs font-bold tracking-widest uppercase mb-3 border-b border-cyan-900/30 pb-2">
                            Local Coordinates
                        </h2>
                        <div className="font-mono text-cyan-100 flex gap-4 text-xs">
                            <div className="bg-cyan-900/20 p-2 rounded">
                                <span className="text-gray-500 text-[9px] block mb-1">X_POS</span>
                                {robot ? robot.x.toFixed(3) : '0.000'}
                            </div>
                            <div className="bg-cyan-900/20 p-2 rounded">
                                <span className="text-gray-500 text-[9px] block mb-1">Y_POS</span>
                                {robot ? robot.y.toFixed(3) : '0.000'}
                            </div>
                            <div className="bg-cyan-900/20 p-2 rounded">
                                <span className="text-gray-500 text-[9px] block mb-1">HEADING</span>
                                {robot ? (robot.angle * (180 / Math.PI)).toFixed(1) : '0.0'}°
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Radar Array */}
                <div className="bg-black/40 border border-white/5 p-6 rounded-full backdrop-blur-xl flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.4)]">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                        {/* Scanning Sweep Effect */}
                        <div className="absolute w-full h-full border border-cyan-500/10 rounded-full" />
                        <div className="absolute w-2/3 h-2/3 border border-cyan-500/10 rounded-full opacity-60" />
                        <div className="absolute w-1/3 h-1/3 border border-cyan-500/10 rounded-full opacity-30" />

                        {/* Scanning Beam */}
                        <div className="absolute w-1/2 h-1/2 origin-bottom-right top-0 left-0 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-tl-full animate-[spin_4s_linear_infinite] pointer-events-none" />

                        {/* High-Fidelity Sensor Blips */}
                        {sensors.map((s, i) => {
                            const angleDeg = i * 45 - 90;
                            const angleRad = (angleDeg * Math.PI) / 180;

                            const radius = 72;
                            const distanceFactor = Math.max(0.1, 1.0 - s);
                            const x = Math.cos(angleRad) * (radius * distanceFactor);
                            const y = Math.sin(angleRad) * (radius * distanceFactor);

                            let color = "rgba(6, 182, 212, 0.6)";
                            let shadow = "0 0 8px rgba(6, 182, 212, 0.4)";
                            if (s > 0.4) {
                                color = "rgba(250, 204, 21, 0.8)";
                                shadow = "0 0 12px rgba(250, 204, 21, 0.6)";
                            }
                            if (s > 0.8) {
                                color = "rgba(239, 68, 68, 1)";
                                shadow = "0 0 20px rgba(239, 68, 68, 0.8)";
                            }

                            return (
                                <div
                                    key={i}
                                    className="absolute transition-all duration-300 ease-out"
                                    style={{
                                        transform: `translate(${x}px, ${y}px)`,
                                        width: s > 0.8 ? '8px' : '6px',
                                        height: s > 0.8 ? '8px' : '6px',
                                        backgroundColor: color,
                                        boxShadow: shadow,
                                        borderRadius: '1px',
                                        opacity: s > 0.05 ? 1 : 0.1
                                    }}
                                />
                            );
                        })}

                        {/* Robot Center Point */}
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10" />
                    </div>
                </div>
            </div>
        </div>
    )
}
