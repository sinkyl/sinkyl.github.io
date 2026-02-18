---
title: "Architecture: Graph Model & Validation"
date: 2025-12-28
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [Arena, Type-Driven Design, Builder]
architectures: [Data-Oriented Design, Component Architecture]
---

## Week at a Glance

- Established the core **graph data model** — nodes, ports, edges, and stable ID types
- Implemented a **typed value system** with six variants (Unit, Bool, I64, F64, String, Bytes)
- Built the **port system** with direction and type enforcement
- Created the **validation layer** — duplicate input rejection, combinational cycle detection
- Introduced `ValidatedGraph` as a compile-time correctness boundary
- Designed the initial **node kind taxonomy**: Constant, PassThrough, Input, Register, AddConst

## Key Decisions

The first week was almost entirely about foundational architecture choices. Two decisions shape everything that follows.

> **Context:** Graph frameworks typically use either pointer-based adjacency lists or index-based flat arrays. Pointer-based graphs are natural in C++ but fight Rust's ownership model. Index-based arrays risk stale references when nodes are deleted.
>
> **Decision:** ID-based arena storage with HashMap backing.
>
> **Rationale:** Every entity (Node, Port, Edge, Graph) gets a unique numeric ID that is never reused. All references are by ID, all lookups are O(1) via HashMap. This eliminates lifetime issues entirely — IDs are just integers, freely copyable, serializable, and safe across thread boundaries.
>
> **Consequences:** Slightly more verbose than direct references (`graph.nodes[&node_id]` instead of `node.inputs[0]`), but we gain serialization for free, enable undo/redo via command replay, and keep the door open for distributed execution.

The second decision was how to enforce graph correctness:

> **Context:** An invalid graph (cycles in combinational logic, duplicate connections to an input port) should be impossible to execute. We could validate at execution time and return errors, or enforce validity structurally.
>
> **Decision:** Introduce `ValidatedGraph<'a>` as a newtype wrapper. The executor only accepts `ValidatedGraph`, and the only way to construct one is through the validation functions.
>
> **Rationale:** This makes invalid graphs unrepresentable at the type level. The executor doesn't need any error handling for structural issues — if it has a `ValidatedGraph`, the graph is guaranteed valid.
>
> **Consequences:** Graph mutations require re-validation. This is acceptable because mutations happen at authoring time (infrequent), not execution time (tight loop).

## What We Built

### Graph Data Model

The core graph is a flat structure — no nested ownership, no reference counting:

```rust
pub struct Graph {
    pub id: GraphId,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

pub struct Node {
    pub id: NodeId,
    pub inputs: Vec<Port>,
    pub outputs: Vec<Port>,
    pub kind: NodeKind,
}

pub struct Edge {
    pub from_node: NodeId,
    pub from_port: PortId,
    pub to_node: NodeId,
    pub to_port: PortId,
}
```

Edges are always combinational (direct). There are no "delayed edges" — sequential behavior comes entirely from Register nodes. This is a deliberate FPGA-inspired design choice: wires carry signals instantly, flip-flops introduce timing.

### Value System

The `Value` enum covers the fundamental types needed for visual computation:

```rust
pub enum Value {
    Unit,
    Bool(bool),
    I64(i64),
    F64(f64),
    String(String),
    Bytes(Vec<u8>),
}
```

Each value has a corresponding `ValueKind` for type checking without carrying data. Ports declare their `PortType` (which maps to `ValueKind` or `Any` for polymorphic ports), and the validation layer verifies type compatibility on every edge.

### Validation Layer

Validation runs two passes:

1. **Duplicate input rejection** — each input port may connect to at most one source. Multiple outputs can fan out, but inputs are single-source.
2. **Combinational cycle detection** — DFS through the combinational subgraph (edges that don't cross register boundaries). Cycles through registers are fine — that's how feedback loops work.

```rust
pub struct ValidatedGraph<'a>(&'a Graph);

pub fn validate(graph: &Graph) -> Result<ValidatedGraph<'_>, GraphError> {
    validate_no_duplicate_inputs(graph)?;
    validate_no_combinational_cycles(graph)?;
    Ok(ValidatedGraph(graph))
}
```

The `ValidatedGraph` wrapper is a zero-cost abstraction — it's a newtype with no runtime overhead. But it provides a compile-time guarantee that the graph has passed all checks.

## Patterns & Techniques

### Type-Driven Design in Rust

The `ValidatedGraph` pattern is a specific application of the "parse, don't validate" principle. Instead of returning a `bool` from validation, we return a new type that carries the proof of validity. Downstream code that needs a validated graph simply takes `ValidatedGraph<'a>` as its parameter — the type system enforces the precondition.

This pattern appears throughout the codebase: `NodeId` isn't `u32`, it's a distinct type. `PortDirection::Input` isn't a string, it's an enum variant. The goal is to make invalid states unrepresentable and let the compiler catch errors that would otherwise be runtime bugs.

### Arena Storage with Stable IDs

Every entity gets a monotonically increasing ID. Deletion doesn't compact arrays or reuse IDs. This means:

- **Serialization is trivial** — IDs are just numbers
- **Undo/redo is natural** — replay commands that reference IDs
- **Debugging is clear** — "Node 42" always means the same node
- **Distributed execution is possible** — IDs are globally meaningful

The tradeoff is memory fragmentation after many deletions, but for graph sizes we're targeting (hundreds to low thousands of nodes), this is negligible.

## Validation

Unit tests cover the validation layer: a graph with two edges into the same input port produces `GraphError::DuplicateInput`. A graph with a combinational cycle (A → B → C → A, no registers) produces `GraphError::CombinationalCycle`. A graph with a feedback loop through a register (A → Reg → A) passes validation because the register breaks the combinational path.

## What's Next

- Implement the **tick-based execution engine** — topological ordering and signal propagation
- Add **Register semantics** — D/Q with one-tick delay
- Build the **runtime state arena** for signal values during execution
- Add **Input nodes** for external data injection

## References

- [Parse, Don't Validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
- [Data-Oriented Design in Rust](https://rust-unofficial.github.io/patterns/idioms/priv-extend.html)
