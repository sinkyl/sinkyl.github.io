---
title: "Architecture: Trace System & Core Modularization"
date: 2026-01-18
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [Schema Versioning, Streaming, Builder]
architectures: [Workspace Architecture, Data-Oriented Design]
---

## Week at a Glance

- Built the **trace export/import** system — portable execution recordings in JSON and CBOR
- Added **schema versioning** (v1) for forward-compatible trace files
- Implemented **graph hashing** (FNV-1a) for replay verification
- Created **streaming trace I/O** for large traces that don't fit in memory
- **Modularized the core crate** — extracted components/, executor/, commands/, validation/
- **Created the UI crate** with proper dependency separation (UI depends on core, never the reverse)

## Key Decisions

Two major architectural decisions this week, both about boundaries.

> **Context:** Traces need to be shareable between different versions of the tool. A trace recorded today must be loadable next month, even if the internal representation changes.
>
> **Decision:** Versioned trace schema with explicit `TRACE_SCHEMA_VERSION` and embedded graph hash.
>
> **Rationale:** The schema version tells the loader which deserialization path to use. The graph hash verifies that the trace was recorded against a compatible graph structure — replaying a trace on a modified graph would produce nonsensical results.
>
> **Consequences:** Adding a new field to traces requires bumping the schema version and writing a migration path. This is intentional friction — trace format changes should be deliberate.

> **Context:** The core crate had grown to ~3,400 lines in a flat structure. The executor alone was 2,200 lines. Modules for graph manipulation, validation, execution, and commands were all siblings in `src/`.
>
> **Decision:** Extract into a multi-module hierarchy: `components/`, `executor/`, `commands/`, `validation/`. Simultaneously, create a separate `ui` crate.
>
> **Rationale:** The UI should never leak into core. Core should be usable as a library for headless execution, testing, and AI-driven graph construction. The crate boundary enforces this at compile time.
>
> **Consequences:** The workspace now has `crates/core` and `crates/ui`. Core has zero knowledge of rendering or windowing. UI depends on core but adds wgpu, winit, and glam.

## What We Built

### Trace Export/Import

A trace captures a range of execution history as a portable recording:

```rust
pub struct Trace {
    pub schema_version: u32,
    pub graph_hash: u64,
    pub timeline_id: TimelineId,
    pub start_tick: u64,
    pub end_tick: u64,
    pub snapshots: Vec<TickSnapshot>,
    pub inputs: BTreeMap<u64, InputFrame>,
}
```

The `graph_hash` is computed using FNV-1a over the graph's structural identity — node IDs, port configurations, edge connections. If the graph changes (node added, edge rewired), the hash changes and the trace is flagged as incompatible.

Traces serialize to both JSON (human-readable, debugging) and CBOR (compact, production). A 10,000-tick trace with 100 signals compresses to ~500KB in CBOR versus ~5MB in JSON.

### Streaming Trace I/O

For traces too large to hold in memory, we added streaming export and import:

```rust
// Streaming export — writes snapshots one at a time
pub fn export_trace_stream<W: Write>(
    &self,
    writer: &mut W,
    from: u64,
    to: u64,
) -> Result<(), TraceError> {
    write_header(writer, self.schema_version, self.graph_hash)?;
    for tick in from..=to {
        let snapshot = self.snapshot_at(tick)?;
        write_snapshot(writer, &snapshot)?;
    }
    write_footer(writer)?;
    Ok(())
}

// Streaming import — replays one snapshot at a time
pub fn import_trace_stream<R: Read>(
    &mut self,
    reader: &mut R,
) -> Result<(), ReplayError> {
    let header = read_header(reader)?;
    verify_compatibility(header.graph_hash, self.graph_hash())?;
    while let Some(snapshot) = read_snapshot(reader)? {
        self.apply_snapshot(snapshot)?;
    }
    Ok(())
}
```

### Graph Hashing

The graph hash function walks the entire graph structure deterministically:

```rust
pub fn graph_hash(graph: &Graph) -> u64 {
    let mut hasher = FnvHasher::default();
    // Hash nodes in ID order (deterministic)
    for node in graph.nodes.iter().sorted_by_key(|n| n.id) {
        hasher.write_u32(node.id.0);
        // Hash ports, kind, etc.
    }
    // Hash edges in sorted order
    for edge in graph.edges.iter().sorted() {
        hasher.write_u32(edge.from_node.0);
        // ... all edge fields
    }
    hasher.finish()
}
```

Sorting by ID ensures the hash is independent of insertion order — two structurally identical graphs always produce the same hash.

## What We Removed

The flat module structure in `src/` was replaced with a proper hierarchy. Files like `src/nodes.rs`, `src/edge.rs`, `src/port.rs` moved into `src/components/`. The 2,200-line executor was split into `executor/checkpoint.rs`, `executor/snapshot.rs`, `executor/timeline.rs`, `executor/trace.rs`, and `executor/trace_stream.rs`, with the main execution logic remaining in the parent module.

The extraction didn't change any public APIs — all types are re-exported through `lib.rs`. The change is purely organizational, but it makes the codebase navigable. Finding the checkpoint implementation now means going to `executor/checkpoint.rs` instead of scrolling through 2,200 lines.

## Developer Experience

The workspace structure enables independent development on core and UI:

```toml
# Root Cargo.toml
[workspace]
members = ["crates/core", "crates/ui"]
# ...

# crates/ui/Cargo.toml
[dependencies]
xtranodly-core = { path = "../core" }
wgpu = "27.0.1"
winit = "0.30.12"
glam = "0.30.9"
# ...
```

`cargo test -p xtranodly-core` runs core tests without compiling the UI. `cargo build -p xtranodly-ui` builds the full application. This separation cuts iteration time significantly when working on execution logic — no GPU shader compilation, no windowing setup.

## Validation

Trace round-trip test: export a 1,000-tick trace to JSON, import into a fresh executor with the same graph, verify every snapshot matches. Same test with CBOR format.

Streaming test: export a 10,000-tick trace via streaming, import via streaming into a separate executor, verify final state matches.

Graph hash test: compute hash, add a node, verify hash changes. Remove the node, verify hash returns to original. Reorder nodes in the Vec, verify hash stays the same (order-independent due to sorting).

Schema compatibility test: attempt to import a trace with a different schema version, verify `ReplayError::IncompatibleSchema`. Attempt import with different graph hash, verify `ReplayError::GraphMismatch`.

## What's Next

- Begin the **UI rendering pipeline** — wgpu setup, camera system, node rendering
- Implement **graph I/O** — load/save graph and layout from disk
- Build the **node view** system for visual positioning
- Design **context navigation** for drilling into subgraphs

## References

- [CBOR (RFC 8949)](https://www.rfc-editor.org/rfc/rfc8949)
- [FNV Hash Function](http://www.isthe.com/chongo/tech/comp/fnv/)
- [Cargo Workspaces](https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html)
