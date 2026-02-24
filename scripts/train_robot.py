# AutoMind-Ultra: COGNITIVE ARCHITECTURE (Phase 6 - Hardware & Failure Drive)
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions.normal import Normal
from stable_baselines3.common.vec_env import SubprocVecEnv, VecNormalize
import os
import json
from tqdm import tqdm
from collections import deque
import random

# --- DIRECTORIOS ---
os.makedirs("models", exist_ok=True)
os.makedirs("data/logs", exist_ok=True)

# --- CONFIGURACION HARDWARE (Optimized for user feedback) ---
SEED = 42
NUM_ENVS = 24       # More parallelization to exploit hardware
NUM_STEPS = 1024     # Longer memory windows for LSTM
NUM_EPOCHS = 5      # More learning per rollout
MB_SIZE_ENVS = 6     # 4 batches per epoch
LEARNING_RATE = 3e-4
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --- CONFIGURACION COGNITIVA ---
TARGET_TAU = 0.01      
CURIOSITY_WEIGHT = 0.08 # Increased exploration reward
HIDDEN_DIM = 256        # Larger brain capacity

# Meta-Parámetros
SUCCESS_GOAL = 0.92
EVAL_WINDOW = 100
MAX_STEPS_ALLOWED = 1000 

class Agent(nn.Module):
    def __init__(self, observation_space, action_space, hidden_dim=HIDDEN_DIM, feature_dim=512):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.feature_dim = feature_dim
        
        obs_dim = np.array(observation_space.shape).prod()
        act_dim = np.array(action_space.shape).prod()
        
        # ACTOR
        self.actor_features = nn.Sequential(
            nn.Linear(obs_dim, feature_dim), nn.ReLU(),
            nn.Linear(feature_dim, hidden_dim), nn.LayerNorm(hidden_dim), nn.ReLU()
        )
        self.actor_lstm = nn.LSTM(hidden_dim, hidden_dim)
        self.actor_ln = nn.LayerNorm(hidden_dim)
        self.actor_mean = nn.Linear(hidden_dim, act_dim)
        self.actor_logstd = nn.Parameter(torch.zeros(1, act_dim)) 
        
        # CRITIC
        self.critic_features = nn.Sequential(
            nn.Linear(obs_dim, feature_dim), nn.ReLU(),
            nn.Linear(feature_dim, hidden_dim), nn.LayerNorm(hidden_dim), nn.ReLU()
        )
        self.critic_lstm = nn.LSTM(hidden_dim, hidden_dim)
        self.critic_ln = nn.LayerNorm(hidden_dim)
        self.critic_head = nn.Linear(hidden_dim, 1)

        # TARGET CRITIC (Long Term Memory)
        self.target_critic_features = nn.Sequential(
            nn.Linear(obs_dim, feature_dim), nn.ReLU(),
            nn.Linear(feature_dim, hidden_dim), nn.LayerNorm(hidden_dim), nn.ReLU()
        )
        self.target_critic_lstm = nn.LSTM(hidden_dim, hidden_dim)
        self.target_critic_ln = nn.LayerNorm(hidden_dim)
        self.target_critic_head = nn.Linear(hidden_dim, 1)
        
        self.target_critic_features.load_state_dict(self.critic_features.state_dict())
        self.target_critic_lstm.load_state_dict(self.critic_lstm.state_dict())
        self.target_critic_ln.load_state_dict(self.critic_ln.state_dict())
        self.target_critic_head.load_state_dict(self.critic_head.state_dict())
        
        for param in self.target_parameters():
            param.requires_grad = False

    def target_parameters(self):
        return (list(self.target_critic_features.parameters()) + 
                list(self.target_critic_lstm.parameters()) + 
                list(self.target_critic_ln.parameters()) + 
                list(self.target_critic_head.parameters()))

    def update_target_network(self, tau):
        for target_param, param in zip(self.target_parameters(), (list(self.critic_features.parameters()) + list(self.critic_lstm.parameters()) + list(self.critic_ln.parameters()) + list(self.critic_head.parameters()))):
            target_param.data.copy_(target_param.data * (1.0 - tau) + param.data * tau)

    def get_action_and_value(self, x, actor_state, critic_state, done, action=None):
        a_hidden = self.actor_features(x)
        batch_size = actor_state[0].shape[1]
        a_hidden = a_hidden.reshape((-1, batch_size, self.hidden_dim))
        done_reshaped = done.reshape((-1, batch_size))
        
        new_a_hidden = []
        for h, d in zip(a_hidden, done_reshaped):
            d_f = d.view(1, -1, 1).float()
            actor_state = ((1.0-d_f)*actor_state[0], (1.0-d_f)*actor_state[1])
            h, actor_state = self.actor_lstm(h.unsqueeze(0), actor_state)
            new_a_hidden += [h]
        new_a_hidden = torch.flatten(torch.cat(new_a_hidden), 0, 1)
        new_a_hidden = self.actor_ln(new_a_hidden)
        
        action_mean = self.actor_mean(new_a_hidden)
        action_logstd = self.actor_logstd.expand_as(action_mean)
        action_std = torch.exp(action_logstd)
        probs = Normal(action_mean, action_std)
        
        c_hidden = self.critic_features(x).reshape((-1, batch_size, self.hidden_dim))
        new_c_hidden = []
        for h, d in zip(c_hidden, done_reshaped):
            d_f = d.view(1, -1, 1).float()
            critic_state = ((1.0-d_f)*critic_state[0], (1.0-d_f)*critic_state[1])
            h, critic_state = self.critic_lstm(h.unsqueeze(0), critic_state)
            new_c_hidden += [h]
        new_c_hidden = torch.flatten(torch.cat(new_c_hidden), 0, 1)
        new_c_hidden = self.critic_ln(new_c_hidden)
        value = self.critic_head(new_c_hidden)
        
        if action is None: action = probs.sample()
        return action, probs.log_prob(action).sum(1), probs.entropy().sum(1), value, actor_state, critic_state

    def get_target_value(self, x, target_state, done):
        batch_size = target_state[0].shape[1]
        c_hidden = self.target_critic_features(x).reshape((-1, batch_size, self.hidden_dim))
        done_reshaped = done.reshape((-1, batch_size))
        new_c_hidden = []
        for h, d in zip(c_hidden, done_reshaped):
            d_f = d.view(1, -1, 1).float()
            target_state = ((1.0-d_f)*target_state[0], (1.0-d_f)*target_state[1])
            h, target_state = self.target_critic_lstm(h.unsqueeze(0), target_state)
            new_c_hidden += [h]
        new_c_hidden = torch.flatten(torch.cat(new_c_hidden), 0, 1)
        new_c_hidden = self.target_critic_ln(new_c_hidden)
        return self.target_critic_head(new_c_hidden), target_state

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

