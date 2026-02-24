// utilities for checking if a path exists using a discrete grid approximation

export function hasValidPath(robotX, robotY, goalX, goalY, obstacles, newObstacleX, newObstacleY) {
  // Discretize the 0-1 continuous space into a grid
  const GRID_SIZE = 50; 
  const r = 0.05; // Standard obstacle radius from backend
  const robotRadius = 0.03; // Approximate clearance needed for the robot

  // Convert normalized coordinate to grid index
  const toGrid = (val) => Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(val * GRID_SIZE)));

  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));

  // Combine existing obstacles with the newly proposed one
  const allObstacles = [...obstacles, { x: newObstacleX, y: newObstacleY, r: r }];

  // Mark grid cells as blocked if they intersect with any obstacle
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      // center of this cell in continuous space (0-1)
      const cx = (x + 0.5) / GRID_SIZE;
      const cy = (y + 0.5) / GRID_SIZE;

      for (const obs of allObstacles) {
        // Distance between cell center and obstacle center
        const dx = cx - obs.x;
        const dy = cy - obs.y;
        const distSq = dx * dx + dy * dy;
        
        // If distance is less than obstacle radius + robot radius, it's blocked
        const clearanceRequired = obs.r + robotRadius;
        if (distSq < clearanceRequired * clearanceRequired) {
          grid[y][x] = 1; // 1 means blocked
          break;
        }
      }
    }
  }

  const startX = toGrid(robotX);
  const startY = toGrid(robotY);
  const endX = toGrid(goalX);
  const endY = toGrid(goalY);

  // If the robot or goal itself is instantly blocked by the new placement, invalid
  if (grid[startY][startX] === 1 || grid[endY][endX] === 1) {
    return false;
  }

  // BFS to find if a path exists
  const queue = [[startX, startY]];
  const visited = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  visited[startY][startX] = true;

  // 8-directional movement (orthogonal + diagonal)
  const dirs = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [-1, 1], [1, -1], [-1, -1]
  ];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();

    if (cx === endX && cy === endY) {
      return true; // Reached goal!
    }

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (!visited[ny][nx] && grid[ny][nx] === 0) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // Exhausted all reachable cells without finding the goal
  return false;
}
