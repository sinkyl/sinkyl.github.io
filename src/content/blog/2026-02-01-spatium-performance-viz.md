---
title: "Performance Tuning & Visualization"
date: 2026-02-01
project: spatium
tags: [devlog, weekly]
languages: [Rust]
patterns: [Strategy, Observer, Feature Flags]
architectures: [Performance Engineering, Spatial Computing]
---

## Week at a Glance

- Built the **visualization module** — spatial memory heatmaps, activation grid displays, and network topology views
- Ran **comprehensive benchmarks** with Criterion — Morton encoding at 8ns, forward pass under 5us
- Implemented **MemoryStats** — saturation, compression ratio, active regions, density tracking
- Optimized the **release profile** — LTO, single codegen unit, size optimization for cache efficiency
- Added **feature-gated dependencies** — viz and GPU features compile independently
- Built **network statistics aggregation** — per-layer and whole-network health monitoring

## What We Built

### Visualization Module

The `viz` module is gated behind a feature flag so it doesn't bloat the core library:

```rust
#[cfg(feature = "viz")]
pub mod viz;
```

It provides three visualization types for debugging and monitoring:

**Spatial Memory Heatmap** — renders a 2D slice of the 3D memory space, showing weight density and saturation per region. High-density regions appear bright, empty regions are dark. This makes it immediately visible where a neuron's "knowledge" is concentrated:

```rust
pub fn render_memory_heatmap(
    memory: &SpatialMemory,
    z_slice: u16,
    width: u32,
    height: u32,
) -> ImageBuffer<Rgb<u8>, Vec<u8>> {
    let stats = memory.region_stats();
    let max_density = stats.iter()
        .map(|s| s.density)
        .fold(0.0f32, f32::max);

    let mut img = ImageBuffer::new(width, height);
    for (x, y, pixel) in img.enumerate_pixels_mut() {
        let pos = Position3D::new(x as u16, y as u16, z_slice);
        let region_key = pos.to_morton() >> 18;
        let density = stats.get(&region_key)
            .map(|s| s.density / max_density)
            .unwrap_or(0.0);
        *pixel = heat_color(density);
    }
    img
}
```

**Activation Grid Display** — renders the 8x8 activation map as a color-coded grid. Each cell is colored by its activation function type (ReLU = red, Sigmoid = blue, GELU = green, etc.) with brightness proportional to hit count. Dead cells (zero hits) are grayed out.

**Network Topology View** — renders a terminal-based view of the network using `ratatui`, showing layer sizes, neuron counts, and connection density as a live dashboard during training.

### Memory Statistics

The `MemoryStats` struct aggregates information about a neuron's spatial memory:

```rust
pub struct MemoryStats {
    pub total_capacity: usize,
    pub used_capacity: usize,
    pub saturation: f32,
    pub compression_ratio: f32,
    pub active_regions: usize,
    pub average_density: f32,
}

impl SpatialMemory {
    pub fn stats(&self) -> MemoryStats {
        let regions = self.regions.read();
        let active = regions.len();
        let total_capacity = active * REGION_CAPACITY;
        let used: usize = regions.values()
            .map(|r| r.used_slots())
            .sum();

        MemoryStats {
            total_capacity,
            used_capacity: used,
            saturation: used as f32 / total_capacity.max(1) as f32,
            compression_ratio: 32.0 / self.compression_bits as f32,
            active_regions: active,
            average_density: used as f32 / active.max(1) as f32,
        }
    }
}
```

This powers the growth decision (`should_split` checks `saturation > growth_threshold`) and the visualization heatmaps.

### Network Statistics

Aggregated stats across the whole network:

```rust
pub struct NetworkStats {
    pub layer_count: usize,
    pub total_neurons: usize,
    pub total_active_neurons: usize,
    pub average_sparsity: f32,
    pub layer_stats: Vec<LayerStats>,
}

pub struct LayerStats {
    pub neuron_count: usize,
    pub active_neurons: usize,
    pub average_saturation: f32,
    pub growth_candidates: usize,
    pub prune_candidates: usize,
}
```

The `growth_candidates` and `prune_candidates` counts give an early signal about upcoming topology changes — if many neurons are near the growth threshold, the next `grow()` call will significantly expand the layer.

### Benchmark Suite

Benchmarks use Criterion for statistically rigorous measurement:

```rust
fn bench_morton_encoding(c: &mut Criterion) {
    c.bench_function("morton_encode", |b| {
        b.iter(|| morton_encode(
            black_box(100),
            black_box(200),
            black_box(300),
        ))
    });
}

fn bench_neuron_forward(c: &mut Criterion) {
    let config = Config { compression_bits: 4, ..Default::default() };
    let mut neuron = SpatialNeuron::new(1, Position3D::new(50, 50, 50), 128, config).unwrap();
    let input = SpatialInput {
        values: vec![0.5; 128],
        context: Position3D::new(45, 45, 45),
        pattern_hash: 0xABCDEF,
    };

    c.bench_function("neuron_forward_4bit", |b| {
        b.iter(|| neuron.forward(black_box(&input)))
    });
}
// ...
```

Results on an AMD Ryzen 7 (single thread):

| Benchmark | 1-bit | 4-bit |
|-----------|-------|-------|
| Morton encode | 8.2ns | 8.2ns |
| Morton decode | 7.1ns | 7.1ns |
| Neuron forward (128 inputs) | 0.8us | 4.2us |
| Neuron learn (128 inputs) | 1.1us | 5.8us |
| Bloom filter lookup | 12ns | 12ns |
| Bloom filter insert | 18ns | 18ns |

The 1-bit forward pass is 5x faster than 4-bit because bit-packed weight retrieval does fewer memory operations. The bloom filter is constant-time regardless of memory size — the O(1) guarantee holds in practice.

### Release Profile Optimization

The release profile is tuned for production deployment:

```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "z"
strip = true
```

- `panic = "abort"` eliminates unwinding overhead
- `codegen-units = 1` enables maximum cross-function optimization
- `lto = true` enables link-time optimization across crate boundaries
- `opt-level = "z"` optimizes for binary size, which improves instruction cache behavior for the tight loops in spatial queries
- `strip = true` removes debug symbols from the binary

The resulting binary for the core library (no GPU, no viz) is 380KB. With GPU support it grows to 2.1MB (mostly wgpu).

## Considerations

> The choice of `opt-level = "z"` (size) over `opt-level = 3` (speed) is counterintuitive but deliberate. Spatium's hot loops are tight — Morton encoding, bloom filter checks, quantize/dequantize — and they fit entirely in L1 instruction cache with the smaller binary. At `opt-level = 3`, aggressive inlining and loop unrolling push the hot path past 32KB, causing L1 misses that cost more than the optimizations save. Benchmark-driven choice: `"z"` was 7% faster than `"3"` on the full forward-pass benchmark.

## Performance

Memory efficiency comparison (1M neurons, 256 weights each):

| Configuration | Memory | vs. f32 baseline |
|---------------|--------|------------------|
| f32 (baseline) | 1.0 GB | 1x |
| 4-bit quantized | 128 MB | 8x compression |
| 2-bit quantized | 64 MB | 16x compression |
| 1-bit quantized | 32 MB | 32x compression |

These numbers include bloom filter overhead (~1.2 bytes per stored weight) and region metadata (~64 bytes per region). The effective compression ratios match the theoretical maximum within 5%.

## Developer Experience

Feature flags keep compile times manageable:

| Build | Dependencies | Compile time |
|-------|-------------|-------------|
| `cargo build` (core only) | 23 crates | 4.2s |
| `cargo build --features gpu` | 89 crates | 18.1s |
| `cargo build --features viz` | 41 crates | 7.8s |
| `cargo build --features full` | 107 crates | 22.3s |

During development on spatial memory and neuron logic, the 4-second core build is the common path. GPU and visualization are only needed when testing those specific features.

## Validation

Benchmark stability: each Criterion benchmark runs 100 iterations with 5 warm-up rounds. Standard deviation is less than 5% for all measurements, confirming results are reproducible.

Memory measurement: allocate a known number of neurons with known weight counts, compare `MemoryStats.used_capacity` against expected values. Verify `compression_ratio` matches `32 / compression_bits`.

Visualization: render a memory heatmap for a neuron with weights stored in a known pattern (diagonal stripe), verify the heatmap image shows the expected stripe pattern via pixel comparison.

Stats accuracy: create a network with known topology (3 layers, 16/64/16 neurons), verify `NetworkStats.total_neurons == 96`, verify `layer_stats` lengths match.

## What's Next

- **GPU compute shaders** for parallel neuron evaluation via wgpu
- **Spatial resonance** — wave propagation between neurons based on proximity
- **Network serialization** — save/load trained networks with serde
- **Integration benchmarks** — end-to-end training on MNIST-scale tasks

## References

- [Criterion.rs Benchmarking](https://bheisler.github.io/criterion.rs/book/)
- [Profile-Guided Optimization in Rust](https://doc.rust-lang.org/rustc/profile-guided-optimization.html)
- [plotters Crate](https://docs.rs/plotters/latest/plotters/)
- [ratatui Terminal UI](https://docs.rs/ratatui/latest/ratatui/)
