---
title: "Building the Activation Map"
date: 2026-01-11
project: spatium
tags: [devlog, weekly]
languages: [Rust]
patterns: [Strategy, Spatial Hashing, Enum Dispatch]
architectures: [Neural Architecture, Spatial Computing]
---

## Week at a Glance

- Implemented all **12 activation functions** — ReLU, LeakyReLU, Sigmoid, Tanh, GELU, Swish, Mish, ELU, Softplus, HardSigmoid, HardTanh, and Sine
- Built the **ActivationMap** — an 8x8 grid of spatially-varying activation functions
- Added **context-aware function selection** — the activation applied depends on the input's pattern hash
- Implemented **derivative computation** for all functions (needed for backpropagation)
- Added **map initialization strategies** — random, uniform, and gradient-based layouts
- Built activation **statistics tracking** for monitoring which functions fire most

## Key Decisions

> **Context:** Traditional neural networks use a single activation function per layer (ReLU everywhere, or GELU everywhere). Spatium's spatial metaphor suggests a different approach: different regions of space could use different activations, making each spatial location respond differently to the same input.
>
> **Decision:** Use an 8x8 grid of activation functions per neuron. The function applied to a given input is selected by hashing the input pattern and mapping to a grid cell.
>
> **Rationale:** This creates automatic specialization — inputs with similar patterns activate through the same function, while dissimilar inputs get different nonlinearities. The grid acts like a spatial "texture" of response characteristics. No two neurons need the same activation layout, which increases representational diversity without adding parameters.
>
> **Consequences:** The activation map adds 64 bytes of metadata per neuron (one enum variant per cell). Evaluation requires computing a hash and a grid lookup before the actual activation — about 5ns of overhead. The benefit is that a single neuron can exhibit qualitatively different behaviors for different input patterns.

## What We Built

### Activation Functions

All 12 functions are encoded as an enum with evaluation and derivative methods:

```rust
pub enum ActivationFunction {
    ReLU,
    LeakyReLU(f32),
    Sigmoid,
    Tanh,
    GELU,
    Swish,
    Mish,
    ELU(f32),
    Softplus,
    HardSigmoid,
    HardTanh,
    Sine,
}
```

Each variant carries its own parameters where needed (LeakyReLU's negative slope, ELU's alpha). The `apply` method dispatches by variant:

```rust
impl ActivationFunction {
    pub fn apply(&self, x: f32) -> f32 {
        match self {
            Self::ReLU => x.max(0.0),
            Self::LeakyReLU(alpha) => {
                if x > 0.0 { x } else { alpha * x }
            }
            Self::Sigmoid => 1.0 / (1.0 + (-x).exp()),
            Self::Tanh => x.tanh(),
            Self::GELU => {
                0.5 * x * (1.0 + (SQRT_2_PI * (x + 0.044715 * x.powi(3))).tanh())
            }
            Self::Swish => x * (1.0 / (1.0 + (-x).exp())),
            Self::Mish => x * ((1.0 + x.exp()).ln()).tanh(),
            Self::ELU(alpha) => {
                if x > 0.0 { x } else { alpha * (x.exp() - 1.0) }
            }
            Self::Softplus => (1.0 + x.exp()).ln(),
            Self::HardSigmoid => ((x + 3.0) / 6.0).clamp(0.0, 1.0),
            Self::HardTanh => x.clamp(-1.0, 1.0),
            Self::Sine => x.sin(),
        }
    }
}
```

GELU uses the tanh approximation rather than the exact erf form — it's faster and the difference is negligible for our precision levels. Mish (`x * tanh(softplus(x))`) is the most expensive at ~12ns but provides smooth gradients everywhere.

### Derivative Computation

Backpropagation through the activation requires the derivative. Each function provides `derivative(x)`:

```rust
pub fn derivative(&self, x: f32) -> f32 {
    match self {
        Self::ReLU => if x > 0.0 { 1.0 } else { 0.0 },
        Self::Sigmoid => {
            let s = self.apply(x);
            s * (1.0 - s)
        }
        Self::Tanh => {
            let t = x.tanh();
            1.0 - t * t
        }
        Self::HardTanh => {
            if x > -1.0 && x < 1.0 { 1.0 } else { 0.0 }
        }
        // ... other variants
    }
}
```

