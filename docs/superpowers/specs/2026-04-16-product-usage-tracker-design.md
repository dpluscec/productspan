# Product Usage Tracker — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

A mobile app for Android 14 that tracks how long consumable products last (e.g., a bottle of shampoo). Users add products, open instances when they start using them, close instances when the product runs out, and view statistics on usage duration and cost.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React Native with TypeScript |
| Runtime/tooling | Expo (managed workflow) |
| Database | SQLite via `expo-sqlite` |
| Navigation | React Navigation — bottom tabs + stack navigators |
| State management | React Context + `useReducer` for global state; local state for forms |
| Camera / gallery | `expo-image-picker` |
| File export/share | `expo-file-system` + `expo-sharing` |
| Build | Expo EAS Build → standalone APK, min Android 12 (API 31), target Android 14 (API 34) |

---

## Project Structure

```
src/
  components/       # Reusable UI components
  screens/          # One file per screen
  db/               # SQLite schema, migrations, query helpers
  context/          # Global state (categories, package units, settings)
  hooks/            # Custom hooks: useProducts, useInstances, useStats, etc.
  utils/            # Stats calculations, date helpers, export/import logic
```

---

## Data Model

### `categories`

| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | Seeded: "Cosmetics", "Food" |

### `package_units`

| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | Seeded: "g", "ml", "oz", "kg", "L", "pcs" |

### `products`

| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | |
| category_id | INTEGER FK | references categories |
| photo_uri | TEXT | nullable; local file path |
| package_amount | REAL | nullable |
| package_unit_id | INTEGER FK | nullable; references package_units |
| base_price | REAL | nullable |

### `product_instances`

| field | type | notes |
|---|---|---|
| id | INTEGER PK | |
| product_id | INTEGER FK | references products |
| started_at | TEXT | ISO 8601 date |
| ended_at | TEXT | nullable; ISO 8601 date |
| price | REAL | nullable; overrides product base_price when set |

- `ended_at = null` → instance is active (visible by default)
- `ended_at` set → instance is completed (hidden by default, revealed via toggle)
- Multiple instances per product can be active simultaneously
- Effective price = `instance.price ?? product.base_price`

---

## Screens & Navigation

### Bottom Tab Bar

- **Home** — product grid
- **Settings** — categories, package units, data management

### Home Stack

#### 1. Product Grid Screen
- 2-column grid of product cards
- Each card shows: photo (or placeholder), name, category, count of active instances
- FAB (+) opens Add Product screen

#### 2. Add / Edit Product Screen
- Fields: name (text), category (picker), photo (camera / gallery / skip → placeholder), package amount (numeric input), package unit (dropdown from package_units table), base price (numeric input)
- Accessed from FAB (add) or product card long-press / edit button (edit)

#### 3. Product Detail Screen
Two tabs:

**Instances Tab**
- List of active instances, each showing: start date, effective price, "Stop" button
- "Show completed" toggle — reveals finished instances; completed instances show start date, end date, duration, effective price, and an Edit button
- "Add Instance" button — opens inline or modal form: start date (defaults to today, editable via date picker), price (defaults to base price, editable)

**Stats Tab**
- **Day | Month | Year** segmented control in tab header; defaults to Month, ephemeral (not persisted)
- Metrics shown (with availability conditions):

| Metric | Condition |
|---|---|
| Total instances used | Always (if any completed instances) |
| Average duration | Always (if any completed instances) |
| Min duration | Always (if any completed instances) |
| Max duration | Always (if any completed instances) |
| Total amount used | Package amount + unit set on product |
| Total expense | At least one completed instance with a price |
| Price per day/month/year | Price data exists |
| Unit per day/month/year | Package amount + unit set on product |

All stats derived from **completed instances only** (active instances excluded).

### Settings Screen

#### Categories
- List of all categories
- Add new category (text input)
- Rename existing category
- Delete category — guarded: if any products use it, prompt user to reassign or cancel

#### Package Units
- List of all package units
- Add new unit (text input)
- Rename existing unit
- Delete unit — guarded: if any products reference it, prompt user to reassign or cancel

#### Data
- **Export** — serialises all data to JSON, opens Android share sheet
- **Import** — opens file picker for a `.json` file; validates structure; prompts user: **Merge** (add imported items alongside existing) or **Replace** (wipe and restore from file)

---

## Stats Calculations

All calculations operate on completed instances (`ended_at IS NOT NULL`).

```
duration_days(instance) = ended_at - started_at (in days)
average_duration = mean(duration_days) across all completed instances
effective_price(instance) = instance.price ?? product.base_price

total_instances_used = COUNT(completed instances)
average_duration_days = AVG(duration_days)
min_duration_days = MIN(duration_days)
max_duration_days = MAX(duration_days)
total_amount_used = total_instances_used × product.package_amount
total_expense = SUM(effective_price) for completed instances with a price

-- Rate scaling by selected period (D=1, M=30.44, Y=365)
price_per_period = (period_days / average_duration_days) × AVG(effective_price)
unit_per_period = (package_amount / average_duration_days) × period_days
```

---

## Export / Import JSON Format

```json
{
  "version": 1,
  "exported_at": "2026-04-16T10:00:00Z",
  "categories": [...],
  "package_units": [...],
  "products": [...],
  "product_instances": [...]
}
```

Import validates the `version` field before processing. Unknown fields are ignored.

---

## Error Handling

- Delete guards (categories, package units): modal prompt if referenced by existing products
- Import: if file fails validation, show error message and abort — do not modify existing data
- Photo capture: if permission denied, show explanation and link to app settings
- All database operations wrapped in try/catch; errors surfaced as user-visible toasts

---

## Out of Scope

- Cloud sync or multi-device support
- Push notifications or reminders
- Barcode scanning for product lookup
- iOS support (Android only, API 31–34)
