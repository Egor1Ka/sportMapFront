# Staff-first booking on the org list view

**Date:** 2026-04-14
**Scope:** `/app/[locale]/org/[orgSlug]` (the "Список" tab), org booking list view
**Goal:** Make staff and service selection equal peers. The user can start from either side, and each side narrows the other.

## 1. Filter state

Two independent URL params, both nullable:

- `staff` — selected staff id, or `null` ("Все")
- `eventType` — selected service id, or `null`

All four combinations are valid. Behaviour matrix:

| staff | eventType | Calendar | ServiceList |
|-------|-----------|----------|-------------|
| null  | null      | Work hours only, no selectable slots. Centered hint: "Оберіть послугу чи сотрудника". | All org services. |
| ✓     | null      | All free slots of this staff, stepped by `slotStepMin`, no per-service duration. | Services this staff provides. |
| null  | ✓         | Union of slots of every staff who provides the service (columns per staff as today). | All services, selected one highlighted. |
| ✓     | ✓         | Exact slots for this staff × service. | Filtered by staff, selected one highlighted. |

## 2. Layout of the "Список" tab

Add `StaffTabs` above `ServiceList`, same component as on the public `/book/[staffSlug]`:

```
Публічне посилання | Календар | [Список]

[👤 Все] [👤 Ivan] [👤 Olga] [👤 Petr]      ← new row
─────────────────────────────────────
[Тренування двійочка] [Брозковая] …         ← ServiceList (filtered by staff)
─────────────────────────────────────
◀  April 2026  ▶     [month calendar]
```

`StaffTabs` gains an optional `allowAll` prop. When `true` and `behavior==='select-one'`, it renders a leading "Все" tab whose click does `onSelect(null)`.

## 3. `ServiceList` behaviour

Props: `eventTypes`, `staffId: string | null`, `selectedId`, `onSelect`.

- `staffId === null` → show all org services.
- `staffId !== null` → `eventTypes.filter((e) => e.staffIds.includes(staffId))` (exact field name confirmed during implementation).

`eventTypes` must be loaded at org level, not per staff. `OrgCalendarPage` switches from `eventTypeApi.getByStaff(activeStaffId)` to `eventTypeApi.getByOrg(orgId)` (add endpoint if missing; fallback: `Promise.all` per staff and dedupe client-side).

## 4. Calendar under each combination

- **staff ✓, eventType null:** calendar paints work-hour windows for the staff, slots stepped by `slotStepMin`. Each slot is a "free time" handle, clickable (see §5). No per-service duration is drawn.
- **staff null, eventType ✓:** existing multi-staff behaviour. Columns remain per-staff.
- **both ✓:** existing exact-slot behaviour.
- **both null:** render work-hour background only, no clickable slots. Centered hint.

## 5. Slot click without service (popover A1)

When `selectedEventTypeId === null` and `selectedStaffId !== null`, clicking a free slot opens a shadcn `Popover` anchored to the slot. The popover lists services provided by the staff that fit the slot window (duration ≤ remaining time, no booking conflict).

```
┌──────────────────────┐
│ Оберіть послугу:     │
│  • Тренування 60м    │
│  • Брозковая 45м     │
│  • Консультація 30м  │
└──────────────────────┘
```

Click on an item:

1. `setParams({ eventType: id, slot: time })` — both params are set at once.
2. Popover closes.
3. Right `BookingPanel` transitions to `PendingSlot` → normal confirmation flow.

If no service fits the slot, the popover shows a single disabled row "Немає доступних послуг на цей час".

The `staff null, eventType null` case never triggers this path, since those slots are not rendered (§4).

## 6. File-level changes

- `components/booking/ServiceList.tsx` — add `staffId` prop + filter.
- `components/booking/StaffTabs.tsx` — add `allowAll` prop + "Все" tab.
- `components/booking/OrgCalendarPage.tsx` — load `eventTypes` at org level; allow `activeStaffId = null`; thread `staffId` into `ServiceList`; remove the implicit `staffList[0]` fallback when no staff is selected.
- `components/booking/SlotServicePopover.tsx` (new) — popover with the fitting-services list.
- `lib/calendar/*` strategy/core — when a slot is clicked in "staff-only" mode, route through the popover instead of `onSelectSlot` directly.
- `lib/calendar/view-config.ts` — new flag `allowStaffOnlySelection: boolean`, `true` in `ORG_PUBLIC_CONFIG` and `ORG_ADMIN_CONFIG`, `false` elsewhere.

No change to `/book/[staffSlug]` behaviour — `showStaffTabs=false` there, and `allowStaffOnlySelection=false` keeps the popover path off.

## 7. Edge cases

- Staff with no services → `ServiceList` empty state: "У этого сотрудника нет услуг".
- Service no staff provides → calendar empty + message "Немає виконавців".
- Staff is selected, then a service the staff does **not** provide is selected → auto-reset `staff` to `null` (set both URL params in one `setParams`). Rationale: avoids an invisible-but-contradictory state; less annoying than blocking the click.
- Initial load with both params present but inconsistent (`staff` does not provide `eventType`) → same auto-reset applied after data arrives.

## 8. Tests

Unit (Jest / Vitest, whatever the repo uses):

- `ServiceList` filters by `staffId`.
- `ServiceList` renders all services when `staffId === null`.
- `StaffTabs` renders leading "Все" tab when `allowAll`.
- `StaffTabs` does not render "Все" when `allowAll` is false (regression guard for public staff page).
- `SlotServicePopover` lists only services whose `durationMin` ≤ slot window and that the staff provides.

Integration (Playwright if present, otherwise manual checklist):

1. Open org list view, pick a staff → services narrow; month cells show slot availability.
2. Click a free slot with no service picked → popover with services opens.
3. Pick a service in the popover → `BookingPanel` shows `PendingSlot`; confirm works.
4. Pick a service first (no staff) → prior behaviour, all staff columns render.
5. Pick staff, then pick service the staff does not provide → `staff` resets to `null`, calendar widens.
6. Click "Все" in `StaffTabs` → staff resets to `null`, services unfilter.

## 9. Out of scope

- Reworking the public `/book/[staffSlug]` page.
- Changing the backend — no new fields are required; we rely on existing `EventType.staffIds` / equivalent staff-per-service mapping.
- Batch / recurring bookings from the popover (user picks a single slot only).
