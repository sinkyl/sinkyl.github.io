---
title: "Building the SpatialNeuron"
date: 2026-01-18
project: spatium
tags: [devlog, weekly]
languages: [Rust]
patterns: [Adaptive Learning, Observer, Builder]
architectures: [Neural Architecture, Spatial Computing]
---

## Week at a Glance

- Built the **SpatialNeuron** — the core computational unit combining spatial memory, activation map, and temporal state
- Implemented the **forward pass** — spatial weight lookup, activation selection, output computation
- Added **local learning** with adaptive learning rates that respond to error magnitude
- Built **temporal state tracking** — 16-feature recurrent state with exponential decay
- Implemented **neuron mitosis** — saturated neurons split into two children, distributing memory regions
- Created the **SpatialInput** type for carrying values with spatial context

## What We Built

### SpatialNeuron

The neuron brings together all the subsystems built in previous weeks:

```rust
pub struct SpatialNeuron {
    pub id: u64,
    pub position: Position3D,
    pub memory: SpatialMemory,
    pub activation_map: ActivationMap,
    pub temporal_state: Vec<f32>,
    pub learning_rate: f32,
    pub config: Config,
}
```

Each neuron has a unique ID, a position in 3D space, its own spatial memory (bit-compressed weights), an activation map (8x8 grid of functions), and a temporal state buffer that carries information across forward passes.

### Forward Pass

The forward pass reads weights from spatial memory at positions determined by the input, applies the spatially-selected activation function, and updates the temporal state:

```rust
impl SpatialNeuron {
    pub fn forward(&mut self, input: &SpatialInput) -> Result<f32, SpatiumError> {
        let mut weighted_sum = 0.0f32;
        let mut weight_count = 0usize;

        for (i, &value) in input.values.iter().enumerate() {
            let pos = Position3D::new(
                input.context.x.wrapping_add(i as u16),
                input.context.y,
                input.context.z,
            );
            if let Some(weight) = self.memory.retrieve_weight(&pos) {
                weighted_sum += value * weight;
                weight_count += 1;
            }
        }

        if weight_count > 0 {
            weighted_sum /= weight_count as f32;
        }

        // Spatially-selected activation
        let activated = self.activation_map
            .activate(weighted_sum, input.pattern_hash);

        // Update temporal state (shift and decay)
        self.update_temporal_state(activated);

        Ok(activated)
    }
}
```

The key detail: weights are retrieved from spatial positions relative to the input's context position. This means the same neuron produces different outputs depending on *where* in space the input originates — spatial context is baked into the computation.

### SpatialInput

Inputs carry both values and spatial metadata:

```rust
pub struct SpatialInput {
    pub values: Vec<f32>,
    pub context: Position3D,
    pub pattern_hash: u64,
}
```

The `context` position determines where in spatial memory to look up weights. The `pattern_hash` determines which activation function to use. Two inputs with the same values but different contexts or hashes can produce different outputs from the same neuron.

### Temporal State

The temporal state provides short-term memory across forward passes:

```rust
fn update_temporal_state(&mut self, current_output: f32) {
    let decay = 0.9f32;
    for i in (1..self.temporal_state.len()).rev() {
        self.temporal_state[i] = self.temporal_state[i - 1] * decay;
    }
    self.temporal_state[0] = current_output;
}
```

It's a 16-element shift register with exponential decay. Element 0 is the current output, element 1 is the previous output scaled by 0.9, element 2 is two steps ago scaled by 0.81, and so on. After 10 steps, the oldest contribution is ~35% of its original magnitude — enough to influence behavior but not dominate.

This enables recurrence without explicit recurrent connections. A neuron's behavior is influenced by its recent history, giving the network temporal awareness.

### Local Learning

Learning uses the error signal to update weights in spatial memory:

