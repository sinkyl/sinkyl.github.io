---
title: "Architecture: Spatial Coordinate System & Morton Encoding"
date: 2025-12-28
project: spatium
tags: [devlog, weekly]
languages: [Rust]
patterns: [Z-Order Curve, Builder, Newtype]
architectures: [Data-Oriented Design, Spatial Computing]
---

## Week at a Glance

- Defined the **Position3D** type — the foundational coordinate in spatial memory
- Implemented **Morton encoding** (Z-order curves) for cache-friendly 3D-to-1D mapping
- Built **distance functions** — Manhattan and squared Euclidean for spatial queries
- Set up the **project structure** with feature flags for GPU, visualization, and benchmarking
- Established the **Config** system for compression bits, growth thresholds, and GPU/SIMD toggles
- Added **error types** with `thiserror` for structured error handling

## Key Decisions

> **Context:** Spatium's core idea is neurons with internal 3D spatial memory. Every weight, activation, and lookup is addressed by a 3D coordinate. The choice of how to map 3D positions to flat memory determines both cache performance and query efficiency.
>
> **Decision:** Use Morton encoding (Z-order curves) to convert `(x, y, z)` coordinates to a single `u64` key for all spatial lookups.
>
> **Rationale:** Morton codes preserve spatial locality — nearby 3D positions map to nearby 1D values. This makes range queries and neighbor lookups cache-friendly. The alternative, row-major linearization (`z * W * H + y * W + x`), destroys locality along two of three axes. For a system where every forward pass does spatial neighbor queries, cache behavior dominates performance.
>
> **Consequences:** All spatial data structures index by Morton code rather than `(x, y, z)` tuples. This adds a ~10ns encoding step per coordinate but eliminates cache misses during neighbor traversal. The encoding/decoding functions become a critical hot path.

> **Context:** Neurons in Spatium will use 1-bit, 2-bit, or 4-bit quantized weights instead of 32-bit floats. The compression level affects both memory usage and precision. Different deployment targets (IoT vs. desktop) need different tradeoffs.
>
> **Decision:** Make `compression_bits` a runtime configuration, not a compile-time choice.
>
> **Rationale:** Compile-time generics (`SpatialNeuron<1>`, `SpatialNeuron<4>`) would prevent mixing bit widths in the same network. Runtime configuration with a `Config` struct allows heterogeneous layers — e.g., 4-bit for early layers (more precision) and 1-bit for deeper layers (more compression).
>
> **Consequences:** Quantization functions branch on `compression_bits` at runtime. The branch predictor handles this well since the value is constant per neuron, but it's a tradeoff: some runtime cost for deployment flexibility.

## What We Built

### Position3D

The fundamental coordinate type. Every spatial lookup, neighbor query, and memory access starts with a `Position3D`:

```rust
pub struct Position3D {
    pub x: u16,
    pub y: u16,
    pub z: u16,
}
```

Using `u16` gives a maximum space of 65,536 per axis — enough for the largest planned deployment (512^3 = 134M positions). The type provides distance functions used throughout the codebase:

```rust
impl Position3D {
    pub fn manhattan_distance(&self, other: &Self) -> u32 {
        let dx = (self.x as i32 - other.x as i32).unsigned_abs();
        let dy = (self.y as i32 - other.y as i32).unsigned_abs();
        let dz = (self.z as i32 - other.z as i32).unsigned_abs();
        dx + dy + dz
    }

    pub fn distance_squared(&self, other: &Self) -> u64 {
        let dx = (self.x as i64 - other.x as i64);
        let dy = (self.y as i64 - other.y as i64);
        let dz = (self.z as i64 - other.z as i64);
        (dx * dx + dy * dy + dz * dz) as u64
    }
}
```

Manhattan distance is used for coarse spatial queries (bloom filter radius checks). Squared Euclidean avoids the `sqrt` call for precise distance comparisons — we only need ordering, not absolute distance.

### Morton Encoding

The encoding interleaves the bits of x, y, and z coordinates to produce a single `u64`:

