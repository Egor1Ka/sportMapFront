# Ratings System — Design Spec

**Date:** 2026-05-17
**Scope:** Backend (`/Users/egorzozula/Desktop/backendTemplate /src/`) + Frontend (`/Users/egorzozula/Desktop/sportMap/Template-frontend/`)

## Goal

Build a polymorphic 5-star rating subsystem that:
- Lets authenticated users rate **target entities** (one vote per user per target, can be changed).
- In MVP supports `targetType = "playground"` only; the design must extend cleanly to other entities.
- Exposes the average rating and total vote count for any target (publicly), plus the current user's own rating (for authenticated callers).
- Renders a rating widget on the playground detail page.

## Out of scope (MVP)

- Removing a rating (`DELETE`) — the user can change the value but not unrate.
- Half-stars or decimals on input — values are integers 1..5.
- Rating display in the playground list / map markers — only the detail page surfaces ratings.
- Distribution histograms (e.g., "30% gave 5 stars").
- Comments tied to a rating (review-style content) — comments and ratings are independent.
- Anti-abuse (rate limiting, captchas, suspicious-pattern detection).
- Denormalized `averageRating`/`ratingsCount` on `Playground` — aggregate is computed on the fly.
- Automated tests (project has none today). Verification is manual.

## Architecture

### Backend layers (mirror the comments module from 2026-05-16)

```
routes/subroutes/ratingRoutes.js   → registered in routes.js under "/ratings"
controllers/ratingController.js    → thin handlers, uses ok/created/httpResponseError
services/ratingService.js          → validation, registry, upsert, aggregation
repository/rating.js               → pure Mongoose operations
models/Rating.js                   → schema + indexes
dto/ratingDto.js                   → toRatingDTO, toAggregateDTO
```

### Frontend layers

```
services/configs/rating.config.ts  → endpoint configs (getAggregate / upsert)
services/index.ts                  → export ratingApi with defaultInterceptors

components/ratings/StarBar.tsx     → reusable stars (read-only with partial fill, or interactive)
components/ratings/RatingSection.tsx → average display + interactive input + guest CTA

app/[locale]/sports-map/[id]/page.tsx → embeds <RatingSection targetType="playground" targetId={playground.id} /> above <CommentsSection ... />
```

`GET /ratings/me` is reached via a raw `fetch` from inside `RatingSection` (the same pattern the Comments feature uses for `loadMe`), so a logged-out visitor does not get redirected to `/login` by the auth-refresh interceptor when their token is absent.

### Polymorphism approach

Identical to the comments system:

- `Rating` stores `targetType: String` (enum) + `targetId: ObjectId` + `user: ObjectId` + `value: 1..5`.
- The same target-registry pattern: `services/ratingService.js` keeps a small `TARGET_REPOSITORIES` object mapping each `targetType` to its repository for existence checks. New entity types are added by extending the enum and the registry.
- The enum starts as `['playground']`.

## Data model

```js
// models/Rating.js
import mongoose from 'mongoose';

export const RATING_TARGET_TYPES = ['playground'];

const ratingSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: RATING_TARGET_TYPES,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: (v) => Number.isInteger(v),
        message: 'value must be an integer between 1 and 5',
      },
    },
  },
  { timestamps: true }
);

ratingSchema.index({ targetType: 1, targetId: 1, user: 1 }, { unique: true });
ratingSchema.index({ targetType: 1, targetId: 1 });

export const Rating = mongoose.model('Rating', ratingSchema);
```

**Field decisions:**

| Field | Type | Notes |
|---|---|---|
| `targetType` | `String` enum | Whitelisted by `RATING_TARGET_TYPES`. |
| `targetId` | `ObjectId` | Validated and existence-checked in service. |
| `user` | `ObjectId` → User | Set from `req.user.id`. |
| `value` | `Number` 1..5 integer | Enforced both at schema validator and service. |
| `createdAt` / `updatedAt` | `Date` | From `timestamps: true`. |

**Unique index** `(targetType, targetId, user)` enforces one-vote-per-user at the DB level. Upserts in the service rely on this constraint.

## API contract

### `PUT /ratings` (auth required)

Request:
```json
{ "targetType": "playground", "targetId": "<id>", "value": 4 }
```

Validation (service):
1. `targetType` ∈ `RATING_TARGET_TYPES` → else `400`.
2. `targetId` is a valid ObjectId → else `400`.
3. Entity exists via registry lookup → else `404` "Target not found".
4. `value` is an integer between 1 and 5 (inclusive) → else `400`.

Behavior: Mongo `findOneAndUpdate({ targetType, targetId, user }, { $set: { value } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true })`. Atomic — guaranteed not to create duplicates thanks to the unique index.

Response: `200 OK` with rating DTO.

### `GET /ratings/aggregate?targetType=&targetId=` (public)

