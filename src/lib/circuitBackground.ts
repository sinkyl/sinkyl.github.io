interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
}

interface CircuitBackgroundOptions {
  canvasId?: string;
  connectionDistance?: number;
  mouseInfluenceRadius?: number;
  nodeColor?: string;
  glowColor?: string;
  gravityCenter?: { x: number; y: number } | null;
  gravityRadius?: number;
  gravityStrength?: number;
}

export function initCircuitBackground(options: CircuitBackgroundOptions = {}) {
  const {
    canvasId = 'circuit-bg',
    connectionDistance = 150,
    mouseInfluenceRadius = 200,
    nodeColor = 'rgba(97, 175, 239, 0.6)',
    glowColor = 'rgba(198, 120, 221, 1)',
    gravityRadius = 300,
    gravityStrength = 0.015
  } = options;

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let mouseX = width / 2;
  let mouseY = height / 2;
  let animationId: number;

  // Gravity center (cube position) - will be updated dynamically
  let gravityCenterX = width / 2;
  let gravityCenterY = 120; // Approximate cube position from top

  const nodes: Node[] = [];

  function init() {
    canvas.width = width;
    canvas.height = height;

    nodes.length = 0;
    const count = Math.min(80, Math.floor((width * height) / 15000));

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      nodes.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1
      });
    }
  }

  function drawNode(node: Node, intensity: number) {
    const glow = intensity > 0;

    if (glow) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = glowColor.replace('1)', `${intensity * 0.3})`);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = glow
      ? glowColor.replace('1)', `${0.6 + intensity * 0.4})`)
      : nodeColor;
    ctx.fill();
  }

  function drawConnection(node1: Node, node2: Node, distance: number) {
    const opacity = (1 - distance / connectionDistance) * 0.3;
    ctx.beginPath();
    ctx.moveTo(node1.x, node1.y);
    ctx.lineTo(node2.x, node2.y);
    ctx.strokeStyle = nodeColor.replace('0.6)', `${opacity})`);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      node.x += node.vx;
      node.y += node.vy;

      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mouseInfluenceRadius) {
        const force = (1 - dist / mouseInfluenceRadius) * 0.02;
        node.x += dx * force;
        node.y += dy * force;
      }

      // Gravitational pull toward cube (black hole effect)
      const gx = gravityCenterX - node.x;
      const gy = gravityCenterY - node.y;
      const gDist = Math.sqrt(gx * gx + gy * gy);

      if (gDist < gravityRadius && gDist > 50) {
        // Stronger pull as nodes get closer (inverse square-ish)
        const pullStrength = gravityStrength * (1 - gDist / gravityRadius) * (1 - gDist / gravityRadius);
        node.vx += (gx / gDist) * pullStrength;
        node.vy += (gy / gDist) * pullStrength;

        // Slight orbital tendency
        node.vx += (gy / gDist) * pullStrength * 0.3;
        node.vy -= (gx / gDist) * pullStrength * 0.3;
      }

      // Dampen velocity slightly
      node.vx *= 0.99;
      node.vy *= 0.99;

      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));

      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j];
        const connDx = node.x - other.x;
        const connDy = node.y - other.y;
        const connDist = Math.sqrt(connDx * connDx + connDy * connDy);

        if (connDist < connectionDistance) {
          drawConnection(node, other, connDist);
        }
      }

      const mouseIntensity = dist < mouseInfluenceRadius
        ? 1 - dist / mouseInfluenceRadius
        : 0;

      drawNode(node, mouseIntensity);
    }

    // Draw lines from mouse to nearest nodes
    const nearNodes = nodes
      .map(n => ({ node: n, dist: Math.sqrt((n.x - mouseX) ** 2 + (n.y - mouseY) ** 2) }))
      .filter(n => n.dist < mouseInfluenceRadius)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    for (const { node, dist } of nearNodes) {
      const opacity = (1 - dist / mouseInfluenceRadius) * 0.4;
      ctx.beginPath();
      ctx.moveTo(mouseX, mouseY);
      ctx.lineTo(node.x, node.y);
      ctx.strokeStyle = glowColor.replace('1)', `${opacity})`);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw gravitational pull lines to cube (black hole effect)
    const gravityNearNodes = nodes
      .map(n => ({
        node: n,
        dist: Math.sqrt((n.x - gravityCenterX) ** 2 + (n.y - gravityCenterY) ** 2)
      }))
      .filter(n => n.dist < gravityRadius * 0.6 && n.dist > 60)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);

    for (const { node, dist } of gravityNearNodes) {
      const opacity = (1 - dist / (gravityRadius * 0.6)) * 0.15;
      ctx.beginPath();
      ctx.moveTo(gravityCenterX, gravityCenterY);
      ctx.lineTo(node.x, node.y);
      ctx.strokeStyle = `rgba(100, 100, 130, ${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    animationId = requestAnimationFrame(animate);
  }

  function handleResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    gravityCenterX = width / 2;
    init();
  }

  // Update gravity center based on cube position
  function updateGravityCenter() {
    const cube = document.getElementById('hero-cube');
    if (cube) {
      const rect = cube.getBoundingClientRect();
      gravityCenterX = rect.left + rect.width / 2;
      gravityCenterY = rect.top + rect.height / 2 + window.scrollY;
    }
  }

  // Initial gravity center update
  updateGravityCenter();

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function handleMouseLeave() {
    mouseX = width / 2;
    mouseY = height / 2;
  }

  init();
  animate();

  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseleave', handleMouseLeave);
  };
}
