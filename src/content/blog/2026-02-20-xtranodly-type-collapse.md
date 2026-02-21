---
title: "Architecture: The Great Type Collapse"
date: 2026-02-20
project: xtranodly
tags: [devlog, weekly]
languages: [Rust]
patterns: [Factory, Type-name dispatch, Discriminant dispatch, Builder pattern, Denylist filtering, Integration testing]
architectures: [Configuration-driven nodes, Flat arena, GPU-first rendering, Immediate-mode UI]
---

## Week at a Glance

- Collapsed the node type enum from 14 variants down to 3, replacing per-type spec files with configuration-driven factories
- Rewired the entire compilation pipeline to dispatch on a 4-branch hint discriminant instead of 14 enum arms
- Built an island-style dock layout system with icon strips, collapsible panels, and frameless window chrome
- Extracted the binary entry point into a separate crate, keeping the UI layer as a pure library
- Added a declarative UI layout framework backed by a flexbox engine for future panels and forms
- Expanded the integration test suite from ~20 to 67 tests across 7 test modules

## Key Decisions

**Context:** The node type system had grown to 14 enum variants — each with its own spec struct, constructor, spec file, and match arms in the compiler, validator, serializer, and hasher. Adding a new node type meant touching 8+ files and adding arms to every match statement.

**Decision:** Collapse to 3 variants — one for all compute nodes (distinguished by a runtime type-name string), one for all signal routing (with a sub-enum for standard vs portal), and one for organizational containers. Built-in node types are created through centralized factory functions rather than per-type constructors.

**Rationale:** The 14 variants encoded information that belonged in configuration, not in the type system. A constant node and an adder node don't differ structurally — they both have ports, a config map, and an evaluation function. The enum was forcing a type-level distinction where a data-level distinction sufficed. Three variants capture the three genuinely different *structural* roles: compute, route, and contain.

**Consequences:** The compiler now matches on a 4-branch hint discriminant (constant, register, combinational, no-op) instead of 14 node kinds. Adding a new node type means writing one factory function — no enum variants, no spec files, no match arms elsewhere. The tradeoff is that exhaustiveness checking no longer catches missing node types at compile time; type-name strings are runtime values. We accept this because the factory module serves as the single source of truth, and the test suite validates all built-in types.

## What We Built

### Island Dock Layout

The UI gained a professional IDE-style chrome system — a frameless window with an island layout where icon strips run vertically on each side, a title bar spans the top, and a status strip sits at the bottom. Panels for tools like an explorer, structure view, and terminal collapse in and out from the sides and bottom, with the graph canvas filling the remaining space.

The layout engine computes all geometry from window dimensions and panel state, emits GPU-rendered rounded rectangles via the existing SDF shader pipeline, and provides hit testing for icon clicks and title bar buttons (minimize, maximize, close, drag). Everything renders through the same signed-distance-field rect shader used for graph nodes — no separate UI rendering path needed.

```rust
// Illustrative: dock layout computes regions from window size + panel state
fn compute_layout(window_w: f32, window_h: f32, panels: &PanelState) {
    let top = strip(0.0, 0.0, window_w, TOP_HEIGHT);
    let bottom = strip(0.0, window_h - BOTTOM_HEIGHT, window_w, BOTTOM_HEIGHT);

    let left_strip = strip(0.0, top.bottom(), STRIP_W, content_h);
    let right_strip = strip(window_w - STRIP_W, top.bottom(), STRIP_W, content_h);

    // Panels expand inward from the strips when toggled open
    let left_panel = panels.left_open.then(|| inset_from(left_strip, PANEL_W));
    let canvas = remaining_space(left_panel, right_panel, top, bottom);
}
```

The theme system was extended with a comprehensive style struct covering all dock dimensions, colors, spacing, corner radii, and button styling — fully configurable from a single struct with sensible defaults.

### Declarative UI Framework

A lightweight layout framework was added for future use in property panels, forms, and toolbars. It provides a declarative builder API that constructs an element tree, delegates flexbox computation to an embedded layout engine, and emits the same GPU primitives (SDF rects and text glyphs) used everywhere else.