Query:
- `targetType` (required) — must be whitelisted.
- `targetId` (required) — valid ObjectId.

Aggregation:
```js
Rating.aggregate([
  { $match: { targetType, targetId: new ObjectId(targetId) } },
  { $group: { _id: null, average: { $avg: '$value' }, count: { $sum: 1 } } },
]);
```

Response:
```json
{ "average": 4.25, "count": 8 }
```

If there are no ratings: `{ "average": null, "count": 0 }`.

### `GET /ratings/me?targetType=&targetId=` (auth required)

Query: same as aggregate.

Response: `{ "value": number | null }`.

Backend: `Rating.findOne({ targetType, targetId, user: req.user.id }).lean()` → `value` or `null`.

Returns `401` to unauthenticated callers. The frontend hits this endpoint via raw `fetch` so a 401 produces `null` locally without triggering the global auth-refresh interceptor.

### Error model

All errors are thrown as `DomainError(message, httpStatus.*)` so the existing `httpResponseError` formatter produces the standard `{ error, code?, details? }` payload that the frontend `ApiError` + toast interceptor already handles.

## DTOs

```ts
// ratingDto.js → toRatingDTO(doc)
type RatingDTO = {
  id: string;
  targetType: 'playground';
  targetId: string;
  user: { id: string; name: string | null };
  value: number;             // integer 1..5
  createdAt: string;         // ISO
  updatedAt: string;         // ISO
};

// ratingDto.js → toAggregateDTO({ average, count })
type RatingAggregateDTO = {
  average: number | null;
  count: number;
};
```

`user.name` is populated (the upsert path populates after the write) so consumers don't need extra fetches if a UI surfaces "rated by …".

## Authorization details

`PUT /ratings` and `GET /ratings/me` use the existing `requireAuth` middleware. The JWT payload contains `{ id, email, name }` (no `role`) — that's enough for `user` ownership.

No new middleware is introduced. There is no admin override (anyone with write access is rating *their own* opinion; admin overriding would change the meaning of an average).

## Frontend integration

### API client (`services/configs/rating.config.ts`)

```ts
import { getData, putData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface RatingUser {
  id: string
  name: string | null
}

interface Rating {
  id: string
  targetType: 'playground'
  targetId: string
  user: RatingUser
  value: number
  createdAt: string | null
  updatedAt: string | null
}

interface RatingAggregate {
  average: number | null
  count: number
}

interface UpsertRatingBody {
  targetType: 'playground'
  targetId: string
  value: number
}

const ratingApiConfig = {
  getAggregate: endpoint<void, RatingAggregate>({
    url: () => `/api/ratings/aggregate`,
    method: getData,
    defaultErrorMessage: 'Failed to load rating',
  }),
  upsert: endpoint<UpsertRatingBody, Rating>({
    url: () => `/api/ratings`,
    method: putData,
    defaultErrorMessage: 'Failed to submit rating',
  }),
}

export default ratingApiConfig
export type { Rating, RatingUser, RatingAggregate, UpsertRatingBody }
```

Wired in `services/index.ts`:
```ts
export const ratingApi = createApiMethods(ratingApiConfig, defaultInterceptors)
export type { Rating, RatingUser, RatingAggregate, UpsertRatingBody } from './configs/rating.config'
```

`/api/ratings/me` is **not** part of the typed config — it is called via raw `fetch` from `RatingSection` to avoid the auth-refresh redirect for guests (same pattern as `loadMe` in `CommentsSection`).

### Component: `StarBar`

A reusable star renderer.

Props:
```ts
type StarBarProps = {
  value: number | null            // null renders empty (or "no rating yet")
  max?: number                    // default 5
  size?: 'sm' | 'md' | 'lg'       // default 'md'
  interactive?: boolean           // default false
  onChange?: (value: number) => void
  ariaLabel?: string
}
```

Rendering rules:
- **Read-only mode** (`interactive: false`): renders five star icons. For each star index `i` (1..5), the fill percentage is `clamp((value - (i - 1)), 0, 1) * 100%`. So `value = 4.25` → stars 1-4 fully filled, star 5 at 25%. Implementation: overlay a fully-filled star clipped via inline `width: <pct>%`.
- **Interactive mode** (`interactive: true`): no partial fills. Hover sets a temporary preview; click calls `onChange(i)` and locks the selection. Keyboard support: focusable buttons with arrow keys and Enter/Space (provided by buttons natively).

Uses `lucide-react`'s `Star` icon. CSS via Tailwind utility classes only (`text-yellow-500`, `fill-yellow-500`, `text-muted-foreground`).

### Component: `RatingSection`

Props:
```ts
type RatingSectionProps = {
  targetType: 'playground'
  targetId: string
}
```