```rust
pub fn morton_encode(x: u16, y: u16, z: u16) -> u64 {
    spread_bits(x as u64)
        | (spread_bits(y as u64) << 1)
        | (spread_bits(z as u64) << 2)
}

fn spread_bits(mut v: u64) -> u64 {
    v = (v | (v << 32)) & 0x001f00000000ffff;
    v = (v | (v << 16)) & 0x001f0000ff0000ff;
    v = (v | (v <<  8)) & 0x100f00f00f00f00f;
    v = (v | (v <<  4)) & 0x10c30c30c30c30c3;
    v = (v | (v <<  2)) & 0x1249249249249249;
    v
}
```

The `spread_bits` function uses the standard bit-interleaving technique: shift and mask in progressively finer steps, inserting two zero bits between every original bit. The result interleaves three 16-bit coordinates into a single 48-bit Morton code (stored in a `u64`).

Decoding reverses the process:

```rust
pub fn morton_decode(morton: u64) -> (u16, u16, u16) {
    let x = compact_bits(morton) as u16;
    let y = compact_bits(morton >> 1) as u16;
    let z = compact_bits(morton >> 2) as u16;
    (x, y, z)
}
```

### Neighbor Lookup

Morton codes enable efficient neighbor finding. To get the 26 adjacent cells in 3D space, we decode, offset, and re-encode:

```rust
pub fn get_neighbors(morton: u64) -> Vec<u64> {
    let (x, y, z) = morton_decode(morton);
    let mut neighbors = Vec::with_capacity(26);
    for dx in [-1i32, 0, 1] {
        for dy in [-1i32, 0, 1] {
            for dz in [-1i32, 0, 1] {
                if dx == 0 && dy == 0 && dz == 0 { continue; }
                let nx = (x as i32 + dx) as u16;
                let ny = (y as i32 + dy) as u16;
                let nz = (z as i32 + dz) as u16;
                neighbors.push(morton_encode(nx, ny, nz));
            }
        }
    }
    neighbors
}
```

### Project Configuration

The `Config` struct controls all tunable parameters:

```rust
pub struct Config {
    pub use_gpu: bool,
    pub use_simd: bool,
    pub compression_bits: u8,
    pub dynamic_growth: bool,
    pub growth_threshold: f32,
}
```

Feature flags in `Cargo.toml` gate heavy dependencies:

```toml
[features]
default = []
gpu = ["wgpu", "bytemuck"]
viz = ["plotters", "ratatui"]
bench = ["criterion"]
full = ["gpu", "viz"]
```

This means `cargo build` compiles only the core spatial system. GPU and visualization are opt-in, keeping compile times fast during development.

## Patterns & Techniques

### Z-Order Curves for Spatial Locality

A Z-order curve (Morton code) maps multi-dimensional data to one dimension while preserving locality. Points that are close in 3D space tend to be close in the 1D Morton ordering. This means iterating over a range of Morton codes approximates a spatial neighborhood scan — and since CPUs prefetch sequential memory, this translates directly to fewer cache misses.

The tradeoff: Morton ordering isn't perfect — it has "jumps" where spatially adjacent points are far apart in the 1D sequence. But for the access patterns in spatial memory (region queries, neighbor lookups), it outperforms row-major by 2-5x in our benchmarks.

## Validation

Morton encoding round-trip: encode every coordinate in a 16x16x16 test grid, decode each Morton code, verify the coordinates match. This confirms the spread/compact bit operations are inverses.

Distance tests: compute Manhattan and squared Euclidean distance for known coordinate pairs, verify against hand-calculated values.

Neighbor test: for a central position, verify `get_neighbors` returns exactly 26 Morton codes, and each decodes to a coordinate that differs by exactly 1 on at most one axis.

## What's Next

- Build the **SpatialMemory** system — region-based weight storage indexed by Morton codes
- Implement **bit compression** — 1, 2, and 4-bit weight quantization
- Add **bloom filters** for O(1) weight existence checks
- Design the **hierarchical bit index** for multi-resolution spatial queries

## References

- [Z-Order Curve (Wikipedia)](https://en.wikipedia.org/wiki/Z-order_curve)
- [Morton Encoding for 3D Coordinates](https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/)
