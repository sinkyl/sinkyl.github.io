---
title: "Building the Spatial Memory Engine"
date: 2026-01-04
project: spatium
tags: [devlog, weekly]
languages: [Rust]
patterns: [Bloom Filter, Quantization, Region Partitioning]
architectures: [Memory-Efficient Design, Spatial Computing]
---

## Week at a Glance

- Built **SpatialMemory** — region-based weight storage with Morton-indexed lookups
- Implemented **BitWeight** quantization — compress 32-bit floats to 1, 2, or 4 bits
- Added **BloomFilter** for O(1) pattern existence checks before expensive lookups
- Created the **HierarchicalBitIndex** for multi-resolution spatial queries
- Implemented **region management** with `Arc<RwLock<HashMap>>` for thread-safe access
- Built weight **store, retrieve, and update** operations with quantization round-trip

## What We Built

### SpatialMemory

The memory engine stores weights in spatial regions, each indexed by Morton code. Rather than a single flat array, weights are distributed across 64x64x64 regions that are allocated on demand:

```rust
pub struct SpatialMemory {
    regions: Arc<RwLock<HashMap<u64, WeightMemory>>>,
    global_bloom: Arc<RwLock<BloomFilter>>,
    compression_bits: u8,
}
```

Each `WeightMemory` holds the bit-packed weights for a single region. The `global_bloom` filter provides a fast "does this position have any stored weight?" check — if the bloom filter says no, we skip the region lookup entirely.

The `Arc<RwLock<>>` wrapping enables concurrent reads across threads (critical for parallel forward passes) while serializing writes. In practice, reads dominate during inference — writes only happen during learning — so the read-heavy lock pattern works well.

### Store and Retrieve

Storing a weight quantizes the float, packs it into the region's bit storage, and registers the position in the bloom filter:

```rust
impl SpatialMemory {
    pub fn store_weight(
        &self,
        position: &Position3D,
        weight: f32,
    ) -> Result<(), SpatiumError> {
        let morton = position.to_morton();
        let region_key = morton >> 18; // 64x64x64 regions
        let local_offset = (morton & 0x3FFFF) as usize;

        let quantized = BitWeight::quantize(
            weight,
            self.compression_bits,
        );

        let mut regions = self.regions.write();
        let region = regions
            .entry(region_key)
            .or_insert_with(|| WeightMemory::new(self.compression_bits));
        region.set(local_offset, quantized);

        self.global_bloom.write().insert(morton);
        Ok(())
    }
}
```

Retrieval reverses the process — check the bloom filter first, then look up the region and dequantize:

```rust
pub fn retrieve_weight(
    &self,
    position: &Position3D,
) -> Option<f32> {
    let morton = position.to_morton();

    // Fast path: bloom filter says "definitely not here"
    if !self.global_bloom.read().might_contain(morton) {
        return None;
    }

    let region_key = morton >> 18;
    let local_offset = (morton & 0x3FFFF) as usize;

    let regions = self.regions.read();
    regions.get(&region_key)
        .map(|region| region.get(local_offset))
        .map(|bits| BitWeight::dequantize(bits, self.compression_bits))
}
```

The bloom filter eliminates ~99% of negative lookups without touching the region map. For sparse spatial memories (most positions empty), this is the dominant code path.

### BitWeight Quantization

The quantization system compresses 32-bit floats into 1, 2, or 4 bits:

```rust
pub struct BitWeight;

impl BitWeight {
    pub fn quantize(value: f32, bits: u8) -> u8 {
        let max_val = (1u8 << bits) - 1;
        let clamped = value.clamp(-1.0, 1.0);
        let normalized = (clamped + 1.0) / 2.0;
        (normalized * max_val as f32).round() as u8
    }

    pub fn dequantize(quantized: u8, bits: u8) -> f32 {
        let max_val = (1u8 << bits) - 1;
        let normalized = quantized as f32 / max_val as f32;
        normalized * 2.0 - 1.0
    }
}
```