```rust
pub fn learn(
    &mut self,
    input: &SpatialInput,
    error: f32,
) -> Result<(), SpatiumError> {
    let error_magnitude = error.abs();

    for (i, &value) in input.values.iter().enumerate() {
        let pos = Position3D::new(
            input.context.x.wrapping_add(i as u16),
            input.context.y,
            input.context.z,
        );
        let delta = self.learning_rate * error * value;
        self.memory.update_weight(&pos, delta)?;
    }

    // Adaptive learning rate
    if error_magnitude > 0.5 {
        self.learning_rate = (self.learning_rate * 1.1).min(0.1);
    } else if error_magnitude < 0.1 {
        self.learning_rate = (self.learning_rate * 0.9).max(0.001);
    }

    Ok(())
}
```

The adaptive learning rate is simple but effective: large errors speed up learning (multiply by 1.1, capped at 0.1), small errors slow it down (multiply by 0.9, floored at 0.001). This prevents oscillation when the neuron is close to a good solution and accelerates escape from poor regions.

### Neuron Mitosis

When a neuron's spatial memory becomes saturated (most regions allocated, little room for new patterns), it splits into two children:

```rust
pub fn should_split(&self) -> bool {
    self.config.dynamic_growth
        && self.memory.stats().saturation > self.config.growth_threshold
}

pub fn split(&self) -> (SpatialNeuron, SpatialNeuron) {
    let mut child_a = SpatialNeuron::new(
        self.id * 2,
        Position3D::new(
            self.position.x.wrapping_sub(1),
            self.position.y,
            self.position.z,
        ),
        self.memory.input_size(),
        self.config.clone(),
    ).unwrap();

    let mut child_b = SpatialNeuron::new(
        self.id * 2 + 1,
        Position3D::new(
            self.position.x.wrapping_add(1),
            self.position.y,
            self.position.z,
        ),
        self.memory.input_size(),
        self.config.clone(),
    ).unwrap();

    // Split memory: child_a gets regions 0-50%, child_b gets 50-100%
    self.memory.split_into(&mut child_a.memory, &mut child_b.memory);
    (child_a, child_b)
}
```

The children inherit half of the parent's memory regions each, get offset positions (so they occupy different spatial locations), and receive new IDs derived from the parent. This is "neuron mitosis" — the network grows organically when individual neurons hit capacity.

## Patterns & Techniques

### Adaptive Learning Without Global State

Traditional adaptive optimizers (Adam, AdaGrad) maintain global state — running averages of gradients and squared gradients. Spatium's approach is purely local: each neuron adjusts its own learning rate based only on the error it observes. This means neurons in different parts of the network can learn at different speeds without any centralized coordination.

The tradeoff: local adaptation can't benefit from cross-neuron gradient statistics. But for Spatium's architecture — where neurons are spatially independent and may not share any parameters — global statistics wouldn't be meaningful anyway.

## Considerations

> Neuron mitosis creates a tree of neurons from a single root. The ID scheme (`id*2`, `id*2+1`) encodes this tree structure — you can trace any neuron's lineage by repeatedly dividing its ID by 2. The limitation: after ~60 generations of splitting, IDs overflow `u64`. In practice, 60 generations means 2^60 neurons (~10^18), which is far beyond any realistic deployment. But the constraint exists and should be documented.

## Validation

Forward pass: create a neuron, store known weights at specific positions, pass an input with those positions as context, verify the output matches hand-computed weighted-sum-through-activation.

Learning convergence: present a neuron with a constant input and a constant target. After 100 learning steps, verify the output is within 0.1 of the target. After 1,000 steps, verify it's within 0.01.

Temporal state: pass 10 sequential inputs through a neuron, inspect the temporal state buffer, verify element 0 is the most recent output and each subsequent element is 0.9x the previous.

Mitosis: create a neuron, fill its memory to 90% saturation, verify `should_split()` returns true. Call `split()`, verify two children are returned with non-overlapping memory regions. Verify combined child memory size approximately equals parent memory size.

## What's Next

- Build **SpatialLayer** — collections of neurons arranged in a 3D grid
- Implement **parallel forward and backward passes** with Rayon
- Create **SpatialNetwork** — multi-layer system with batch training
- Add **network growth** (layer-level mitosis coordination)

## References

- [Local Learning Rules in Neural Networks](https://www.nature.com/articles/s41593-019-0520-2)
- [Rayon: Data Parallelism in Rust](https://docs.rs/rayon/latest/rayon/)
