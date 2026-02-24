import time
import torch
import numpy as np
from robot_env import RobotEnv
from train_robot import Agent # Reuse the agent architecture

# --- CONFIG ---
LEVEL_TO_TEST = 3  # Level to load (0 to 3)
MODEL_PATH = f"models/automind_L{LEVEL_TO_TEST}.pth"
# MODEL_PATH = f"models/automind_best_L{LEVEL_TO_TEST}.pth" # Uncomment to use best checkpoint
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def main():
    print(f"Loading model: {MODEL_PATH}")
    
    # Init Env
    env = RobotEnv(render_mode="human")
    env.set_level(LEVEL_TO_TEST)
    
    # Init Agent
    agent = Agent(env.observation_space, env.action_space).to(DEVICE)
    try:
        agent.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Running with random weights...")

    agent.eval()

    obs, _ = env.reset()
    
    # LSTM states (batch=1)
    a_state = (torch.zeros(1, 1, 128).to(DEVICE), torch.zeros(1, 1, 128).to(DEVICE))
    c_state = (torch.zeros(1, 1, 128).to(DEVICE), torch.zeros(1, 1, 128).to(DEVICE))
    
    done = False
    step = 0
    total_reward = 0

    print("\nStarting evaluation episode...")
    while not done:
        # PPO Inference
        obs_tensor = torch.Tensor(obs).unsqueeze(0).to(DEVICE)
        done_tensor = torch.zeros(1).to(DEVICE) # Assuming episode not done during step
        
        with torch.no_grad():
            action, _, _, _, a_state, c_state = agent.get_action_and_value(
                obs_tensor, a_state, c_state, done_tensor
            )
            
        action_np = action.cpu().numpy().flatten()
        
        obs, reward, terminated, truncated, info = env.step(action_np)
        total_reward += reward
        step += 1
        
        done = terminated or truncated
        
        # Slow down for visualization
        time.sleep(0.03)

    print(f"Episode finished! Steps: {step}, Total Reward: {total_reward:.2f}")
    if info.get("is_success", False):
        print("RESULT: SUCCESS! Reached the target.")
    else:
        print("RESULT: FAILURE. Collided or timed out.")

    time.sleep(2)
    env.close()

if __name__ == "__main__":
    main()