class HardScenarioBuffer:
    def __init__(self, filename="data/logs/hard_scenarios.json"):
        self.filename = filename
        self.scenarios = []
        if os.path.exists(filename):
            try:
                with open(filename, 'r') as f: self.scenarios = json.load(f)
            except: self.scenarios = []

    def add(self, scenario):
        # Keep unique-ish scenarios (simple check)
        self.scenarios.append(scenario)
        if len(self.scenarios) > 500: self.scenarios.pop(0)
        with open(self.filename, 'w') as f: json.dump(self.scenarios, f, cls=NpEncoder)

    def sample(self):
        return random.choice(self.scenarios) if self.scenarios else None

def make_env(level):
    def thunk():
        from robot_env import RobotEnv
        env = RobotEnv()
        env.set_level(level)
        return env
    return thunk

if __name__ == "__main__":
    current_level = 0
    hard_buffer = HardScenarioBuffer()
    envs = SubprocVecEnv([make_env(current_level) for _ in range(NUM_ENVS)])
    envs = VecNormalize(envs, norm_obs=False, norm_reward=False) 
    
    agent = Agent(envs.observation_space, envs.action_space).to(DEVICE)
    optimizer = optim.Adam(agent.parameters(), lr=LEARNING_RATE)
    
    success_buffer = deque(maxlen=EVAL_WINDOW)
    step_buffer = deque(maxlen=EVAL_WINDOW)
    
    next_obs = torch.Tensor(envs.reset()).to(DEVICE)
    next_done = torch.zeros(NUM_ENVS).to(DEVICE)
    
    # Estados de memoria dinámicos (Auto-adaptables al modelo)
    next_a_state = (torch.zeros(1, NUM_ENVS, agent.hidden_dim).to(DEVICE), torch.zeros(1, NUM_ENVS, agent.hidden_dim).to(DEVICE))
    next_c_state = (torch.zeros(1, NUM_ENVS, agent.hidden_dim).to(DEVICE), torch.zeros(1, NUM_ENVS, agent.hidden_dim).to(DEVICE))
    next_target_state = (torch.zeros(1, NUM_ENVS, agent.hidden_dim).to(DEVICE), torch.zeros(1, NUM_ENVS, agent.hidden_dim).to(DEVICE))
    episode_steps = np.zeros(NUM_ENVS)
    
    pbar = tqdm(total=7, desc=f"LVL {current_level}")

    while current_level <= 6:
        obs_b = torch.zeros((NUM_STEPS, NUM_ENVS) + envs.observation_space.shape).to(DEVICE)
        act_b = torch.zeros((NUM_STEPS, NUM_ENVS, 2)).to(DEVICE)
        logp_b = torch.zeros((NUM_STEPS, NUM_ENVS)).to(DEVICE)
        rew_b = torch.zeros((NUM_STEPS, NUM_ENVS)).to(DEVICE)
        done_b = torch.zeros((NUM_STEPS, NUM_ENVS)).to(DEVICE)
        val_b = torch.zeros((NUM_STEPS, NUM_ENVS)).to(DEVICE)
        
        init_a_state = (next_a_state[0].clone(), next_a_state[1].clone())
        init_c_state = (next_c_state[0].clone(), next_c_state[1].clone())
        
        for step in range(NUM_STEPS):
            obs_b[step], done_b[step] = next_obs, next_done
            with torch.no_grad():
                action, logprob, _, value, next_a_state, next_c_state = agent.get_action_and_value(next_obs, next_a_state, next_c_state, next_done)
                val_b[step] = value.flatten()
            
            act_b[step], logp_b[step] = action, logprob
            next_obs_raw, reward, done, infos = envs.step(action.cpu().numpy())
            
            rew_b[step] = torch.tensor(reward).to(DEVICE)
            next_obs, next_done = torch.Tensor(next_obs_raw).to(DEVICE), torch.Tensor(done).to(DEVICE)
            episode_steps += 1
            
            for i in range(NUM_ENVS):
                if done[i]:
                    is_success = infos[i].get("is_success", False)
                    success_buffer.append(1 if is_success else 0)
                    step_buffer.append(episode_steps[i])
                    
                    # LOG HARD SCENARIOS (Failure or very slow)
                    if not is_success or episode_steps[i] > 800:
                        if "terminal_state" in infos[i]:
                            hard_buffer.add(infos[i]["terminal_state"])
                    
                    # Randomly inject a hard scenario from buffer to 10% of resetting envs
                    if random.random() < 0.15:
                        hard = hard_buffer.sample()
                        if hard: envs.set_attr("forced_scenario", hard, indices=[i])
                    
                    episode_steps[i] = 0

        # PPO UPDATE
        with torch.no_grad():
            next_value, _ = agent.get_target_value(next_obs, next_target_state, next_done)
            next_value = next_value.reshape(1, -1)
            adv_b = torch.zeros_like(rew_b).to(DEVICE); lastgaelam = 0
            for t in reversed(range(NUM_STEPS)):
                nt = 1.0 - next_done if t == NUM_STEPS-1 else 1.0 - done_b[t+1]
                nv = next_value if t == NUM_STEPS-1 else val_b[t+1]
                delta = rew_b[t] + 0.99 * (nv * nt) - val_b[t]
                adv_b[t] = lastgaelam = (delta + CURIOSITY_WEIGHT * torch.abs(delta)) + 0.99 * 0.95 * nt * lastgaelam
            ret_b = adv_b + val_b

        agent.train()
        env_indices = np.arange(NUM_ENVS)
        for epoch in range(NUM_EPOCHS):
            np.random.shuffle(env_indices)
            for start in range(0, NUM_ENVS, MB_SIZE_ENVS): 
                mb_env_inds = env_indices[start:start+MB_SIZE_ENVS]
                mb_a_state = (init_a_state[0][:, mb_env_inds], init_a_state[1][:, mb_env_inds])
                mb_c_state = (init_c_state[0][:, mb_env_inds], init_c_state[1][:, mb_env_inds])
                _, newlogp, entropy, newval, _, _ = agent.get_action_and_value(obs_b[:, mb_env_inds], mb_a_state, mb_c_state, done_b[:, mb_env_inds], act_b[:, mb_env_inds].reshape(-1, 2))
                
                mb_adv = adv_b[:, mb_env_inds].reshape(-1)
                mb_adv = (mb_adv - mb_adv.mean()) / (mb_adv.std() + 1e-8)
                ratio = (newlogp - logp_b[:, mb_env_inds].reshape(-1)).exp()
                pg_loss = torch.max(-mb_adv * ratio, -mb_adv * torch.clamp(ratio, 0.8, 1.2)).mean()
                v_loss = 0.5 * ((newval.flatten() - ret_b[:, mb_env_inds].reshape(-1))**2).mean()
                loss = pg_loss - 0.01 * entropy.mean() + v_loss * 0.5
                optimizer.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(agent.parameters(), 0.5); optimizer.step()

        agent.update_target_network(TARGET_TAU)
        avg_success = np.mean(success_buffer) if len(success_buffer) >= 20 else 0
        pbar.set_postfix_str(f"Acc:{avg_success*100:.0f}% | L{current_level} | Steps:{np.mean(step_buffer) if step_buffer else 0:.0f}")
        pbar.update(0) # Keep visual sync
        
        if len(success_buffer) >= EVAL_WINDOW and avg_success >= SUCCESS_GOAL:
            torch.save(agent.state_dict(), f"models/automind_L{current_level}.pth")
            current_level += 1
            pbar.update(1) # Finalize level on bar
            if current_level > 6: break
            envs.close()
            envs = SubprocVecEnv([make_env(current_level) for _ in range(NUM_ENVS)])
            envs = VecNormalize(envs, norm_obs=False, norm_reward=False)
            next_obs = torch.Tensor(envs.reset()).to(DEVICE)
            success_buffer.clear(); pbar.desc = f"LVL {current_level}"
            
    torch.save(agent.state_dict(), "models/automind_final.pth")
    pbar.close(); envs.close()
