# Product Grid Multi-Select & Delete

**Date:** 2026-04-16

## Overview

Long-press any product card to enter selection mode. Select one or more products and delete them via a header trash button. Tapping Cancel or the back button exits selection mode.

## Behaviour

### Entering selection mode
- Long-press any card → selection mode activates, that card is immediately selected.
- The FAB (+ button) hides while selection mode is active.

### In selection mode
- **Tap** a card → toggles its selected state (no navigation).
- **Long-press** additional cards → also toggles selected state.
- Header title shows "X selected" (updates as selection changes).
- Header left button: "Cancel" — exits selection mode, clears selection.
- Header right button: trash icon — triggers delete confirmation.

### Delete confirmation
- Alert: "Delete X products? This cannot be undone."
- Confirm → calls `deleteProduct` for each selected id (existing DB function), reloads the list, exits selection mode.
- Cancel → does nothing.

### Exiting selection mode
- "Cancel" header button pressed.
- Android hardware back button pressed.
- Delete confirmed and completed.

## Component changes

### `ProductCard`
New props:
- `selectionMode: boolean` — when true, renders a circle overlay in the top-right corner.
- `selected: boolean` — filled blue circle with ✓ when true, empty circle when false.
- `onLongPress: () => void` — passed through to `TouchableOpacity`.

Normal `onPress` behaviour is unchanged in the prop signature; `ProductGridScreen` passes a toggling handler when in selection mode and a navigation handler otherwise.

### `ProductGridScreen`
New state:
- `selectionMode: boolean` — whether selection mode is active.
- `selectedIds: Set<number>` — currently selected product ids.

Uses `navigation.setOptions` inside a `useEffect` on `selectionMode` / `selectedIds` to swap header title, left (Cancel), and right (trash) buttons dynamically.

The existing `deleteProduct(db, id)` function is called once per selected id; no new DB code needed.