State:
- `aggregate: RatingAggregate | null`
- `myValue: number | null`
- `me: { id: string } | null`
- `loading: boolean` (initial fetch)
- `submitting: boolean`

Behavior:
1. On mount, fire three calls in parallel:
   - `ratingApi.getAggregate({ queryParams: { targetType, targetId }, silent: true })`
   - `loadMyRating()` (raw fetch to `/api/ratings/me?...&credentials=include`; treats any non-2xx as `null`)
   - `loadMe()` (raw fetch to `/api/user/profile`; same pattern as Comments)
2. Render:
   - Card with a header "Оцінка".
   - Left block: large numeric average (e.g., `4.3`) + read-only `<StarBar value={aggregate.average} />` + secondary text `(N оцінок)`. Pluralize the noun in Ukrainian (`1 оцінка`, `2-4 оцінки`, `5+ оцінок`).
   - If no ratings yet: show `Поки немає оцінок` placeholder instead of the number.
   - Right block (or below on narrow): if `me` is set, label "Ваша оцінка" + interactive `<StarBar value={myValue} interactive onChange={handleRate} />`. If `me` is null, render a small Empty-style block with a login link.
3. `handleRate(value)`:
   - `setSubmitting(true)`.
   - `ratingApi.upsert({ body: { targetType, targetId, value } })`.
   - On success: `setMyValue(value)`, refetch `ratingApi.getAggregate({ queryParams: { targetType, targetId } })` (no silent — show toast on error), `toast.success('Дякуємо за оцінку!')`.
   - On `ApiError` 401: silently no-op (defaultInterceptors handle refresh + redirect — UI should never reach this branch when `me` is set, but guard anyway).
   - Finally: `setSubmitting(false)`.
4. Interactive stars are disabled while `submitting`.

### Page integration

In `app/[locale]/sports-map/[id]/page.tsx`, inside `<div className="space-y-6 lg:col-span-2">`, place the rating card immediately after `Card "Опис"` and before `Card "Види спорту"`/`Card "Фото"`/`<CommentsSection ... />`:

```tsx
<RatingSection targetType="playground" targetId={playground.id} />
```

This keeps it visible without scrolling on the detail view.

## Edge cases

- **First rating ever for a target** — aggregate goes from `{ average: null, count: 0 }` to `{ average: <value>, count: 1 }`. UI swaps "Поки немає оцінок" placeholder for the numeric block.
- **User updates their rating** — count stays the same, average recomputes. The frontend refetches `getAggregate` after every successful upsert (no optimistic-average shortcut, to avoid drift).
- **Race between two rapid clicks** — the button is disabled while `submitting` is `true`.
- **Target deleted but ratings remain** — orphan ratings continue to exist; cascade-delete is out of scope. The aggregate endpoint still works (returns whatever rows exist).
- **Invalid `value` types** — service rejects with `400` before touching Mongo. Schema validator is a second guard.
- **Concurrent upserts from the same user** (unlikely, but) — Mongo upsert with the unique constraint is safe. Worst case the second one wins.

## Manual verification checklist

Backend:
- `PUT /ratings` without auth → `401`.
- `PUT` with `value: 0` → `400`. `value: 6` → `400`. `value: 3.5` → `400`. `value: "4"` → `400`.
- `PUT` with bad `targetType` → `400`.
- `PUT` with bad `targetId` (`"not-an-id"`) → `400`.
- `PUT` with non-existent `targetId` (real ObjectId, no doc) → `404`.
- Two `PUT` calls from the same user → second one replaces the first; `GET /ratings/aggregate` shows `count = 1`.
- `PUT` from user A with `value: 5`, then `PUT` from user B with `value: 3` → aggregate shows `count = 2`, `average = 4`.
- `GET /ratings/aggregate` with bad params → `400`. For target with zero ratings → `{ average: null, count: 0 }`.
- `GET /ratings/me` without auth → `401`. With auth, no prior vote → `{ value: null }`. With auth and a prior vote → `{ value: <n> }`.

Frontend (on `/sports-map/[id]`):
- Logged-out user: sees average + count + read-only stars, and a login prompt next to "Ваша оцінка".
- Logged-in user with no prior vote: sees empty interactive stars; clicking one submits, the average refreshes, "Ваша оцінка" updates.
- Logged-in user with a prior vote: interactive stars show their selection; clicking a different value updates it.
- The stars correctly render partial fills for averages like `4.3` in read-only mode.
- Submitting fails when the backend is down → red toast via the existing interceptor.
- After rating, `(N оцінок)` updates with correct Ukrainian plural form.

## Implementation order

1. Backend model + repository + DTO.
2. Backend service + controller + routes; wire into `routes.js`.
3. Frontend `rating.config.ts` + export from `services/index.ts`.
4. `StarBar` component.
5. `RatingSection` component.
6. Embed in playground detail page.
7. Manual verification per checklist.