```rust
// Illustrative: declarative element tree for a title bar
fn title_bar(style: &Style) -> Element {
    row()
        .height(38.0)
        .fill_width()
        .background(style.strip_color)
        .align_center()
        .padding_x(12.0)
        .child(label("xtranodly").color(style.title_color))
        .child(spacer().grow())
        .child(button("x").on_click(Action::Close))
}
```

The framework includes text measurement (wrapping the existing glyph atlas for intrinsic sizing), hit testing with front-to-back traversal, and a draw list that collects GPU instances for batch upload. It's not wired into the app yet — it sits ready for the first real consumer, likely a node property editor.

### Crate Separation

The binary entry point was extracted into its own crate, turning the UI layer into a pure library. This is a small structural change but it enforces a clean boundary: the library exposes rendering, layout, and interaction systems; the binary crate owns the event loop and window lifecycle. It also enables future scenarios like headless testing or embedding the UI in a different host.

## What We Removed

Seven per-type spec files were deleted — one each for constants, adders, pass-throughs, inputs, registers (three variants), fanouts, and boundary nodes. Each had its own struct, constructor, and port definitions. All of this is now handled by a single factory module with one function per built-in type.

The old 14-arm match statements throughout the compiler, validator, and hasher were replaced with 3-4 branch dispatches. The net line count is roughly neutral (728 insertions, 677 deletions in the node layer alone), but the *conceptual* surface area shrank dramatically — there are fewer things to understand and fewer places to change when adding a node type.

## Patterns & Techniques

### Configuration-Driven Nodes with Compile Hints

Instead of encoding node behavior in enum variants, each compute node now carries a configuration map (key-value pairs like "value", "initial", "latency") and a compile hint that tells the compiler how to process it. The hint is a simple 4-way discriminant:

- **Constant** — value is pre-initialized, no evaluation needed
- **Register** — has clock/latch semantics, excluded from combinational cycle detection
- **Combinational** — evaluated each tick via its function pointer
- **No-op** — organizational only, skipped during evaluation

This separates *what a node computes* (its evaluation function and config) from *how the compiler handles it* (its compile hint). The compiler no longer needs to know about specific node types — it only needs to know the four processing strategies.

### Denylist Filtering for Context Policies

Context nodes (organizational containers with execution policies) previously filtered child nodes by enum tag alone. With only 3 tags remaining, tag-level filtering lost granularity. The solution: a denylist of type-name strings per context policy. A dataflow context denies register-family types; an FPGA context denies nothing. The tag-level check remains as a belt-and-suspenders guard, with the type-name denylist providing fine-grained control.

## Considerations

> We chose runtime type-name strings over compile-time enum variants, accepting the loss of exhaustiveness checking in exchange for extensibility. Adding a new node type is now a single factory function instead of touching 8+ files. The test suite (67 integration tests) validates all built-in types, compensating for the lost static guarantee.

> We built a flexbox-based UI framework before having a consumer for it. This is a deliberate bet that property panels and forms are coming soon. The dependency is zero-cost until called, and building our own layout math would be significantly more work for worse results. If it turns out unnecessary, removal is clean — it's a single self-contained module with no tendrils into the rest of the codebase.

## Validation

The integration test suite grew from roughly 20 tests to 67, organized across 7 modules:

- **End-to-end tests** (8): Full pipeline from graph construction through compilation and evaluation, covering catalog nodes, custom nodes, context boundaries, and cross-context wiring
- **Command tests** (23): Graph mutation commands including add/remove nodes, edge wiring, context port management, and policy enforcement
- **Register variant tests** (8): All three register kinds (basic, with-enable, with-enable-reset) verified through multi-tick evaluation
- **Relay chain tests** (6): Signal propagation through relay chains, fanout distribution, and portal-based context boundaries
- **Serialization tests** (10): Round-trip serde, hash stability, and post-deserialization hydration of evaluation functions
- **Math and bitwise tests** (12): Catalog node evaluation for arithmetic and bitwise operations

All 67 tests pass against the new 3-variant node model.

## What's Next

- Wire the dock layout's panel areas to actual content — starting with a node property editor
- Build the first real consumer of the declarative UI framework (likely the property panel)
- Add keyboard shortcuts for panel toggling and window management
- Explore context-aware toolbars that change based on the active graph context
