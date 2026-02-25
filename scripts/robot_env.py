import gymnasium as gym
from gymnasium import spaces
import numpy as np
import pygame
import math

class RobotEnv(gym.Env):
    metadata = {"render_modes": ["human", "rgb_array"], "render_fps": 30}

    def __init__(self, render_mode=None, size=1.0):
        super().__init__()
        self.size = size
        self.window_size = 500
        
        self.action_space = spaces.Box(low=np.array([-1.0, -1.0], dtype=np.float32), high=np.array([1.0, 1.0], dtype=np.float32), dtype=np.float32)
        
        # [tool_vec_x, tool_vec_y, goal_vec_x, goal_vec_y, has_tool, battery, lin_vel, ang_vel, 8x_sensors] = 16
        self.observation_space = spaces.Box(low=-1.0, high=1.0, shape=(16,), dtype=np.float32)

        self.render_mode = render_mode
        self.window = None
        self.clock = None

        self.robot_radius = 0.005
        self.goal_radius = 0.008
        self.tool_radius = 0.005
        self.obstacle_radius = 0.008
        self.dyn_obstacle_radius = 0.005
        self.min_dist_spawn = 0.03
        self.sensor_range = 0.1 # Vision range relative to 1.0 map
        self.max_steps = 1000
        self.max_speed = 0.02
        self.max_turn_speed = math.pi / 8
        self.sensor_max_dist = 0.4

        self.current_level = 0
        self.obstacles = []
        self.dyn_obstacles = []
        self.forced_scenario = None
        self.user_intervention = None # "God's Finger" position [x, y]
        self.god_mode = False # If True, don't spawn obstacles on reset

    def set_level(self, level):
        self.current_level = level

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        self.battery_level = 1.0
        self.has_tool = 0.0
        self.last_action = np.zeros(2)
        
        scenario = options.get("scenario") if options else self.forced_scenario
        self.forced_scenario = None # Clear after use

        if scenario:
            # Replay a failure scenario
            self.robot_pos = np.array(scenario["robot_pos"])
            self.goal_pos = np.array(scenario["goal_pos"])
            self.tool_pos = np.array(scenario["tool_pos"])
            self.obstacles = scenario["obstacles"]
            self.dyn_obstacles = []
            for d in scenario["dyn_obstacles"]:
                self.dyn_obstacles.append({
                    "pos": np.array(d["pos"]),
                    "vel": np.array(d["vel"]),
                    "r": d["r"]
                })
            self.robot_angle = scenario.get("robot_angle", self.np_random.uniform(0, 2 * math.pi))
        else:
            def rand_pos():
                return np.array([self.np_random.uniform(0.1, 0.9), self.np_random.uniform(0.1, 0.9)])
                
            self.goal_pos = rand_pos()
            self.tool_pos = rand_pos()
            while np.linalg.norm(self.tool_pos - self.goal_pos) < 0.3:
                self.tool_pos = rand_pos()
                
            # LEVEL LOGIC
            self.obstacles = []
            self.dyn_obstacles = []

            if self.god_mode:
                # In God Mode, we start with a clean slate
                num_obstacles = 0
                num_dyn = 0
            elif self.current_level <= 3:
                num_obstacles = min(2 * self.current_level, 6)
                num_dyn = min(self.current_level, 3)
            elif self.current_level == 4: # LVL 4: SWARM
                num_obstacles = 4
                num_dyn = 8
            elif self.current_level == 5: # LVL 5: WAREHOUSE (Corridors)
                num_obstacles = 12
                num_dyn = 4
                # We can also add specific patterns here in the future
            else: # LVL 6+: THE GAUNTLET
                num_obstacles = 10
                num_dyn = 10
                self.battery_level = 0.6 # Harder starts

            for _ in range(num_obstacles):
                while True:
                    r_obs = self.np_random.uniform(0.04, 0.08)
                    obs = (self.np_random.uniform(0.1, 0.9), self.np_random.uniform(0.1, 0.9), r_obs)
                    if np.linalg.norm(np.array([obs[0], obs[1]]) - self.goal_pos) > (obs[2] + self.goal_radius + 0.1) and \
                       np.linalg.norm(np.array([obs[0], obs[1]]) - self.tool_pos) > (obs[2] + self.tool_radius + 0.1):
                        self.obstacles.append(obs)
                        break

            for _ in range(num_dyn):
                while True:
                    pos = rand_pos()
                    if np.linalg.norm(pos - self.goal_pos) > 0.15 and np.linalg.norm(pos - self.tool_pos) > 0.15:
                        speed = 0.005 + (0.002 * (self.current_level - 3) if self.current_level > 3 else 0)
                        vel = np.array([self.np_random.uniform(-speed, speed), self.np_random.uniform(-speed, speed)])
                        self.dyn_obstacles.append({"pos": pos, "vel": vel, "r": 0.04})
                        break

            # Robot spawn
            while True:
                self.robot_pos = rand_pos()
                valid = True
                if np.linalg.norm(self.robot_pos - self.goal_pos) < 0.2: valid = False
                if np.linalg.norm(self.robot_pos - self.tool_pos) < 0.2: valid = False
                for obs in self.obstacles:
                    if np.linalg.norm(self.robot_pos - np.array([obs[0], obs[1]])) < (obs[2] + self.robot_radius + 0.05):
                        valid = False
                if valid: break
            
            self.robot_angle = self.np_random.uniform(0, 2 * math.pi)

        self.last_dist_to_target = np.linalg.norm(self.robot_pos - self.tool_pos)
        return self._get_obs(), {}

    def get_full_state(self):
        return {
            "robot_pos": self.robot_pos.tolist(),
            "robot_angle": self.robot_angle,
            "goal_pos": self.goal_pos.tolist(),
            "tool_pos": self.tool_pos.tolist(),
            "obstacles": self.obstacles,
            "dyn_obstacles": self.dyn_obstacles
        }

    def step(self, action):
        action = np.clip(action, self.action_space.low, self.action_space.high)
        lin_vel = action[0] 
        ang_vel = action[1]
        
        # Consume battery
        self.battery_level -= 0.0002 + 0.0005 * abs(lin_vel) + 0.0002 * abs(ang_vel)

        self.robot_angle += ang_vel * self.max_turn_speed
        self.robot_angle %= (2 * math.pi)
        
        new_x = self.robot_pos[0] + lin_vel * self.max_speed * math.cos(self.robot_angle)
        new_y = self.robot_pos[1] + lin_vel * self.max_speed * math.sin(self.robot_angle)
        
        hit_border = False
        if new_x < self.robot_radius or new_x > self.size - self.robot_radius:
            hit_border = True
            new_x = np.clip(new_x, self.robot_radius, self.size - self.robot_radius)
        if new_y < self.robot_radius or new_y > self.size - self.robot_radius:
            hit_border = True
            new_y = np.clip(new_y, self.robot_radius, self.size - self.robot_radius)
            
        # Move dynamic obstacles
        for dyn in self.dyn_obstacles:
            pos = dyn["pos"]
            vel = dyn["vel"]
            pos += vel
            if pos[0] < dyn["r"] or pos[0] > self.size - dyn["r"]:
                vel[0] *= -1
                pos[0] = np.clip(pos[0], dyn["r"], self.size - dyn["r"])
            if pos[1] < dyn["r"] or pos[1] > self.size - dyn["r"]:
                vel[1] *= -1
                pos[1] = np.clip(pos[1], dyn["r"], self.size - dyn["r"])
        
        # User Intervention (God's Finger) - Behaves as a dangerous zone
        user_obs = []
        if self.user_intervention:
            user_obs.append((self.user_intervention[0], self.user_intervention[1], 0.04)) # Danger radius
                
        hit_obstacle = False
        all_obs = self.obstacles + [(d["pos"][0], d["pos"][1], d["r"]) for d in self.dyn_obstacles] + user_obs
        for obs in all_obs:
            dist = np.linalg.norm(np.array([new_x, new_y]) - np.array([obs[0], obs[1]]))
            if dist < (self.robot_radius + obs[2]):
                hit_obstacle = True
                break
        
        if not hit_obstacle:
            self.robot_pos = np.array([new_x, new_y])

        self.current_step += 1
        
        reward = -0.05 # Cost per step
        terminated = False
        truncated = False
        info = {"is_success": False}

        # Smooth movement penalty
        reward -= 0.02 * abs(ang_vel)
        reward -= 0.02 * abs(lin_vel - self.last_action[0]) # Jerk penalty
        self.last_action = np.copy(action)

        if hit_obstacle or hit_border:
            reward -= 2.0
            self.battery_level -= 0.05

        target_pos = self.goal_pos if self.has_tool > 0.5 else self.tool_pos
        dist_to_target = np.linalg.norm(self.robot_pos - target_pos)

        # Reward shaping
        if dist_to_target < self.last_dist_to_target:
            reward += 0.2 
        self.last_dist_to_target = dist_to_target

        if self.has_tool < 0.5:
            if dist_to_target < (self.robot_radius + self.tool_radius):
                self.has_tool = 1.0
                reward += 10.0
                self.last_dist_to_target = np.linalg.norm(self.robot_pos - self.goal_pos)
        else:
            if dist_to_target < (self.robot_radius + self.goal_radius):
                reward += 20.0
                terminated = True
                info["is_success"] = True

        if self.battery_level <= 0.0:
            reward -= 5.0
            terminated = True
            
        if self.current_step >= self.max_steps:
             truncated = True

        self.battery_level = max(0.0, self.battery_level)

        obs = self._get_obs(lin_vel, ang_vel)

        if self.render_mode == "human":
            self.render()

        if terminated or truncated:
            info["terminal_state"] = self.get_full_state()

        return obs, reward, terminated, truncated, info

    def _get_obs(self, lin_vel=0.0, ang_vel=0.0):
        def rel_vec(target):
            vec = target - self.robot_pos
            norm = np.linalg.norm(vec)
            if norm > 0:
                heading = math.atan2(vec[1], vec[0])
                rel_angle = (heading - self.robot_angle + math.pi) % (2*math.pi) - math.pi
                norm_scaled = min(norm / self.size, 1.0)
                return [math.cos(rel_angle)*norm_scaled, math.sin(rel_angle)*norm_scaled]
            return [0.0, 0.0]

        t_vec = rel_vec(self.tool_pos)
        g_vec = rel_vec(self.goal_pos)
        sensors = self._get_raycasts()
        
        return np.array([
            t_vec[0], t_vec[1], g_vec[0], g_vec[1],
            self.has_tool, self.battery_level, lin_vel, ang_vel,
            *sensors
        ], dtype=np.float32)

    def _get_raycasts(self):
        angles_rel = [i * (math.pi/4) for i in range(8)]
        sensor_values = np.zeros(8, dtype=np.float32)
        
        user_obs = []
        if self.user_intervention:
            user_obs.append((self.user_intervention[0], self.user_intervention[1], 0.04))

        all_obs = self.obstacles + [(d["pos"][0], d["pos"][1], d["r"]) for d in self.dyn_obstacles] + user_obs
        
        for i, angle_rel in enumerate(angles_rel):
            global_angle = self.robot_angle + angle_rel
            dx = math.cos(global_angle)
            dy = math.sin(global_angle)
            min_dist = self.sensor_max_dist
            
            if dx < 0:
                dist = -self.robot_pos[0] / dx
                if 0 < dist < min_dist: min_dist = dist
            elif dx > 0:
                dist = (self.size - self.robot_pos[0]) / dx
                if 0 < dist < min_dist: min_dist = dist
            if dy < 0:
                dist = -self.robot_pos[1] / dy
                if 0 < dist < min_dist: min_dist = dist
            elif dy > 0:
                dist = (self.size - self.robot_pos[1]) / dy
                if 0 < dist < min_dist: min_dist = dist

            for obs in all_obs:
                v = self.robot_pos - np.array([obs[0], obs[1]])
                b = 2 * (dx * v[0] + dy * v[1])
                c = (v[0]*v[0] + v[1]*v[1]) - obs[2]*obs[2]
                disc = b*b - 4*c
                if disc > 0:
                    t1 = (-b - math.sqrt(disc)) / 2
                    if 0 < t1 < min_dist: min_dist = t1
            
            normalized_val = 1.0 - (min_dist / self.sensor_max_dist)
            sensor_values[i] = np.clip(normalized_val, 0.0, 1.0)
            
        return sensor_values

    def set_dynamic_obstacles(self, coords_list):
        for coord in coords_list:
             self.obstacles.append((coord[0], coord[1], 0.05))

    def render(self):
        if self.render_mode is None: return
        
        if self.window is None:
            pygame.init()
            pygame.display.init()
            self.window = pygame.display.set_mode((self.window_size, self.window_size))
        if self.clock is None:
            self.clock = pygame.time.Clock()

        canvas = pygame.Surface((self.window_size, self.window_size))
        canvas.fill((20, 20, 30))
        scale = self.window_size / self.size

        # Goal
        pygame.draw.circle(canvas, (50, 200, 50), (int(self.goal_pos[0]*scale), int(self.goal_pos[1]*scale)), int(self.goal_radius*scale))
        
        # Tool
        if self.has_tool < 0.5:
            pygame.draw.circle(canvas, (50, 50, 200), (int(self.tool_pos[0]*scale), int(self.tool_pos[1]*scale)), int(self.tool_radius*scale))

        # Obstacles
        for obs in self.obstacles:
            pygame.draw.circle(canvas, (200, 50, 50), (int(obs[0]*scale), int(obs[1]*scale)), int(obs[2]*scale))
        for dyn in self.dyn_obstacles:
            pygame.draw.circle(canvas, (200, 150, 50), (int(dyn["pos"][0]*scale), int(dyn["pos"][1]*scale)), int(dyn["r"]*scale))

        # Robot
        r_px = (int(self.robot_pos[0]*scale), int(self.robot_pos[1]*scale))
        pygame.draw.circle(canvas, (100, 150, 255), r_px, int(self.robot_radius*scale))
        end_x = int((self.robot_pos[0] + math.cos(self.robot_angle) * self.robot_radius) * scale)
        end_y = int((self.robot_pos[1] + math.sin(self.robot_angle) * self.robot_radius) * scale)
        pygame.draw.line(canvas, (255, 255, 255), r_px, (end_x, end_y), 2)
        
        # Raycasts (8 rays)
        angles_rel = [i * (math.pi/4) for i in range(8)]
        ray_vals = self._get_raycasts()
        for i, angle_rel in enumerate(angles_rel):
            global_angle = self.robot_angle + angle_rel
            dist = (1.0 - ray_vals[i]) * self.sensor_max_dist
            ray_end = (int((self.robot_pos[0] + math.cos(global_angle)*dist)*scale), int((self.robot_pos[1] + math.sin(global_angle)*dist)*scale))
            color = (255, 50, 50) if ray_vals[i] > 0.01 else (50, 255, 255)
            pygame.draw.line(canvas, color, r_px, ray_end, 1)

        self.window.blit(canvas, canvas.get_rect())
        pygame.event.pump()
        pygame.display.update()
        self.clock.tick(self.metadata["render_fps"])

    def close(self):
        if self.window is not None:
            pygame.display.quit()
            pygame.quit()
