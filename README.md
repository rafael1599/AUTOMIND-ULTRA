# 🚀 AUTOMIND-ULTRA: Agentic Robotics Simulation

**AUTOMIND-ULTRA** is a high-fidelity agentic robotics simulation environment combining a high-performance **PyTorch PPO/Curriculum Learning** backend with a stunning **React + Three.js (Fiber)** frontend. Features a cinematic director view, dynamic obstacles, and a multi-level training system.

---

## 📸 Overview
- **AI Backend**: Custom RL environment built with `gymnasium`, featuring memory-augmented agents (LSTM) and curriculum-based level progression.
- **Vibrant Frontend**: Cinematic 3D action view with director-style camera, real-time telemetry HUD, and 2D strategic map.
- **Dynamic Physics**: Moving obstacles with custom VFX and industrial-grade cargo handling simulation.

---

## 🛠️ Setup & Execution Manual

> **IMPORTANT:** Replace `[YOUR_PROJECT_PATH]` with the absolute path where you cloned this repository (e.g., `C:\Users\Name\Documents\AUTOMIND-ULTRA`).

### **1. Initial Setup (First Time Only)**
Open **PowerShell** and run these commands to prepare your environment:

```powershell
# 1. Navigate to the scripts directory
cd "[YOUR_PROJECT_PATH]\scripts"

# 2. Create the Python Virtual Environment
python -m venv .venv

# 3. Install AI & Server dependencies
& "[YOUR_PROJECT_PATH]\scripts\.venv\Scripts\python.exe" -m pip install torch numpy fastapi uvicorn gymnasium pygame tqdm stable-baselines3

# 4. Navigate to frontend and install web dependencies
cd "[YOUR_PROJECT_PATH]\frontend"
npm install
```

---

### **2. Running the System**

#### **A. Start the 3D Web Interface (Frontend)**
**Terminal 1:**
```powershell
cd "[YOUR_PROJECT_PATH]\frontend"
npm run dev
```
*Access via browser at:* `http://localhost:5173`

#### **B. Start the AI Central Intelligence (Socket Server)**
**Terminal 2:**
```powershell
cd "[YOUR_PROJECT_PATH]\scripts"
& "[YOUR_PROJECT_PATH]\scripts\.venv\Scripts\python.exe" server.py
```

#### **C. Strategic Training (Optional)**
**Terminal 3:**
```powershell
# Run this if you want to train a fresh agent from scratch
cd "[YOUR_PROJECT_PATH]\scripts"
& "[YOUR_PROJECT_PATH]\scripts\.venv\Scripts\python.exe" train_robot.py
```

---

## 💡 Troubleshooting Tips
*   **Module Mismatch**: If you see `ModuleNotFoundError: No module named 'torch'`, ensures you are using the full path prefix: `& "[YOUR_PROJECT_PATH]\scripts\.venv\Scripts\python.exe"`.
*   **Visual Assets**: Ensure `.glb` models (e.g., `drone.glb`, `anime_vfx.glb`) are located in `frontend/public/` for correct scene rendering.
*   **Execution Policy**: In Windows, if scripts are blocked, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`.

---

## 📜 License
Developed for advanced agentic coding research. No generic placeholders—just pure, industrial-grade simulation.