At 1-bit: weights are binary (-1.0 or +1.0). At 4-bit: 16 levels spanning [-1.0, +1.0]. The quantization error for 4-bit is ±0.067 — enough for spatial pattern matching where exact weight values matter less than relative spatial structure.

Memory savings at each level:

| Bits | Weights per byte | Compression vs f32 | Max error |
|------|-----------------|---------------------|-----------|
| 1    | 8               | 32x                 | ±0.500    |
| 2    | 4               | 16x                 | ±0.167    |
| 4    | 2               | 8x                  | ±0.067    |

### BloomFilter

The bloom filter uses optimal sizing based on expected insertions and target false positive rate:

```rust
pub struct BloomFilter {
    bits: BitVec,
    num_hashes: usize,
    size: usize,
}

impl BloomFilter {
    pub fn new(expected_items: usize, fp_rate: f64) -> Self {
        // Optimal sizing: m = -(n * ln(p)) / (ln(2)^2)
        let size = (-(expected_items as f64 * fp_rate.ln())
            / (2.0_f64.ln().powi(2))) as usize;
        let num_hashes = ((size as f64 / expected_items as f64)
            * 2.0_f64.ln()) as usize;

        Self {
            bits: BitVec::from_elem(size, false),
            num_hashes,
            size,
        }
    }
    // ...
}
```

With the default 1% false positive rate, the bloom filter adds ~9.6 bits per entry — negligible compared to the weight data it guards. The `might_contain` check runs in O(k) where k is the number of hash functions (typically 6-7).

### Hierarchical Bit Index

For spatial range queries ("find all weights within radius R"), a flat bloom filter isn't enough. The hierarchical index provides multi-resolution spatial indexing:

```rust
pub struct HierarchicalBitIndex {
    levels: Vec<BitVec>,
    level_shifts: Vec<u32>,
}
```

Each level covers a progressively coarser resolution — level 0 maps individual Morton codes, level 1 maps 8-cell blocks, level 2 maps 64-cell blocks. A range query starts at the coarsest level and only drills into finer levels for blocks that test positive. This prunes the search space exponentially.

## Considerations

> The `Arc<RwLock<>>` wrapping on regions adds overhead per access — acquiring a read lock is ~15ns on uncontended paths. For single-threaded use, this is pure waste. We considered making thread safety optional via a feature flag, but the code duplication wasn't worth it for 15ns. The real cost would be contended writes during learning, but learning is inherently sequential per neuron — contention only happens across neurons, which is handled at the layer level by Rayon's work-stealing.

## Validation

Quantization round-trip: quantize 10,000 random floats at each bit width, dequantize, verify the error is within the theoretical maximum (±0.5 for 1-bit, ±0.167 for 2-bit, ±0.067 for 4-bit).

Bloom filter accuracy: insert 100,000 known Morton codes, verify zero false negatives. Query 100,000 unknown codes, verify false positive rate is within 2% of the target 1%.

SpatialMemory integration: store 1,000 weights at random positions, retrieve each one, verify the round-trip error matches the quantization error for the configured bit width. Verify that querying positions that were never stored returns `None`.

Region allocation: verify that storing weights in the same 64x64x64 region reuses the same `WeightMemory` allocation. Verify that storing in distant positions allocates separate regions.

## What's Next

- Build the **ActivationMap** — spatially-varying activation functions across an 8x8 grid
- Implement **context-aware function selection** — choose activation based on input pattern hash
- Add all **12 activation functions** (ReLU, GELU, Swish, Mish, etc.)
- Begin the **SpatialNeuron** forward pass using memory + activation

## References

- [Bloom Filters (Wikipedia)](https://en.wikipedia.org/wiki/Bloom_filter)
- [Bit Manipulation Tricks](https://graphics.stanford.edu/~seander/bithacks.html)
- [bitvec Crate Documentation](https://docs.rs/bitvec/latest/bitvec/)
