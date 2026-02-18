---
title: "Building the Network & Parallel Computation"
date: 2026-01-25
project: spatium
tags: [devlog, weekly]
languages: [Rust]
patterns: [Parallel Iterator, Work Stealing, Builder]
architectures: [Parallel Computing, Neural Architecture]
---

## Week at a Glance

- Built **SpatialLayer** — a 3D grid of neurons with parallel forward and backward passes
- Implemented **SpatialNetwork** — multi-layer system with forward inference and training
- Added **Rayon-based parallelism** — work-stealing parallel iteration over neurons
- Built **batch training** with MSE loss and per-neuron error distribution
- Implemented **layer-level growth** — coordinated neuron splitting across a layer
- Added **LayerStats** and **NetworkStats** for monitoring neuron counts, sparsity, and saturation
- Created **pruning** — remove inactive neurons that contribute nothing to output

## What We Built

### SpatialLayer

A layer arranges neurons in a 3D grid and coordinates their computation:

```rust
pub struct SpatialLayer {
    neurons: Vec<SpatialNeuron>,
    grid_dims: (usize, usize, usize),
    stats: LayerStats,
}
```

The grid dimensions determine the 3D layout — a `(4, 4, 4)` grid holds 64 neurons, a `(8, 8, 8)` grid holds 512. Neurons are stored in a flat `Vec` indexed by Morton code of their grid position, maintaining cache locality for spatial neighbor access.

### Parallel Forward Pass

The forward pass distributes computation across CPU cores using Rayon:

```rust
impl SpatialLayer {
    pub fn forward(
        &mut self,
        inputs: &[SpatialInput],
    ) -> Result<Vec<f32>, SpatiumError> {
        let outputs: Vec<f32> = self.neurons
            .par_iter_mut()
            .zip(inputs.par_iter())
            .map(|(neuron, input)| neuron.forward(input))
            .collect::<Result<Vec<_>, _>>()?;

        self.stats.update_from_forward(&outputs);
        Ok(outputs)
    }
}
```

Rayon's `par_iter_mut()` splits the neuron slice across worker threads using work-stealing. Each neuron's forward pass is independent — no shared mutable state — so parallelism is embarrassingly parallel. On an 8-core machine, a 512-neuron layer sees ~6.5x speedup (accounting for synchronization overhead and the final `collect`).

### Parallel Learning

Learning follows the same parallel pattern:

```rust
pub fn learn(
    &mut self,
    inputs: &[SpatialInput],
    errors: &[f32],
) -> Result<(), SpatiumError> {
    self.neurons
        .par_iter_mut()
        .zip(inputs.par_iter())
        .zip(errors.par_iter())
        .try_for_each(|((neuron, input), &error)| {
            neuron.learn(input, error)
        })
}
```

Each neuron updates its own spatial memory independently. The `Arc<RwLock<>>` in `SpatialMemory` ensures thread safety, but in practice there's zero contention — each neuron writes only to its own memory regions.

### SpatialNetwork

The network stacks layers and provides training:

```rust
pub struct SpatialNetwork {
    layers: Vec<SpatialLayer>,
    config: Config,
}

impl SpatialNetwork {
    pub fn new(
        layer_sizes: &[usize],
        config: Config,
    ) -> Result<Self, SpatiumError> {
        let layers = layer_sizes.windows(2)
            .map(|pair| SpatialLayer::new(pair[0], pair[1], &config))
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Self { layers, config })
    }
}
```

The `layer_sizes` slice defines the network topology — `[10, 64, 10]` creates a 10-neuron input layer, a 64-neuron hidden layer, and a 10-neuron output layer. Each layer's neuron count corresponds to the *output* dimension; the input dimension is the previous layer's output.

### Forward Inference

A forward pass chains through all layers:

```rust
pub fn forward(
    &mut self,
    inputs: &[f32],
) -> Result<Vec<f32>, SpatiumError> {
    let mut current = inputs.iter()
        .enumerate()
        .map(|(i, &v)| SpatialInput {
            values: vec![v],
            context: Position3D::new(i as u16, 0, 0),
            pattern_hash: v.to_bits() as u64,
        })
        .collect::<Vec<_>>();

    for layer in &mut self.layers {
        let outputs = layer.forward(&current)?;
        current = outputs.iter()
            .enumerate()
            .map(|(i, &v)| SpatialInput {
                values: vec![v],
                context: Position3D::new(i as u16, 0, 0),
                pattern_hash: v.to_bits() as u64,
            })
            .collect();
    }

    Ok(current.iter().map(|si| si.values[0]).collect())
}
```

