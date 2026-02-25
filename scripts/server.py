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
env = RobotEnv(render_mode=None) 
env.set_level(LEVEL_TO_LOAD)
obs, _ = env.reset()

agent = Agent(env.observation_space, env.action_space).to(DEVICE)
try:
    agent.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    print(f"Modelo {MODEL_PATH} cargado correctamente.")
except Exception as e:
    print(f"Error cargando modelo: {e}.")
    agent = Agent(env.observation_space, env.action_space, hidden_dim=128, feature_dim=256).to(DEVICE)
    try:
        agent.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        print(f"Modelo antiguo {MODEL_PATH} cargado correctamente.")
    except:
        print("Se usarán pesos aleatorios.")

agent.eval()
a_state = (torch.zeros(1, 1, agent.hidden_dim).to(DEVICE), torch.zeros(1, 1, agent.hidden_dim).to(DEVICE))
c_state = (torch.zeros(1, 1, agent.hidden_dim).to(DEVICE), torch.zeros(1, 1, agent.hidden_dim).to(DEVICE))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try: await connection.send_text(message)
            except: pass

manager = ConnectionManager()

async def simulation_loop():
    global obs, a_state, c_state
    while True:
        obs_tensor = torch.Tensor(obs).unsqueeze(0).to(DEVICE)
        done_tensor = torch.zeros(1).to(DEVICE)
        with torch.no_grad():
            action, _, _, _, a_state, c_state = agent.get_action_and_value(obs_tensor, a_state, c_state, done_tensor)
        action_np = action.cpu().numpy().flatten()
        obs, reward, terminated, truncated, info = env.step(action_np)
        
        game_state_msg = "playing"
        if terminated or truncated:
            game_state_msg = "success" if info.get("is_success", False) else "game_over"

        sensors = env._get_raycasts()
        state_data = {
            "type": "state_update",
            "game_state": game_state_msg,
            "robot": {"x": float(env.robot_pos[0]), "y": float(env.robot_pos[1]), "angle": float(env.robot_angle)},
            "goal": {"x": float(env.goal_pos[0]), "y": float(env.goal_pos[1])},
            "tool": {"x": float(env.tool_pos[0]), "y": float(env.tool_pos[1]), "picked": float(env.has_tool) > 0.5},
            "battery": float(env.battery_level),
            "sensors": [float(s) for s in sensors],
            "obstacles": [{"x": float(o[0]), "y": float(o[1]), "r": float(o[2])} for o in env.obstacles],
            "dyn_obstacles": [{"x": float(d["pos"][0]), "y": float(d["pos"][1]), "r": float(d["r"])} for d in env.dyn_obstacles],
            "userIntervention": {"x": env.user_intervention[0], "y": env.user_intervention[1]} if env.user_intervention else None
        }
        
        if manager.active_connections:
            await manager.broadcast(json.dumps(state_data))
            
        if terminated or truncated:
            await asyncio.sleep(2.0)
            obs, _ = env.reset()
            
        await asyncio.sleep(TICK_RATE)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_loop())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                m_type = message.get("type")
                
                if m_type == "set_mode":
                    mode = message.get("mode")
                    if mode == "swarm":
                        env.god_mode = False
                        env.set_level(6)
                        obs, _ = env.reset()
                        print("MODE: RANDOM SWARM")
                    elif mode == "god":
                        env.god_mode = True
                        env.obstacles = []
                        env.dyn_obstacles = []
                        print("MODE: GOD'S FINGER")

                elif m_type == "place_obstacle":
                    x, y = float(message.get("x", 0.5)), float(message.get("y", 0.5))
                    env.obstacles.append((max(0, min(1, x)), max(0, min(1, y)), 0.05))
                    env.god_mode = False

                elif m_type == "user_intervention":
                    x, y = message.get("x"), message.get("y")
                    env.user_intervention = [float(x), float(y)] if x is not None else None

                elif m_type == "clear_map":
                    env.god_mode = True
                    env.obstacles, env.dyn_obstacles = [], []
                    
                elif m_type == "reset":
                    obs, _ = env.reset()
            except: pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    import os
    script_name = os.path.basename(__file__).replace(".py", "")
    uvicorn.run(f"{script_name}:app", host="0.0.0.0", port=8000, reload=True)