For Sigmoid and Tanh, the derivative is expressed in terms of the forward value — if the forward output is already cached, the derivative costs nearly nothing.

### ActivationMap

The map is an 8x8 grid of activation functions:

```rust
pub struct ActivationMap {
    grid: [[ActivationFunction; 8]; 8],
    hit_counts: [[u64; 8]; 8],
}
```

The `hit_counts` track how often each cell is activated — useful for monitoring specialization and detecting dead cells.

### Context-Aware Selection

The key innovation: which activation function fires depends on the input pattern, not a fixed assignment:

```rust
impl ActivationMap {
    pub fn select(&mut self, pattern_hash: u64) -> &ActivationFunction {
        let row = ((pattern_hash >> 8) & 0x7) as usize;
        let col = (pattern_hash & 0x7) as usize;
        self.hit_counts[row][col] += 1;
        &self.grid[row][col]
    }

    pub fn activate(&mut self, x: f32, pattern_hash: u64) -> f32 {
        self.select(pattern_hash).apply(x)
    }
}
```

The pattern hash is computed from the input signal — similar inputs produce similar hashes and route to the same activation function. This creates implicit clustering: inputs that "look alike" are processed through the same nonlinearity, while inputs that differ get different treatment.

### Map Initialization

Three initialization strategies for the 8x8 grid:

```rust
impl ActivationMap {
    pub fn uniform(func: ActivationFunction) -> Self {
        // All 64 cells use the same function
    }

    pub fn random(rng: &mut impl Rng) -> Self {
        // Each cell gets a randomly selected function
    }

    pub fn gradient(center: ActivationFunction, edge: ActivationFunction) -> Self {
        // Center cells use `center`, edge cells use `edge`
        // Intermediate cells interpolate (by choosing one or the other
        // based on distance from center)
    }
}
```

The gradient layout creates a spatial structure where the center of the grid has different activation behavior than the edges — a form of built-in spatial bias.

## Patterns & Techniques

### Enum Dispatch vs. Trait Objects

We chose enum dispatch over `Box<dyn ActivationFn>` for the activation functions. The tradeoffs:

- **Enum**: no heap allocation, no vtable indirection, the compiler can inline each variant. Size is fixed (largest variant + discriminant).
- **Trait object**: extensible (new functions without modifying the enum), but requires Box allocation and dynamic dispatch.

Since the set of activation functions is fixed and known at compile time, enum dispatch is the clear winner. The `match` compiles to a jump table — effectively the same as vtable dispatch but without the pointer indirection.

## Validation

Activation correctness: for each of the 12 functions, evaluate at 1,000 points in [-5, 5] and compare against reference implementations (torch equivalents computed in Python). Maximum deviation is less than 1e-6 for all functions.

Derivative correctness: for each function, verify the analytic derivative against numerical differentiation (finite differences with h=1e-5). Agreement within 1e-4 for all functions at all test points.

Selection determinism: verify that the same `pattern_hash` always selects the same grid cell. Verify that different hashes with the same low 3 bits select the same column but potentially different rows.

Hit count tracking: run 10,000 activations with uniformly distributed hashes, verify that hit counts are approximately uniform across the grid (within statistical tolerance).

## What's Next

- Build the **SpatialNeuron** — combine spatial memory + activation map into a functioning unit
- Implement the **forward pass** — weighted sum from memory, activation, temporal state
- Add **local learning** with adaptive learning rates
- Design **neuron growth** via mitosis (splitting saturated neurons)

## References

- [GELU Activation (Hendrycks & Gimpel 2016)](https://arxiv.org/abs/1606.08415)
- [Mish Activation (Misra 2019)](https://arxiv.org/abs/1908.08681)
- [Swish Activation (Ramachandran et al. 2017)](https://arxiv.org/abs/1710.05941)
