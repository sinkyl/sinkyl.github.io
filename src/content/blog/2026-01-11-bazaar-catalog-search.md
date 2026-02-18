---
title: "Building Catalog Search & Filtering"
date: 2026-01-11
project: bazaar
tags: [devlog, weekly]
languages: [C#]
patterns: [Specification, Builder, Cursor Pagination, Cache-Aside]
architectures: [Domain-Driven Design, Microservices]
---

## Week at a Glance

- Implemented **composable product search** using the Specification pattern for type-safe query building
- Added **hierarchical category management** with parent-child relationships and tree traversal
- Built **cursor-based pagination** for efficient large-catalog navigation
- Added product image metadata model (storage integration planned for later)
- Localized all new catalog error messages across four languages (en, ar, fr, tr)
- Performance-tested catalog queries with 10,000 product dataset

## What We Built

### Composable Product Search

The product search system needed to support arbitrary filter combinations — category, price range, attribute matching, availability — without turning the query layer into a mess of conditional SQL fragments. The Specification pattern from Domain-Driven Design was a natural fit.

Each filter criterion is a specification object that encapsulates a single predicate as an `Expression<Func<Product, bool>>`. Specifications compose with `And`, `Or`, and `Not` operators, and EF Core translates the combined expression tree into a single SQL query with proper indexing.

```csharp
public abstract class Specification<T>
{
    public abstract Expression<Func<T, bool>> ToExpression();

    public Specification<T> And(Specification<T> other) => new AndSpecification<T>(this, other);
    public Specification<T> Or(Specification<T> other) => new OrSpecification<T>(this, other);
    public Specification<T> Not() => new NotSpecification<T>(this);
}

public class PriceRangeSpecification(decimal? min, decimal? max) : Specification<Product>
{
    public override Expression<Func<Product, bool>> ToExpression()
        => p => (!min.HasValue || p.Price >= min) && (!max.HasValue || p.Price <= max);
}

public class CategorySpecification(Guid categoryId) : Specification<Product>
{
    public override Expression<Func<Product, bool>> ToExpression()
        => p => p.CategoryId == categoryId || p.Category.ParentId == categoryId;
}
// ...
```

A search request builds a chain of specifications that the repository evaluates as a single LINQ expression. Adding a new filter type is a one-class change — no modifications to existing query logic:

```csharp
public async Task<Result<PagedResult<Product>, CatalogError>> SearchAsync(SearchRequest request)
{
    Specification<Product> spec = new TrueSpecification<Product>();

    if (request.CategoryId.HasValue)
        spec = spec.And(new CategorySpecification(request.CategoryId.Value));
    if (request.MinPrice.HasValue || request.MaxPrice.HasValue)
        spec = spec.And(new PriceRangeSpecification(request.MinPrice, request.MaxPrice));
    if (request.InStockOnly)
        spec = spec.And(new InStockSpecification());

    return await repository.FindAsync(spec, request.Cursor, request.PageSize);
}
```

### Category Tree

Categories support hierarchical relationships with a simple parent-child model. The `CategorySpecification` shown above already handles the common case: filtering by a parent category returns products in that category and all its children. Tree traversal for building navigation menus uses a recursive CTE in the database, exposed through a dedicated `GetCategoryTree()` query.

### Cursor-Based Pagination

Instead of offset-based pagination (`SKIP 100 TAKE 20`), which degrades on large datasets, we implemented cursor-based pagination. The cursor is the last item's sort key, so the database can use an index seek instead of scanning and skipping rows.

```csharp
public async Task<PagedResult<T>> FindAsync(
    Specification<T> spec, string? cursor, int pageSize)
{
    var query = dbSet.Where(spec.ToExpression());

    if (!string.IsNullOrEmpty(cursor))
    {
        var cursorValue = DecodeCursor(cursor);
        query = query.Where(p => p.SortKey > cursorValue);
    }

    var items = await query
        .OrderBy(p => p.SortKey)
        .Take(pageSize + 1) // Fetch one extra to detect "has more"
        .ToListAsync();

    var hasMore = items.Count > pageSize;
    if (hasMore) items.RemoveAt(items.Count - 1);

    return new PagedResult<T>(items, hasMore ? EncodeCursor(items.Last()) : null);
}
```

The `pageSize + 1` trick avoids a separate count query — if we get more items than requested, there's another page.

## Patterns & Techniques

### Specification Pattern for Query Composition

The key insight with the Specification pattern is that it separates **what to filter** from **how to query**. The service layer decides which specifications apply based on the incoming request. The repository just evaluates the combined expression. This gives us:

- **Testability** — Each specification has its own unit test with a simple in-memory collection
- **Composability** — Filter combinations are just `And`/`Or`/`Not` operator chains
- **Type Safety** — The compiler ensures specifications match the entity type
- **Single Responsibility** — Adding "filter by brand" is a new `BrandSpecification` class, nothing else changes

The `And`, `Or`, and `Not` operators work by combining expression trees. The `AndSpecification` merges two expressions with `Expression.AndAlso`, which EF Core translates into a SQL `AND` clause. The database optimizer handles the rest.

## Performance

We loaded 10,000 products into the catalog database and benchmarked the search endpoints. Results with the Specification pattern + cursor pagination:

- **Simple category filter**: 3ms average (index seek on CategoryId)
- **Category + price range**: 5ms average (composite index)
- **Full filter chain (category + price + stock + attributes)**: 12ms average
- **Cursor pagination (page 50 of results)**: same as page 1 — no degradation

For comparison, offset-based pagination on the same dataset showed page 50 at 45ms — nearly 4x slower due to the `SKIP` scan. Cursor-based pagination maintains constant performance regardless of page depth.

## Validation

Each specification has isolated unit tests using in-memory collections. `PriceRangeSpecification` is tested with edge cases: null min (no lower bound), null max (no upper bound), both set, zero price, negative price. `CategorySpecification` tests parent and child category matching.

Integration tests cover combined filter scenarios: search with multiple active filters, empty results, cursor pagination across multiple pages, and boundary conditions (cursor pointing to last item).

## What's Next

- Begin **ShoppingCartService** implementation with Redis-backed sessions
- Add **product image upload** with blob storage integration
- Implement **product variants** (size, color) as a separate entity
- Consider **Elasticsearch** for full-text search if specification-based filtering hits its limits

## References

- [Specification Pattern in DDD](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
- [Cursor-Based Pagination](https://use-the-index-luke.com/no-offset)