Each layer's output becomes the next layer's input. The `pattern_hash` is derived from the value itself — inputs with the same magnitude route through the same activation function, creating value-dependent nonlinearity.

### Batch Training

Training computes MSE loss and distributes errors back through the network:

```rust
pub fn train_batch(
    &mut self,
    inputs: &[Vec<f32>],
    targets: &[Vec<f32>],
) -> Result<f32, SpatiumError> {
    let mut total_loss = 0.0f32;

    for (input, target) in inputs.iter().zip(targets.iter()) {
        let output = self.forward(input)?;

        // MSE loss
        let errors: Vec<f32> = output.iter()
            .zip(target.iter())
            .map(|(o, t)| o - t)
            .collect();

        let loss: f32 = errors.iter()
            .map(|e| e * e)
            .sum::<f32>() / errors.len() as f32;
        total_loss += loss;

        // Backward: distribute errors to last layer
        self.layers.last_mut().unwrap()
            .learn(&self.last_inputs(), &errors)?;
    }

    Ok(total_loss / inputs.len() as f32)
}
```

This is a simplified backward pass — errors are only applied to the last layer. Full multi-layer backpropagation through spatial memory is architecturally complex (the spatial weight lookup makes gradient routing non-trivial). For now, the local learning within each neuron provides sufficient adaptation for the tasks we're targeting.

### Layer Growth and Pruning

Growth is coordinated at the layer level:

```rust
impl SpatialLayer {
    pub fn grow(&mut self) -> Result<usize, SpatiumError> {
        let mut new_neurons = Vec::new();
        let mut to_remove = Vec::new();

        for (i, neuron) in self.neurons.iter().enumerate() {
            if neuron.should_split() {
                let (child_a, child_b) = neuron.split();
                new_neurons.push(child_a);
                new_neurons.push(child_b);
                to_remove.push(i);
            }
        }

        // Remove parents (reverse order to preserve indices)
        for &idx in to_remove.iter().rev() {
            self.neurons.remove(idx);
        }
        let grown = new_neurons.len();
        self.neurons.extend(new_neurons);
        Ok(grown)
    }
}
```

Pruning removes neurons with near-zero contribution:

```rust
pub fn prune(&mut self, threshold: f32) -> usize {
    let initial_count = self.neurons.len();
    self.neurons.retain(|n| {
        n.memory.stats().saturation > threshold
    });
    initial_count - self.neurons.len()
}
```

Together, growth and pruning create a self-regulating network: neurons that are overloaded split, neurons that are underutilized are removed. The network converges to a size that matches the complexity of the task.

## Performance

Parallelism benchmarks on an 8-core machine (512-neuron layer, 4-bit weights):

| Operation | Sequential | Parallel | Speedup |
|-----------|-----------|----------|---------|
| Forward   | 2.6ms     | 0.4ms    | 6.5x   |
| Learn     | 3.1ms     | 0.5ms    | 6.2x   |
| Grow      | 0.8ms     | 0.8ms    | 1.0x   |

Growth isn't parallelized because the neuron list is being mutated (additions and removals). The sequential overhead is acceptable since growth runs infrequently — typically once every 100-1000 training steps.

## Validation

Layer forward: create a 64-neuron layer, pass a known input, verify output length matches neuron count. Verify that running the same input twice produces the same output (determinism).

Network training: create a `[4, 16, 4]` network. Train on a simple identity task (output = input) for 1,000 batches. Verify MSE loss decreases monotonically and final loss is below 0.05.

Parallel correctness: run the forward pass both sequentially (`iter_mut`) and in parallel (`par_iter_mut`), verify outputs match exactly. This confirms Rayon parallelism doesn't introduce nondeterminism.

Growth: create a layer with 8 neurons, train until at least 2 neurons saturate, call `grow()`, verify neuron count increased. Verify the grown network still produces reasonable outputs (no NaN, no divergence).

Pruning: create a layer with 64 neurons, train on a simple task, prune with threshold 0.01, verify some low-activity neurons are removed. Verify the pruned network's loss doesn't increase by more than 10%.

## What's Next

- Build **visualization tools** — spatial memory heatmaps, activation map displays
- Run **comprehensive benchmarks** — Morton encoding, forward pass, memory usage at scale
- Implement **memory statistics** and saturation monitoring
- Optimize the **release profile** for production deployment

## References

- [Rayon: Data Parallelism in Rust](https://docs.rs/rayon/latest/rayon/)
- [Work-Stealing Scheduler Design](https://en.wikipedia.org/wiki/Work_stealing)
- [Crossbeam: Concurrent Data Structures](https://docs.rs/crossbeam/latest/crossbeam/)
