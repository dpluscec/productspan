# Settings and Display Features Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four user-facing features gated by persistent app settings: image display toggle, product list/grid layout switching, category grouping, and quick-start instance creation.

**Architecture:** A new `AppSettingsContext` backed by a SQLite `settings` table provides three boolean settings to all screens. ProductGridScreen switches between four rendering modes based on the combination of `showImages` and `groupByCategory`. InstancesTab respects `quickStartInstance` to skip its modal.

**Tech Stack:** expo-sqlite (already in use), React context, React Native SectionList, FlatList

---

## Settings Infrastructure

### SQLite

New table added in `initDatabase` (`src/db/schema.ts`):

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Default rows inserted with `INSERT OR IGNORE`:

| key | default value |
|-----|--------------|
| `show_images` | `"0"` |
| `group_by_category` | `"1"` |
| `quick_start_instance` | `"1"` |

### Settings DB module (`src/db/settings.ts`)

```ts
export async function getSetting(db, key: string, fallback: string): Promise<string>
export async function setSetting(db, key: string, value: string): Promise<void>
```

### AppSettingsContext (`src/context/AppSettingsContext.tsx`)

```ts
interface AppSettings {
  showImages: boolean;
  groupByCategory: boolean;
  quickStartInstance: boolean;
  setShowImages: (v: boolean) => Promise<void>;
  setGroupByCategory: (v: boolean) => Promise<void>;
  setQuickStartInstance: (v: boolean) => Promise<void>;
}
```

- Loads all three settings from SQLite on mount.
- Each setter calls `setSetting` then updates local state.
- Wrapped around the app in `App.tsx` inside `SQLiteProvider`.
- Exposes `useAppSettings()` hook.

---

## Feature 1: Image Toggle

**`showImages=false` (default):**
- `ProductGridScreen` renders `ProductListRow` components (single-column list).
- `AddEditProductScreen` does not render `PhotoPicker`. Existing `photo_uri` values are preserved in the DB and re-displayed if images are toggled back on.

**`showImages=true`:**
- Current behavior: grid with `ProductCard`, `PhotoPicker` visible in form.

### `ProductListRow` component (`src/components/ProductListRow.tsx`)

A horizontal list row showing:
- Product name (primary text)
- Category name (secondary text, if present)
- Active instance count badge (if > 0)
- Selection overlay (same logic as `ProductCard` — checkmark circle top-right)

Props mirror `ProductCard`: `product`, `onPress`, `onLongPress?`, `selectionMode?`, `selected?`.

---

## Feature 2: Rename "Add Instance" → "Start using"

In `src/components/InstancesTab.tsx`:
- Button label: `"+ Add Instance"` → `"+ Start using"`
- Modal title (add mode): `"Add Instance"` → `"Start using"`
- Modal title (edit mode): `"Edit Instance"` — unchanged

---

## Feature 3: Category Grouping

### Four rendering modes in `ProductGridScreen`

| `showImages` | `groupByCategory` | Renderer | Layout |
|---|---|---|---|
| true | false | FlatList | 2-column grid, `ProductCard` |
| true | true | SectionList | section headers + 2-column grid rows (`ProductCard`) |
| false | false | FlatList | 1-column list, `ProductListRow` |
| false | true | SectionList | section headers + 1-column list rows (`ProductListRow`) |

### Data transformation (grouping on)

```ts
type SectionData = {
  title: string;
  // showImages=true: array of pairs for 2-col grid
  data: [ProductWithDetails, ProductWithDetails | null][];
  // showImages=false: array of single products
  // data: ProductWithDetails[];
};
```

Steps:
1. Filter `visibleProducts` by `productFilterCategoryIds` (existing logic, unchanged).
2. Group by `category_id`. Sort groups by category name alphabetically. Append an "Uncategorized" group last (products where `category_id === null`).
3. Drop any group with zero products (empty categories are not shown).
4. For `showImages=true`: chunk each group's products into pairs.
5. For `showImages=false`: each product is its own row item.

### Section header style

A simple `Text` label with a light gray background bar, e.g.:

```
─── Cosmetics ───────────────
```

Styled: `fontSize: 13, fontWeight: '700', color: '#555', backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6`.

---

## Feature 4: Quick-Start Instance

**`quickStartInstance=true` (default):**

Tapping "Start using" in `InstancesTab` calls `addInstance(db, productId, today, basePrice)` directly — no modal opened. On success, refreshes the instance list and product active count. On error, shows an `Alert`.

**`quickStartInstance=false`:**

Current behavior — modal opens pre-filled with today's date and base price.

The "Edit" action on an existing instance always opens the modal regardless of this setting.

---

## Settings Screen UI

`SettingsScreen` gains a new "Display" section above the existing "Categories" section, with three toggle rows:

| Label | Setting key |
|---|---|
| Show product images | `show_images` |
| Group products by category | `group_by_category` |
| Quick-start "Start using" | `quick_start_instance` |

Each row uses a React Native `Switch` component. Toggling calls the appropriate setter from `AppSettingsContext`.

---

## File Changes Summary

| File | Action |
|---|---|
| `src/db/schema.ts` | Add `settings` table DDL + default inserts |
| `src/db/settings.ts` | Create: `getSetting`, `setSetting` |
| `src/context/AppSettingsContext.tsx` | Create: context, provider, hook |
| `App.tsx` | Wrap with `AppSettingsProvider` |
| `src/components/ProductListRow.tsx` | Create: single-row list item |
| `src/screens/ProductGridScreen.tsx` | Modify: four rendering modes |
| `src/screens/AddEditProductScreen.tsx` | Modify: conditionally hide `PhotoPicker` |
| `src/components/InstancesTab.tsx` | Modify: rename + quick-start logic |
| `src/screens/SettingsScreen.tsx` | Modify: add Display toggles section |
