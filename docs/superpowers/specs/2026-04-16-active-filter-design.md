# Active Items Filter — Design Spec

**Date:** 2026-04-16

## Overview

Add a two-checkbox "Activity" filter to the product grid, letting users show only products that currently have at least one active instance ("Has active items") or only products with no active instances ("No active items"). The filter lives in the existing `ProductFilterScreen` and follows the same pattern as the category filter.

## Background

A `product_instance` row is "active" when `ended_at IS NULL`. The query in `src/db/products.ts` already computes `active_instance_count` on every `ProductWithDetails` row, so no database changes are needed.

## State

Add two fields to `AppContext` (`src/context/AppContext.tsx`):

```ts
productFilterActiveKeys: ('active' | 'inactive')[];
setProductFilterActiveKeys: (keys: ('active' | 'inactive')[]) => void;
```

- Empty array → no activity filter applied.
- `'active'` in the array → include products where `active_instance_count > 0`.
- `'inactive'` in the array → include products where `active_instance_count === 0`.
- Both values present → same as empty (all products pass), but consistent with category multi-select behaviour.

Initial value: `[]`.

## ProductFilterScreen (`src/screens/ProductFilterScreen.tsx`)

Add an "Activity" section rendered above the category list. It contains two rows using the identical checkbox style as category rows:

| Row label | Key |
|---|---|
| Has active items | `'active'` |
| No active items | `'inactive'` |

Local state mirrors the pattern: `selectedActiveKeys: Set<'active' | 'inactive'>` initialised from `productFilterActiveKeys`.

The existing `apply` handler calls `setProductFilterActiveKeys([...selectedActiveKeys])` in addition to `setProductFilterCategoryIds`. The existing `clear` handler calls `setProductFilterActiveKeys([])`.

## ProductGridScreen (`src/screens/ProductGridScreen.tsx`)

Update the `filterActive` flag:

```ts
const filterActive =
  productFilterCategoryIds.length > 0 || productFilterActiveKeys.length > 0;
```

Extend the `visibleProducts` memo to apply the active-key filter after the category filter:

```ts
if (productFilterActiveKeys.length > 0) {
  const keySet = new Set(productFilterActiveKeys);
  filtered = filtered.filter((p) =>
    (keySet.has('active') && p.active_instance_count > 0) ||
    (keySet.has('inactive') && p.active_instance_count === 0)
  );
}
```

The filter dot, blue icon colour, and empty-state text already use `filterActive`, so they respond correctly without further changes.

## Files Changed

| File | Change |
|---|---|
| `src/context/AppContext.tsx` | Add `productFilterActiveKeys` state and setter |
| `src/screens/ProductFilterScreen.tsx` | Add Activity section with two checkboxes |
| `src/screens/ProductGridScreen.tsx` | Update `filterActive` and `visibleProducts` |

## Out of Scope

- Persisting filter state across app restarts
- Any changes to the database schema or queries
