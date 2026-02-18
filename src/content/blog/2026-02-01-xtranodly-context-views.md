---
title: "Building the Context View System"
date: 2026-02-01
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [State Machine, Snap Detection, Observer]
architectures: [Component Architecture, GPU Rendering]
---

## Week at a Glance

- Implemented **ContextViewMode** with four display modes: Node, Float, Docked, and Window
- Built **boundary anchor rendering** — visual indicators for incoming and outgoing cross-context connections
- Created the **dock strip** for managing floating context panels
- Implemented **anchor wire dragging** — drag from an anchor to initiate cross-context wiring
- Added **wire preview rendering** — bright yellow preview line from anchor to cursor during drag
- Built **snap detection** — compatible port matching with visual feedback during wire drag
- Added **gesture handling** for context panels — pan, zoom, and interaction within subgraph views

## What We Built

### Context View System

When a graph contains `ContextNode`s (subgraphs), users need a way to see inside them. The context view system provides four modes:

```rust
pub enum ContextViewMode {
    Node,    // Collapsed: shows as a regular node with boundary ports
    Float,   // Floating panel overlaying the main graph
    Docked,  // Snapped to the dock strip at the bottom
    Window,  // Separate window (planned, framework in place)
}
```

Each mode renders the subgraph's contents with its own camera and viewport. The `GraphOwnerId` enum unifies navigation across contexts:

```rust
pub enum GraphOwnerId {
    Root,
    ContextNode(NodeId),
    ContextWindow(NodeId),
}
```

The `ContextStack` tracks navigation history — drilling into a subgraph pushes onto the stack, backing out pops. This enables breadcrumb-style navigation through deeply nested graphs.

### Boundary Anchors

Boundary anchors are the visual representation of how signals enter and leave a context. When a `ContextNode` has `InPanout` and `OutPanout` boundary nodes, the context view shows corresponding anchors:

- **Incoming anchors** float at the left edge of the context panel, showing where external signals enter
- **Outgoing anchors** appear as draggable node-like widgets on the right edge, with unpacked output ports

Anchors are purely visual — they derive from the core model's boundary nodes but don't exist in the graph structure. They provide interaction points for creating cross-context connections.

### Anchor Wire Dragging

Dragging from an anchor initiates a wire that can connect to compatible ports inside or outside the context:

```rust
pub struct AnchorWireDrag {
    pub source: AnchorSource,
    pub direction: AnchorDirection,
    pub start_pos: Vec2,
    pub current_pos: Vec2,
    pub snap_target: Option<AnchorWireSnapTarget>,
}
```

The drag tracks the cursor position and continuously searches for snap targets. When the cursor is near a compatible port, the wire snaps to it and the port highlights:

```rust
pub struct AnchorWireSnapTarget {
    pub node_id: NodeId,
    pub port_id: PortId,
    pub position: Vec2,
    pub port_direction: PortDirection,
}
```

### Snap Detection

Compatibility checking ensures you can only connect matching ports — an incoming anchor (which provides an output signal) can only snap to an input port, and vice versa. The detection algorithm:

1. Collect all visible ports within snap radius of the cursor
2. Filter by direction compatibility (INPUT↔OUTPUT)
3. Filter by type compatibility (matching `PortType` or `Any`)
4. Select the nearest compatible port

```rust
fn find_snap_target(
    cursor: Vec2,
    anchor_dir: AnchorDirection,
    layout: &LayoutStore,
    snap_radius: f32,
) -> Option<AnchorWireSnapTarget> {
    let required_dir = match anchor_dir {
        AnchorDirection::Incoming => PortDirection::Input,
        AnchorDirection::Outgoing => PortDirection::Output,
    };

    layout.visible_ports()
        .filter(|p| p.direction == required_dir)
        .filter(|p| p.position.distance(cursor) < snap_radius)
        .min_by(|a, b| {
            a.position.distance(cursor)
                .partial_cmp(&b.position.distance(cursor))
                .unwrap()
        })
        .map(|p| AnchorWireSnapTarget { /* ... */ })
}
```

### Wire Preview Rendering

During an anchor drag, a bright yellow bezier curve renders from the anchor's position to the cursor (or snap target). The wire is scissored to the context panel bounds so it doesn't bleed into adjacent panels:

The preview uses the same bezier curve computation as regular edges, but with a distinctive color to indicate "pending connection." When snapped to a target, the wire endpoint jumps to the port center and the target port glows, providing clear visual feedback that releasing will create a connection.

### Dock Strip

The dock strip sits at the bottom of the screen and houses docked context panels. Each docked panel shows a miniature view of the subgraph with its own camera. Clicking a docked panel expands it to float mode; dragging it out detaches it.

The strip renders context labels and a small preview of boundary anchor state — you can see at a glance which contexts have active incoming signals.

## Patterns & Techniques

### State Machine for Drag Interactions

The anchor wire drag follows a state machine pattern: Idle → Dragging → Snapped → Released. Each state transition triggers specific visual feedback:

- **Idle → Dragging:** Wire preview appears, cursor changes
- **Dragging → Snapped:** Wire endpoint snaps to port, port highlights
- **Snapped → Dragging:** Wire detaches from port, highlight clears
- **Dragging/Snapped → Released:** If snapped, create edge; if not, cancel

This prevents the interaction from entering invalid states — you can't create an edge without a valid snap target, and the visual feedback always reflects the current state accurately.

## Considerations

> Boundary anchors are purely a UI concept — they don't exist in the core graph model. The core uses `InPanout` and `OutPanout` nodes for cross-context wiring. The UI maps these to visual anchors for interaction. This keeps the core model clean but means the UI must maintain a derived representation that stays in sync with the core model.

## Validation

Anchor positioning was validated by loading a graph with known boundary nodes and verifying anchor positions match expected locations on the panel edges. Wire drag was tested by initiating drags from both incoming and outgoing anchors and verifying that only compatible ports highlight as snap targets.

The context navigation stack was tested by drilling into three levels of nested subgraphs, verifying the back button returns to the correct parent at each level, and verifying camera state is preserved per context.

## What's Next

- **Wire edge creation** — actually create graph edges when a wire drag completes on a snap target
- **Window mode** for contexts — separate OS windows for side-by-side subgraph editing
- **Selection system** — multi-select, box select, group operations
- **Hierarchical execution in UI** — run the tick engine and visualize signal flow in real-time

## References

- [wgpu Documentation](https://wgpu.rs/)
- [winit Event Loop](https://docs.rs/winit/latest/winit/)
