# 🚀 AUTOMIND-ULTRA: Agentic Robotics Simulation

**AUTOMIND-ULTRA** is a high-fidelity agentic robotics simulation environment combining a high-performance **PyTorch PPO/Curriculum Learning** backend with a stunning **React + Three.js (Fiber)** frontend. Features a cinematic director view, dynamic obstacles, and a multi-level training system.

---

## 📸 Overview
- **AI Backend**: Custom RL environment built with `gymnasium`, featuring memory-augmented agents (LSTM) and curriculum-based level progression.
- **Vibrant Frontend**: Cinematic 3D action view with director-style camera, real-time telemetry HUD, and 2D strategic map.
- **Dynamic Physics**: Moving obstacles with custom VFX and industrial-grade cargo handling simulation.

---

## 🛠️ Setup & Execution Manual

**Paso 0: Navegar a la raíz del proyecto**
Abre **PowerShell** y entra en la carpeta donde clonaste el repositorio:
```powershell
cd "C:\Ruta\A\TU\AUTOMIND-ULTRA"
```

---

### **1. Configuración Inicial (Solo la primera vez)**
Ejecuta estos comandos para preparar el entorno:

```powershell
# 1. Configurar Entorno Virtual de Python
cd scripts
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install torch numpy fastapi "uvicorn[standard]" websockets gymnasium pygame tqdm stable-baselines3

# 2. Configurar Frontend
cd ..\frontend
npm install
```

---

### **2. Ejecución del Sistema**

#### **A. Interfaz Web 3D (Frontend)**
**Terminal 1 (desde la raíz del proyecto):**
```powershell
cd frontend
npm run dev
```
*Acceso vía navegador:* `http://localhost:5173`

#### **B. Inteligencia Central AI (Socket Server)**
**Terminal 2 (desde la raíz del proyecto):**
```powershell
cd scripts
.\.venv\Scripts\python.exe server.py
```

#### **C. Entrenamiento Estratégico (Opcional)**
**Terminal 3 (desde la raíz del proyecto):**
```powershell
cd scripts
.\.venv\Scripts\python.exe train_robot.py
```

---

## 💡 Troubleshooting Tips
*   **Error de Módulos**: Si ves `ModuleNotFoundError: No module named 'torch'`, asegúrate de estar usando el ejecutable del entorno virtual: `.\.venv\Scripts\python.exe`.
*   **Visual Assets**: Ensure `.glb` models (e.g., `drone.glb`, `anime_vfx.glb`) are located in `frontend/public/` for correct scene rendering.
*   **Execution Policy**: In Windows, if scripts are blocked, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`.

---

## 📜 License
Developed for advanced agentic coding research. No generic placeholders—just pure, industrial-grade simulation.
