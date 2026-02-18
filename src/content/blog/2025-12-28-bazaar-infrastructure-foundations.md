---
title: "Cleanup: Infrastructure Foundations"
date: 2025-12-28
project: bazaar
tags: [devlog, weekly]
languages: [C#]
patterns: [Builder, Convention over Configuration, Observer]
architectures: [Microservices, Event-Driven Architecture]
---

## Week at a Glance

- Consolidated microservice bootstrap into a shared `AddEShopDefaults()` builder, cutting per-service setup from 40+ lines to 3
- Set up the full observability stack: Prometheus metrics, Grafana dashboards, and Seq log aggregation
- Refactored event bus configuration for per-tenant exchange isolation
- Standardized health check endpoints across all services
- Removed 200+ lines of duplicated configuration code
- Updated architecture documentation and Aspire orchestration diagrams

## Key Decisions

Before building out the commerce services (Product Catalog, Shopping Cart, Orders), we needed to answer a foundational question: should each new service manage its own infrastructure setup, or should we centralize it?

> **Context:** IdentityService and ApiGateway had evolved independently, each accumulating ~40 lines of identical setup code for logging, health checks, telemetry, and error handling. Small differences had crept in — IdentityService had a newer Serilog sink, ApiGateway had slightly different health check paths.
>
> **Decision:** Centralize all infrastructure setup into a shared `AddEShopDefaults()` extension method in the ServiceDefaults project.
>
> **Rationale:** With three new services about to be built, configuration drift would multiply. A single shared builder guarantees consistency and makes onboarding new services trivial.
>
> **Consequences:** Individual services lose explicit visibility into their middleware stack. We mitigate this with XML documentation and a dedicated "What's Included" section in the infrastructure README.

We also decided to isolate RabbitMQ exchanges per tenant from the start, rather than retrofitting later:

> **Context:** The event bus was using a single shared exchange. As a white-label platform, each store (Luna, Sinan, etc.) needs message isolation.
>
> **Decision:** Configure topic exchanges per store using the `ExchangeName` from tenant configuration.
>
> **Rationale:** Retrofitting exchange isolation after services are publishing events would require coordinated migration and downtime. Doing it now, before commerce events exist, is zero-cost.
>
> **Consequences:** Each store gets its own exchange (e.g., `Luna.events`, `Sinan.events`), providing complete message isolation with no cross-tenant leakage.

## What We Built

### Observability Stack

The monitoring infrastructure came together this week. Prometheus scrapes metrics from all services via the standardized `/metrics` endpoint. Grafana connects to Prometheus with pre-configured dashboards for request rates, error rates, and response latency per service. Seq aggregates structured logs from Serilog across all services, giving us correlated log search with full context.

All three tools are orchestrated through Aspire's `AppHost`, so `dotnet run` brings up the entire stack — no manual Docker commands needed. Prometheus is available at port 9090, Grafana at 3001, and Seq at 5341.

### Health Check Standardization

Every service now exposes three health endpoints via `MapDefaultEndpoints()`:

- `/health` — liveness probe
- `/health/live` — readiness probe
- `/health/ready` — startup probe
- `/metrics` — Prometheus scrape target

The Aspire dashboard automatically discovers these and shows service health status in real-time.

## What We Removed

The big win this week was deleting duplicated code. Each of the four existing services (ApiGateway, IdentityService, EmailWorker, OutboxWorker) had its own copy of:

- Serilog configuration with console + Seq sinks
- OpenTelemetry tracing and metrics registration
- Global exception handling middleware
- Service discovery wiring
- Health check endpoint mapping

That's ~40 lines per service, totaling over 160 lines of nearly-identical code. All of it now lives in `AddEShopDefaults()`. A new service's `Program.cs` starts with three lines:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddEShopDefaults();
// ... just map your endpoints
```

We also cleaned up stale configuration in `appsettings.json` files — removing hardcoded URLs that were replaced by Aspire service discovery months ago but never cleaned up.

## Developer Experience

The shared builder directly impacts how quickly new commerce services can be scaffolded. The `.claude/skills/new-service.md` skill was updated to use the new pattern, so creating a service with proper infrastructure is now a one-command operation.

We also added XML documentation to every extension method in ServiceDefaults, so IntelliSense shows exactly what `AddEShopDefaults()` configures without having to read the source.

## What's Next

- Begin implementing **ProductCatalogService** — the first commerce service
- Adopt the **Result pattern** for type-safe error handling across new services
- Set up **EF Core migrations** infrastructure for commerce databases
- Define the **domain error model** for catalog operations
