---
title: "Fake Post 01 - API Gateway Setup"
date: 2026-01-01
project: bazaar
description: "Setting up the API gateway with rate limiting"
tags: [devlog]
languages: [Go, TypeScript]
patterns: [Gateway]
architectures: [Microservices]
draft: false
---

Fake content for testing pagination.

## Code Example

```typescript
// API Gateway configuration
const gateway = new APIGateway({
  rateLimit: 1000,
  timeout: 30000,
  routes: [
    { path: '/api/v1/*', target: 'backend-service' },
    { path: '/auth/*', target: 'auth-service' },
  ]
});

gateway.start();
```
