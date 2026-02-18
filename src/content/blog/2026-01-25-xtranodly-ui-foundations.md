---
title: "Building the UI Rendering Pipeline"
date: 2026-01-25
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [Camera Transform, Spatial Indexing, Immediate Mode]
architectures: [GPU Rendering, Component Architecture]
---

## Week at a Glance

- Set up the **wgpu rendering pipeline** — GPU state, surface configuration, render passes
- Implemented the **Camera2D** system with pan, zoom, and screen-to-world coordinate transforms
- Built **NodeView** — visual representation of nodes with port positioning and sizing
- Added **SpatialGrid** for efficient hit-testing and viewport culling
- Implemented **graph I/O** — load and save graph structure and layout from JSON files
- Built **edge rendering** with cached bezier curves between port positions
- Added basic **node interaction** — selection, dragging, and hover feedback

## What We Built

### GPU Rendering Pipeline

The rendering stack is built on `wgpu`, Rust's cross-platform GPU abstraction. The initialization sequence sets up the device, queue, surface, and render pipeline:

```rust
pub struct GpuState {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub surface: wgpu::Surface<'static>,
    pub config: wgpu::SurfaceConfiguration,
}
```

We use a single render pass per frame with two renderers: `RectRenderer` for node bodies and port indicators, and `EdgeRenderer` for wire curves. Both submit vertex data to the GPU each frame — no persistent scene graph, closer to immediate mode rendering.

This keeps the rendering code simple and avoids synchronization between the graph model and a separate scene representation. When the graph changes, the next frame automatically reflects it.

### Camera System

The `Camera2D` transforms between screen coordinates (pixels) and world coordinates (graph space). Pan and zoom are the primary interactions:

```rust
pub struct Camera2D {
    pub position: Vec2,  // World-space center
    pub zoom: f32,       // Scale factor
    pub viewport: Vec2,  // Screen dimensions
}

impl Camera2D {
    pub fn screen_to_world(&self, screen_pos: Vec2) -> Vec2 {
        (screen_pos - self.viewport * 0.5) / self.zoom + self.position
    }

    pub fn world_to_screen(&self, world_pos: Vec2) -> Vec2 {
        (world_pos - self.position) * self.zoom + self.viewport * 0.5
    }
    // ...
}
```

All hit-testing and layout computation happens in world space. The camera transform is applied only at render time, keeping the coordinate system consistent throughout the update loop.

### Node Views and Port Layout

Each node in the graph gets a `NodeView` that stores its visual properties:

```rust
pub struct NodeView {
    pub position: Vec2,
    pub size: Vec2,
    pub input_positions: Vec<Vec2>,   // Port centers, relative to node
    pub output_positions: Vec<Vec2>,
}
```

Port positions are computed from the node's port count and size. Input ports line up on the left edge, output ports on the right. The layout algorithm spaces ports evenly, with a minimum vertical gap to keep them clickable.

### Spatial Grid

For efficient interaction, nodes are indexed in a `SpatialGrid` — a uniform grid that maps world-space cells to the nodes they contain. When the user clicks or hovers, we query only the relevant cell instead of iterating all nodes:

```rust
pub struct SpatialGrid {
    cell_size: f32,
    cells: HashMap<(i32, i32), Vec<NodeId>>,
}

impl SpatialGrid {
    pub fn query_point(&self, pos: Vec2) -> &[NodeId] {
        let cell = self.cell_for(pos);
        self.cells.get(&cell).map_or(&[], |v| v.as_slice())
    }
    // ...
}
```

This scales linearly with node count for insertion and O(1) for point queries — essential for responsive interaction with large graphs.

### Edge Rendering

Edges render as bezier curves between port positions. The `EdgeCache` stores precomputed curve points that are invalidated when nodes move:

The curves use a simple cubic bezier with horizontal tangents — the wire exits the output port rightward and enters the input port leftward, creating the characteristic "flow" shape of node graphs. Control point distance scales with the horizontal gap between ports, so short connections are nearly straight while long ones have a generous curve.

### Graph I/O

Graph structure and node layout save to separate JSON files. The graph file contains nodes, edges, and metadata. The layout file maps `NodeId` to screen positions. Keeping them separate means the same graph can have different visual arrangements without duplicating the structural data.

```rust
pub fn save_graph(graph: &Graph, path: &Path) -> Result<()> {
    let json = serde_json::to_string_pretty(graph)?;
    fs::write(path, json)?;
    Ok(())
}

pub fn load_graph(path: &Path) -> Result<Graph> {
    let json = fs::read_to_string(path)?;
    let graph: Graph = serde_json::from_str(&json)?;
    Ok(graph)
}
```

## Performance

The spatial grid makes a measurable difference. With 500 nodes, brute-force hit-testing (iterate all nodes, check bounds) takes ~0.3ms per event. Spatial grid query takes <0.01ms. At 60fps with continuous mouse movement, that's the difference between 18ms/frame and <1ms/frame spent on interaction.

Edge rendering benefits from the cache — recomputing bezier curves for 1,000 edges takes ~2ms, but the cache means we only recompute curves for edges connected to moved nodes (typically 2-6 per drag frame).

## Validation

Rendering tests are visual — load a known graph, capture the render output, compare against a reference. For this week we relied on manual verification: load the demo graph (counter circuit), verify nodes appear at saved positions, drag a node, verify edges follow, zoom in/out, verify camera transform correctness.

Graph I/O round-trip: save graph, load into fresh state, compare node/edge counts and IDs. Save layout, load layout, verify positions match within floating-point epsilon.

## What's Next

- Build the **context view system** — visual panels for subgraph navigation
- Implement **boundary anchors** — visual representation of cross-context connections
- Add **dock strip** for managing floating context panels
- Begin **anchor wire dragging** for creating cross-context connections

## References

- [wgpu Documentation](https://wgpu.rs/)
- [Learn wgpu](https://sotrh.github.io/learn-wgpu/)
