import asyncio
import json
import torch
import math
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from robot_env import RobotEnv
from train_robot import Agent

# --- CONFIGURACIÓN ---
FPS = 20
TICK_RATE = 1.0 / FPS
LEVEL_TO_LOAD = 6
MODEL_PATH = "models/automind_final.pth"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- ESTADO GLOBAL ---
# Necesitamos mantener el entorno y el agente en el scope global o en una clase gestora
env = RobotEnv(render_mode=None) # Sin Pygame en el servidor
env.set_level(LEVEL_TO_LOAD)
obs, _ = env.reset()

agent = Agent(env.observation_space, env.action_space).to(DEVICE)
try:
    agent.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    print(f"Modelo {MODEL_PATH} cargado correctamente.")
except Exception as e:
    print(f"Error cargando modelo: {e}.")
    if "size mismatch" in str(e):
        print("--- Detectada arquitectura antigua. Reintentando con 128 units... ---")
        agent = Agent(env.observation_space, env.action_space, hidden_dim=128, feature_dim=256).to(DEVICE)
        try:
            agent.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
            print(f"Modelo antiguo {MODEL_PATH} cargado correctamente.")
        except Exception as e2:
            print(f"Error fatal cargando modelo: {e2}. Se usarán pesos aleatorios.")
    else:
        print("Se usarán pesos aleatorios.")

agent.eval()

# Estados LSTM (Memoria a Corto Plazo) - Dinámicos según el agente
a_state = (torch.zeros(1, 1, agent.hidden_dim).to(DEVICE), torch.zeros(1, 1, agent.hidden_dim).to(DEVICE))
c_state = (torch.zeros(1, 1, agent.hidden_dim).to(DEVICE), torch.zeros(1, 1, agent.hidden_dim).to(DEVICE))


# --- FASTAPI APP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir frontend desde cualquier puerto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Cliente conectado. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Cliente desconectado. Total: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error enviando mensaje a cliente: {e}")

manager = ConnectionManager()


# --- TAREA ASÍNCRONA DE SIMULACIÓN ---
async def simulation_loop():
    global obs, a_state, c_state # Acceder y modificar estado global
    
    print("Iniciando bucle de simulación a", FPS, "FPS...")
    while True:
        # 1. Inferencia del modelo
        obs_tensor = torch.Tensor(obs).unsqueeze(0).to(DEVICE)
        done_tensor = torch.zeros(1).to(DEVICE)
        
        with torch.no_grad():
            action, _, _, _, a_state, c_state = agent.get_action_and_value(
                obs_tensor, a_state, c_state, done_tensor
            )
            
        action_np = action.cpu().numpy().flatten()
        
        # 2. Actualizar el entorno
        obs, reward, terminated, truncated, info = env.step(action_np)
        
        # Determinar estado del juego para el frontend (Feedback visual)
        game_state_msg = "playing"
        if terminated or truncated:
            if info.get("is_success", False):
                game_state_msg = "success"
            elif env.battery_level <= 0.0:
                game_state_msg = "game_over"
            else:
                game_state_msg = "game_over" # Choques repetidos mortales

        # 3. Empaquetar estado para el Frontend
        sensors = env._get_raycasts() # Array de 8 sensores
        
        state_data = {
            "type": "state_update",
            "game_state": game_state_msg,
            "robot": {
                "x": float(env.robot_pos[0]),
                "y": float(env.robot_pos[1]),
                "angle": float(env.robot_angle)
            },
            "goal": {
                "x": float(env.goal_pos[0]),
                "y": float(env.goal_pos[1])
            },
            "tool": {
                "x": float(env.tool_pos[0]),
                "y": float(env.tool_pos[1]),
                "picked": float(env.has_tool) > 0.5
            },
            "battery": float(env.battery_level),
            "sensors": [float(s) for s in sensors],
            "obstacles": [{"x": float(o[0]), "y": float(o[1]), "r": float(o[2])} for o in env.obstacles],
            "dyn_obstacles": [{"x": float(d["pos"][0]), "y": float(d["pos"][1]), "r": float(d["r"])} for d in env.dyn_obstacles]
        }
        
        # 4. Enviar (Broadcast) si hay clientes
        if manager.active_connections:
            await manager.broadcast(json.dumps(state_data))
            
        # Si el juego terminó, hacemos una pausa para que el usuario vea el cartel
        if terminated or truncated:
            await asyncio.sleep(2.0)
            obs, _ = env.reset()
            
        # 5. Dormir para mantener los FPS
        await asyncio.sleep(TICK_RATE)

@app.on_event("startup")
async def startup_event():
    # Lanzar la simulación en segundo plano
    asyncio.create_task(simulation_loop())

# --- ENDPOINT WEBSOCKET ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # --- INTERACTIVIDAD: RECIBIR DATOS DEL FRONTEND ---
                if message.get("type") == "place_obstacle":
                    x = float(message.get("x", 0.5))
                    y = float(message.get("y", 0.5))
                    # Limitar coordenadas al tamaño del entorno (0 a 1)
                    x = max(0.01, min(0.99, x))
                    y = max(0.01, min(0.99, y))
                    
                    # Añadir radio estándar y meter en el array del backend
                    nuevo_obstaculo = (x, y, 0.05) 
                    
                    # Añadir al final o limitar la cantidad de obstáculos para no saturar
                    if len(env.obstacles) > 20: 
                        env.obstacles.pop(0) # Quitar el más viejo
                    env.obstacles.append(nuevo_obstaculo)
                    print(f"Obstáculo colocado dinámicamente en: ({x:.2f}, {y:.2f})")
                    
                # Ejemplo para reiniciar el entorno desde la UI
                elif message.get("type") == "reset":
                    global obs
                    obs, _ = env.reset()
                    print("Entorno reiniciado por comando frontend.")
                    
            except json.JSONDecodeError:
                print("Error decodificando el mensaje WebSocket")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("\n--- INICIANDO SERVIDOR ROBÓTICO (Puerto 8000) ---")
    uvicorn.run(app, host="0.0.0.0", port=8000)
