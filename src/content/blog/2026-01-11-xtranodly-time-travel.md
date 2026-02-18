---
title: "Building Time Travel & Branching Timelines"
date: 2026-01-11
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [Snapshot, Checkpoint, Command]
architectures: [Event Sourcing, Hardware Simulation]
---

## Week at a Glance

- Implemented **branching timelines** — fork execution at any tick, switch between branches independently
- Built **checkpoint policy** — periodic full-state saves for efficient restoration
- Added **jump-to-tick** — restore any previous tick by finding the nearest checkpoint and replaying forward
- Created the **snapshot history** buffer with configurable limits
- Implemented **input mutation with integrity checking** — change past inputs, invalidate dependent state
- Added **signal inspection** and **register probing** APIs for debugging

## Key Decisions

Time travel was the most architecturally consequential feature this week.

> **Context:** Users need to debug graph execution by rewinding to any previous tick, inspecting signals, and forking "what-if" branches. The naive approach (store every tick's full state) doesn't scale — a graph with 1,000 signals at 10,000 ticks would consume gigabytes.
>
> **Decision:** Checkpoint-based restoration with forward replay. Store full state snapshots periodically (configurable), and restore intermediate ticks by loading the nearest checkpoint then replaying forward.
>
> **Rationale:** This gives O(1) storage per tick (just the delta inputs), O(checkpoint_interval) worst-case restore time, and zero overhead during normal execution. The checkpoint interval and history limit are user-configurable.
>
> **Consequences:** Jumping to a tick far from any checkpoint requires replaying many ticks. In practice, the default policy (checkpoint every 100 ticks, keep last 50) means at most 99 ticks of replay, which is sub-millisecond for typical graph sizes.

> **Context:** When a user changes a past input, all ticks after that point are potentially invalid. We need to decide between eager re-computation (replay everything) and lazy invalidation (mark as stale, recompute on demand).
>
> **Decision:** Lazy invalidation with integrity hashing. Each checkpoint stores an FNV-1a hash of all inputs up to that tick. When inputs change, we drop all checkpoints whose hash no longer matches.
>
> **Rationale:** Eager replay would be prohibitively expensive for graphs with deep history. Lazy invalidation only recomputes when the user actually visits an affected tick. The integrity hash makes staleness detection O(1) per checkpoint.
>
> **Consequences:** Visiting a tick after input mutation may trigger a cascade of replay if all nearby checkpoints were invalidated. This is the correct behavior — the user asked "what if this input was different?" and the answer requires re-execution.

## What We Built

### Timeline System

Each timeline is an independent execution branch with its own history, checkpoints, and inputs:

```rust
pub struct Timeline {
    pub id: TimelineId,
    pub parent: Option<TimelineId>,
    pub fork_tick: u64,
    pub history: VecDeque<TickSnapshot>,
    pub checkpoints: VecDeque<Checkpoint>,
    pub inputs: BTreeMap<u64, InputFrame>,
}
```

Forking creates a new timeline that shares history with its parent up to the fork point, then diverges. The `BTreeMap<u64, InputFrame>` stores per-tick input overrides — only ticks with explicit inputs are stored, keeping memory proportional to the number of input changes rather than the number of ticks.

### Tick Snapshots

Every tick produces a snapshot capturing the complete observable state:

```rust
pub struct TickSnapshot {
    pub tick: u64,
    pub signals: HashMap<(NodeId, PortId), Value>,
    pub registers: Vec<Option<RegisterSnapshot>>,
    pub events: Vec<Event>,
    pub inputs: Option<InputFrame>,
}
```

Snapshots go into a bounded ring buffer. When the buffer is full, the oldest snapshot is dropped. Checkpoints are sparser but more durable — they contain enough state to fully restore the executor at that tick.

### Jump-to-Tick

The restoration algorithm:

1. Find the nearest checkpoint at or before the target tick
2. Restore full executor state from the checkpoint
3. Replay ticks forward from checkpoint to target
4. Each replay tick re-applies inputs from the timeline's input map

```rust
pub fn jump_to_tick(&mut self, target: u64) -> Result<(), JumpError> {
    let checkpoint = self.nearest_checkpoint_before(target)?;
    self.restore_from_checkpoint(checkpoint);
    while self.current_tick < target {
        self.apply_inputs_for_tick(self.current_tick);
        self.tick_once();
    }
    Ok(())
}
```

### Input Mutation

Users can change past inputs to explore alternative execution paths:

```rust
pub fn set_input_value(&mut self, tick: u64, key: InputKey, value: Value) {
    self.active_timeline_mut().inputs
        .entry(tick)
        .or_default()
        .set(key, value);
    self.invalidate_after(tick);
}

pub fn bulk_apply_inputs(&mut self, ops: Vec<InputOp>) -> Option<u64> {
    // Apply multiple input changes, return earliest affected tick
    // Invalidation happens once for the earliest change
}
```

`invalidate_after(tick)` drops all snapshots and checkpoints after the affected tick whose integrity hash no longer matches. The next time the user advances past that tick, execution replays with the new inputs.

## Patterns & Techniques

### Event Sourcing for Execution History

The time travel system is essentially event sourcing applied to graph execution. The "events" are tick executions, and the "state" is the complete set of signal and register values. Checkpoints are periodic state snapshots (like database snapshots), and replay is deterministic re-execution from a known state.

The key property: given a checkpoint and a sequence of inputs, replay always produces identical results. This determinism comes from the RTL execution model — there's no randomness, no scheduling nondeterminism, no external I/O during execution.

### FNV-1a for Integrity Checking

We use FNV-1a hashing (fast, non-cryptographic) to fingerprint the input history up to each checkpoint. When inputs change, we recompute the hash for affected ranges and compare. Mismatches trigger invalidation.

FNV-1a was chosen over SHA-256 for speed — integrity checking runs on every input mutation, and we need it to be negligible. Collision resistance doesn't need to be cryptographic; we're detecting intentional mutations, not adversarial tampering.

## Validation

Timeline tests: fork at tick 50, modify inputs on the fork, advance both timelines independently, verify they diverge. Switch back to the original timeline, verify its state is unaffected.

Jump tests: advance to tick 1,000, jump back to tick 500, verify the snapshot matches the original tick 500 state. Jump forward to tick 750, verify replay from the tick-500 checkpoint produces correct results.

Input mutation tests: set a past input at tick 100, verify checkpoints after tick 100 are invalidated, advance past tick 100, verify execution uses the new input value and produces different results.

## What's Next

- Build the **trace export/import** system — portable execution recordings
- Add **schema versioning** for trace compatibility
- Implement **graph hashing** for replay verification
- Design **hierarchical execution** for subgraph (ContextNode) support

## References

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [FNV Hash](http://www.isthe.com/chongo/tech/comp/fnv/)
