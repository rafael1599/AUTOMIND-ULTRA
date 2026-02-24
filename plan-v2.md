# Plan de Desarrollo: Agente Robótico Reactivo (V2)

## Visión General
Evolucionar de una simulación de cuadrícula estática (Q-Learning) a un entorno inmersivo en 3D con un agente robótico autónomo ("Embodied AI"). El agente operará en un espacio continuo, tomando decisiones en tiempo real basadas en la información sensorial de 4 "ojos" (Raycasting) y reaccionando dinámicamente a obstáculos interactivos colocados por el usuario.

## Arquitectura del Sistema

### 1. Backend (Cerebro y Entorno)
*   **Lenguaje:** Python
*   **Framework de API:** FastAPI (rápido, asíncrono, ideal para WebSockets)
*   **Entorno de Simulación:** Gymnasium (creación de un entorno personalizado)
*   **Inteligencia Artificial:** Stable Baselines3 (PPO - Proximal Policy Optimization)

### 2. Frontend (Visualizador Interactivo 3D)
*   **Framework UI:** React
*   **Motor 3D:** React Three Fiber (R3F) - Integra Three.js de manera declarativa con React
*   **UI de Control:** Leva / Tweakpane (para métricas y controles en tiempo real)

### 3. Comunicación
*   **Protocolo:** WebSockets Bidireccionales
*   **Flujo Frecuente (10-20 FPS):** Python $\rightarrow$ React: `{posición_robot, rotación, valores_sensores}`
*   **Eventos Asíncronos:** React $\rightarrow$ Python: `{evento: colocar_obstaculo, coordenadas, tipo}`

## Modelo del Agente

*   **Observación (Input de la Red Neuronal):**
    *   Vector hacia el objetivo (Pasajero/Caja de Herramientas): `[delta_x, delta_y]`
    *   Sensores Distancia (4 ojos - Raycasting 2D): `[norte, sur, este, oeste]` (valores continuos de 0 a 1)
*   **Acción (Output):**
    *   Espacio de acción discreto o continuo para movimiento tipo tanque: Avanzar, Retroceder, Girar Izquierda, Girar Derecha, Velocidad.

## Fases de Desarrollo

### Fase 1: Fundamentos del Entorno 2D y Entrenamiento (Semana 1)
**Objetivo:** Tener un modelo PPO entrenado capaz de navegar obstáculos dinámicos en un entorno continuo.
1.  **Entorno Gymnasium:** Crear `RobotEnv` con físicas 2D básicas (círculos y polígonos).
2.  **Sensores:** Implementar la lógica de *Raycasting* 2D matemático para los 4 sensores del agente.
3.  **Entrenamiento:** Entrenar el modelo con Stable Baselines3 generando obstáculos de manera procedimental en cada episodio para maximizar la generalización.
4.  **Validación:** Visualización básica en 2D (Pygame/OpenCV) para comprobar el comportamiento reactivo.

### Fase 2: Backend de Comunicación (Semana 2)
**Objetivo:** Exponer la simulación a través de WebSockets.
1.  **Servidor FastAPI:** Configurar endpoints y rutas de WebSocket.
2.  **Bucle de Simulación:** Integrar el modelo PPO entrenado en un bucle continuo que actualice el estado del agente y dispare mensajes por el socket.
3.  **Recepción de Eventos:** Implementar la lógica para recibir clics del frontend (coordenadas) e inyectar dinámicamente nuevos obstáculos en la simulación activa.

### Fase 3: Frontend y Motor 3D (Semanas 3-4)
**Objetivo:** Construir la experiencia interactiva, realista e inmersiva.
1.  **Setup R3F:** Crear la escena base (luces, cámara, suelo) en React Three Fiber.
2.  **Integración WebSocket:** Conectar el cliente de React al backend asíncrono.
3.  **Movimiento Interpolado:** Mapear los datos del backend a la posición y rotación del modelo 3D usando lerp (interpolación) lineal/esférica para asegurar 60FPS fluidos a pesar de los "ticks" más lentos del backend.
4.  **Interacción (Raycasting 3D):** Usar el raycaster integrado de R3F para detectar clics en el plano del suelo y enviar las coordenadas correctas al servidor para instanciar barricadas.

### Fase 4: Pulido Visual y Efectos "Wow" (Semana 4)
**Objetivo:** Darle el acabado premium y demostrar la naturaleza reactiva del agente.
1.  **Feedback Visual de los Sensores:** Hacer que los "ojos" del robot 3D brillen (Post-processing Bloom) cambiando de color (ej. verde a rojo) en milisegundos cuando detectan un obstáculo colocado por el usuario.
2.  **Modelos 3D:** Sustituir geometrías primitivas por modelos Sci-Fi/Low Poly (Robot "Rover", paquete de herramientas, barricadas policiales de neón).
3.  **UI Flotante:** Mostrar las estadísticas de los sensores en tiempo real sobre el robot o en un panel lateral elegante.

## División de Trabajo Recomendada (Para Solopreneur)
Dado que es un proyecto en solitario, el enfoque debe ser iterativo y modular:

*   **Sprint 1 (Backend puro):** Gym Env $\rightarrow$ Sensores Matemáticos $\rightarrow$ PPO Model. No toques WebSockets ni React hasta que el modelo esquive cosas fiablemente.
*   **Sprint 2 (El Puente):** FastAPI $\rightarrow$ WebSockets $\rightarrow$ Cliente React Básico (solo renderizando cuadrados 2D en un Canvas en lugar de R3F). Esto prueba el flujo de datos.
*   **Sprint 3 (La Experiencia):** Migración a R3F $\rightarrow$ Interacción Puntero $\rightarrow$ Modelos 3D $\rightarrow$ Interpolación de movimiento.

## Consideraciones de Diseño
*   **No calcular trayectorias:** El asombro del usuario vendrá de ver al robot dar un "volantazo" reactivo cuando un bloque cae frente a él, no porque recalculó una ruta tipo GPS.
*   **Coordenadas normalizadas:** Trabajar siempre en espacios normalizados (ej. mapa de -1 a 1) en el backend ayuda tanto a la Red Neuronal (que prefiere inputs pequeños) como al escalado posterior en el lienzo 3D.
