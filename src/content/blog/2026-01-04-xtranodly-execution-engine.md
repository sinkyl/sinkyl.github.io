---
title: "Building the Tick Execution Engine"
date: 2026-01-04
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [Topological Sort, Register Transfer Level, Observer]
architectures: [Data-Oriented Design, Hardware Simulation]
---

## Week at a Glance

- Implemented **tick-based execution** with topological ordering of combinational nodes
- Built **Register semantics** — D/Q latch with one-tick delay, Enable, and Enable+Reset variants
- Created the **TickRuntime** arena for signal values during execution
- Added **Input nodes** for injecting external values into the graph at specific ticks
- Implemented **signal propagation** through the combinational subgraph
- Built a working **counter circuit** as the first integration test (accumulator via register feedback)

## What We Built

### Execution Model

The execution engine follows FPGA-inspired semantics. Each tick is a discrete clock cycle:

1. **Commit phase** — register outputs (`Q`) update from their latched input (`D`) values
2. **Propagation phase** — combinational nodes evaluate in topological order
3. **Snapshot phase** — capture all signal values for the history buffer

The key insight is that registers are the only source of temporal delay. Everything else — wires, arithmetic, logic — propagates within the same tick. This makes the execution model deterministic and predictable: given the same inputs and register state, a tick always produces the same outputs.

```rust
pub fn tick_once(&mut self) {
    // Phase 1: Registers commit (D → Q, one tick delay)
    for node in self.graph.nodes_of_kind(NodeKind::Register) {
        let d_value = self.runtime.signal(node.id, port_d);
        self.runtime.set_register(node.id, d_value);
    }

    // Phase 2: Combinational propagation (topological order)
    for &node_id in &self.topo_order {
        let node = self.graph.node(node_id);
        let inputs = self.collect_inputs(node);
        let outputs = node.evaluate(&inputs);
        self.runtime.set_signals(node_id, outputs);
    }
}
```

### Register Variants

Three register types provide increasing control over temporal state:

**Register** — basic D flip-flop. On each tick, `Q` takes the value of `D` from the previous tick. This is the fundamental building block for sequential logic.

**RegisterWithEnable** — adds an `EN` port. When `EN` is true, `Q` latches `D`. When false, `Q` holds its current value. This enables conditional state updates without external muxing.

**RegisterWithEnableReset** — adds `RST` with priority: `RST` > `EN` > hold. When `RST` is true, `Q` resets to default regardless of `EN`. This supports accumulators with reset capability.

```rust
pub enum NodeKind {
    Register(RegisterSpec),
    RegisterWithEnable(RegisterWithEnableSpec),
    RegisterWithEnableReset(RegisterWithEnableResetSpec),
    // ... other kinds
}
```

### Topological Ordering

The execution engine needs to evaluate combinational nodes in dependency order — a node's inputs must be computed before the node itself. We compute a topological sort over the combinational subgraph (excluding edges that cross register boundaries, since those are handled in the commit phase).

The sort runs once at executor construction and is cached. It only needs recomputation if the graph structure changes, which doesn't happen during execution.

```rust
fn topo_order_combinational(g: &Graph) -> Vec<NodeId> {
    // Build adjacency list, skipping temporal edges (register Q → *)
    // Kahn's algorithm: process nodes with zero in-degree first
    // Returns evaluation order for tick propagation
}

fn is_temporal_edge(g: &Graph, e: &Edge) -> bool {
    // An edge leaving a Register's Q port is temporal
    // It carries the *previous* tick's value
    matches!(g.node(e.from_node).kind, NodeKind::Register(_))
        && e.from_port == /* Q port */
}
```

### Signal Propagation

During the propagation phase, each node reads its input signals, evaluates, and writes output signals. The runtime stores signals in a `HashMap<(NodeId, PortId), Value>` for sparse access — most signals are only read by one downstream node.

```rust
fn read_input_value(
    graph: &Graph,
    signals: &HashMap<(NodeId, PortId), Value>,
    node_id: NodeId,
    input_port: PortId,
) -> Option<Value> {
    // Find the edge connecting to this input port
    // Read the source node's output signal
    graph.edges.iter()
        .find(|e| e.to_node == node_id && e.to_port == input_port)
        .and_then(|e| signals.get(&(e.from_node, e.from_port)).cloned())
}
```

## Patterns & Techniques

### Register Transfer Level (RTL) Semantics

The execution model directly mirrors RTL design from digital hardware. In RTL:

- **Registers** are the only stateful elements (flip-flops)
- **Combinational logic** is purely functional (gates, muxes, arithmetic)
- **Timing** is defined by clock edges (our "ticks")

This isn't an arbitrary choice — RTL semantics are well-understood, formally verifiable, and compose cleanly. A graph that simulates correctly at the RTL level will exhibit predictable behavior regardless of graph size or complexity.

The practical benefit: debugging is straightforward. At any tick, you can inspect every signal value and trace exactly how it was computed from register outputs and inputs. There are no hidden intermediate states or race conditions.

### Topological Sort for Execution Order

Kahn's algorithm gives us the evaluation order in O(V + E). The critical detail is classifying edges: temporal edges (those leaving a register's Q port) are excluded from the sort because their values were already committed in the previous phase. Only combinational edges define the dependency graph.

This classification means feedback loops through registers are legal — the topological sort only sees the combinational portion, which must be acyclic (enforced by validation).

## Validation

The counter circuit integration test validates the complete execution pipeline. A `Constant(1)` feeds into an `AddConst` node, whose output connects to a `Register`'s D input. The register's Q output feeds back to the adder. After 5 ticks, the register holds the value 5 — confirming correct tick-by-tick accumulation with register delay.

Additional tests cover: register hold behavior (Enable=false), reset priority over enable, and signal propagation through multi-level combinational chains.

## What's Next

- Implement **time travel** — jump to any previous tick, branching timelines
- Add **checkpoint policy** for efficient state restoration
- Build **snapshot history** with configurable buffer limits
- Design the **input mutation** system for what-if analysis

## References

- [Register Transfer Level (Wikipedia)](https://en.wikipedia.org/wiki/Register-transfer_level)
- [Kahn's Algorithm for Topological Sort](https://en.wikipedia.org/wiki/Topological_sorting#Kahn's_algorithm)
