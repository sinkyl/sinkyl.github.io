---
title: "Composition Over Enumeration: Collapsing Two Compiler Enums and 30+ Register Variants into Data"
date: 2026-03-30
description: "RegisterKind's 3 fixed variants replaced by an optional-field matrix that composes 30+ configurations. BakeHint and EvalOp unified into arity-based OpTag. Dead compiler infrastructure identified."
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [composition over enumeration, optional-field matrix, arity-based dispatch, data-driven compiler]
architectures: [data-driven compiler, two-phase register latch, layered crate architecture]
---

## Week at a Glance

- Replaced `RegisterKind` enum (3 fixed variants) with an **optional-field RegisterHint matrix** — 5 orthogonal dimensions compose into 30+ register configurations
- Added 3 new builtin register types: **async-reset**, **transparent latch**, **shift register** (total: 54 builtins)
- Unified `BakeHint` (8 variants) and `EvalOp` (10 variants) into an **arity-based OpTag model** — 4 arity variants, 6 eval ops
- Validated the compiler pipeline against actual code — **alias infrastructure is dead**, boundary sync is scaffolding-only

## Key Decisions

### Optional-Field Matrix for Registers

**Context:** `RegisterKind` had three fixed variants — `Basic`, `WithEnable`, `WithEnableReset`. Adding async reset or shift register behavior would mean combinatorial explosion: `WithAsyncReset`, `WithEnableAsyncReset`, `WithEnableResetAsyncReset`... you can see where this goes.

**Decision:** Replace the enum with an optional-field struct on `RegisterHint`:

```rust
// Before: 3 variants, can't compose
enum RegisterKind { Basic, WithEnable, WithEnableReset }

// After: 5 orthogonal dimensions, compose freely
RegisterHint {
    d_port, q_port, initial,
    enable: Option<PortId>,       // gated write
    sync_reset: Option<PortId>,   // synchronous clear
    async_reset: Option<PortId>,  // asynchronous clear
    depth: Option<usize>,         // shift register depth
    transparent: bool,            // latch vs flip-flop
}
```

Five dimensions. Each independent. 30+ useful configurations from one struct. The compiler reads what's present and generates the right `RegisterOp` — no match arms per combination, no special cases.

The three new builtins (async-reset register, transparent latch, shift register) fell out naturally. No compiler changes needed — the existing two-phase latch pipeline already handles any combination of optional fields.

**Tradeoff:** `RegisterOp` now carries more fields per register instance (shift buffer, 3 optional slots). Negligible memory cost for the composability gained.

### Arity-Based OpTag Unification

**Context:** `BakeHint` (compile-time) and `EvalOp` (runtime) were near-duplicates. Both enumerated the same operation categories — `BinaryMath`, `UnaryBitwise`, `BinaryCmp`, etc. — differing only in whether they addressed ports by `PortId` or by `SlotIdx`. Adding a new op category meant touching both enums, the compiler translation, the execution dispatch, and the slot accessors. Five files for one new operation.

**Decision:** Introduce `OpTag` as the shared operation identity, and restructure both enums around arity:

```
Before:
  BakeHint (8 variants) → compiler → EvalOp (10 variants)
  Adding one op category = 5 file changes

After:
  BakeHint (4 arity variants) + OpTag → compiler → EvalOp (6 variants)
  Adding one op category = 1 new OpTag variant
```

`OpTag` is the union of `MathOp | BitwiseOp | CmpOp | CastOp | Select`. `BakeHint` just says "this is a binary op with OpTag X on ports A and B." The compiler maps ports to slots. Execution dispatches on arity, then inner-matches on `OpTag`.

The inner match adds one level of nesting, but the branch predictor handles it identically — benchmarks confirmed no regression at 37ns/counter-tick.

### Dead Infrastructure Found

Validating the compiler pipeline against actual code revealed that `alias_targets` in ConnectionMap is always empty — the entire alias resolution infrastructure is dead code from the pre-ConnectionMap era. Boundary sync modes beyond `Alias` are scaffolding that was never activated. Both marked for removal.

## Architecture Insight

This week's theme was **composition over enumeration** — the same pattern applied twice:

1. **Registers**: enum variants → optional fields (data composes)
2. **Compiler ops**: parallel enums → shared tag + arity dispatch (operations compose)

Both changes reduced code while increasing expressiveness. The register matrix went from 3 configurations to 30+. The op pipeline went from 8+10 variants to 4+6. In both cases, the key insight was the same: when you find yourself naming combinations (`WithEnableReset`, `BinaryBitwise`), you've encoded orthogonal dimensions into a flat list. Pull the dimensions apart, let them compose.

## By the Numbers

| Metric | Value |
|--------|-------|
| Commits | 3 |
| Builtin nodes | 51 → 54 |
| BakeHint variants | 8 → 4 |
| EvalOp variants | 10 → 6 |
| Register configurations | 3 → 30+ |
| Tests | 794 passing |
| Benchmark regression | none (37ns/tick) |