# Ratings System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polymorphic 5-star rating subsystem (backend + frontend) so authenticated users can rate playgrounds (one vote per user, can be changed), and any visitor sees the average rating plus vote count.

**Architecture:** Layered backend (model → repository → service → controller → route + DTO) mirroring the comments module shipped 2026-05-16. Polymorphism via `(targetType, targetId)` pair plus the same `TARGET_REPOSITORIES` registry for existence checks. Unique compound index `(targetType, targetId, user)` enforces one rating per (user, target) at the DB level; service uses atomic Mongo upsert. Frontend uses the existing config-driven API client and a `RatingSection` widget; `GET /ratings/me` is called via a raw `fetch` (same trick as `loadMe` in Comments) so the auth-refresh interceptor doesn't redirect guests.

**Tech Stack:**
- Backend: Node.js (ESM), Express, Mongoose, jsonwebtoken
- Frontend: Next.js 16 App Router, React 19, TypeScript, sonner, shadcn/ui (`base-nova`), lucide-react

**Important repo notes:**
- Backend root has a **trailing space** in the path: `/Users/egorzozula/Desktop/backendTemplate /src/`. Always quote it.
- No automated test framework — verification is **manual via curl + UI**.
- Per user policy: never `git commit` without an explicit human "commit" request. This plan ends each task with a "Ready to commit" checkpoint; do **not** auto-commit.
- The Comments feature exists already (see `services/configs/comment.config.ts`, `components/comments/*`). Match its patterns when in doubt.

---

## File Structure

**Backend (create):**
- `/Users/egorzozula/Desktop/backendTemplate /src/models/Rating.js` — schema + indexes
- `/Users/egorzozula/Desktop/backendTemplate /src/repository/rating.js` — DB ops
- `/Users/egorzozula/Desktop/backendTemplate /src/dto/ratingDto.js` — `toRatingDTO`, `toAggregateDTO`
- `/Users/egorzozula/Desktop/backendTemplate /src/services/ratingService.js` — validation, registry, upsert, aggregation
- `/Users/egorzozula/Desktop/backendTemplate /src/controllers/ratingController.js` — thin handlers
- `/Users/egorzozula/Desktop/backendTemplate /src/routes/subroutes/ratingRoutes.js` — Express router

**Backend (modify):**
- `/Users/egorzozula/Desktop/backendTemplate /src/routes/routes.js` — register `/ratings`

**Frontend (create):**
- `services/configs/rating.config.ts` — endpoint configs + types
- `components/ratings/StarBar.tsx` — reusable star renderer (read-only + interactive)
- `components/ratings/RatingSection.tsx` — average + interactive input + guest CTA

**Frontend (modify):**
- `services/index.ts` — export `ratingApi` and types
- `app/[locale]/sports-map/[id]/page.tsx` — embed `<RatingSection ... />` above `<CommentsSection ... />`

---

## Task 1: Backend — Rating model

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/models/Rating.js`

- [ ] **Step 1: Create the model file**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/models/Rating.js
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

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/models/Rating.js`
Expected: no output (exit 0).

- [ ] **Step 3: Ready to commit** (ask user before running `git add` / `git commit`).

---

## Task 2: Backend — Rating repository

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/repository/rating.js`

- [ ] **Step 1: Create the repository file**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/repository/rating.js
import { Rating } from '../models/Rating.js';

/**
 * Atomic upsert. Inserts if (targetType, targetId, user) doesn't exist, else replaces `value`.
 */
export async function upsert({ targetType, targetId, user, value }) {
  const doc = await Rating.findOneAndUpdate(
    { targetType, targetId, user },
    { $set: { value }, $setOnInsert: { targetType, targetId, user } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  )
    .populate({ path: 'user', select: 'name' })
    .exec();
  return doc;
}

/**
 * Returns { average: number | null, count: number } for the given target.
 */
export async function getAggregate({ targetType, targetId }) {
  const result = await Rating.aggregate([
    { $match: { targetType, targetId } },
    { $group: { _id: null, average: { $avg: '$value' }, count: { $sum: 1 } } },
  ]).exec();
  if (result.length === 0) {
    return { average: null, count: 0 };
  }
  const { average, count } = result[0];
  return { average, count };
}

/**
 * Find a single rating by (targetType, targetId, user). Lean.
 */
export function findMine({ targetType, targetId, user }) {
  return Rating.findOne({ targetType, targetId, user }).lean().exec();
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/repository/rating.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 3: Backend — DTO

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/dto/ratingDto.js`

- [ ] **Step 1: Create the DTO**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/dto/ratingDto.js
const isPopulatedUser = (value) =>
  value && typeof value === 'object' && '_id' in value;

const toUserDTO = (user) => {
  if (!isPopulatedUser(user)) {
    return { id: null, name: null };
  }
  return {
    id: user._id.toString(),
    name: user.name ?? null,
  };
};

/**
 * @param {import('mongoose').Document} doc
 */
export function toRatingDTO(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    targetType: doc.targetType,
    targetId: doc.targetId?.toString?.() ?? null,
    user: toUserDTO(doc.user),
    value: doc.value,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

/**
 * @param {{ average: number | null, count: number }} aggregate
 */
export function toAggregateDTO(aggregate) {
  return {
    average: aggregate.average ?? null,
    count: aggregate.count ?? 0,
  };
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/dto/ratingDto.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 4: Backend — Rating service

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/services/ratingService.js`

- [ ] **Step 1: Create the service**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/services/ratingService.js
import mongoose from 'mongoose';
import * as ratingRepository from '../repository/rating.js';
import * as playgroundRepository from '../repository/playground.js';
import { toRatingDTO, toAggregateDTO } from '../dto/ratingDto.js';
import { RATING_TARGET_TYPES } from '../models/Rating.js';
import { DomainError } from '../utils/http/httpError.js';
import { httpStatus } from '../utils/http/httpStatus.js';

const MIN_VALUE = 1;
const MAX_VALUE = 5;

const TARGET_REPOSITORIES = {
  playground: playgroundRepository,
};

const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

const assertValidTargetType = (targetType) => {
  if (!RATING_TARGET_TYPES.includes(targetType)) {
    throw new DomainError(
      `Unsupported targetType "${targetType}"`,
      httpStatus.BAD_REQUEST
    );
  }
};

const assertValidTargetId = (targetId) => {
  if (!isValidObjectId(targetId)) {
    throw new DomainError('Invalid targetId', httpStatus.BAD_REQUEST);
  }
};

const assertTargetExists = async (targetType, targetId) => {
  const repo = TARGET_REPOSITORIES[targetType];
  const entity = await repo.findById(targetId);
  if (!entity) {
    throw new DomainError(
      `Target ${targetType} not found`,
      httpStatus.NOT_FOUND
    );
  }
};

const assertValidValue = (value) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new DomainError(
      `value must be an integer between ${MIN_VALUE} and ${MAX_VALUE}`,
      httpStatus.BAD_REQUEST
    );
  }
  if (value < MIN_VALUE || value > MAX_VALUE) {
    throw new DomainError(
      `value must be between ${MIN_VALUE} and ${MAX_VALUE}`,
      httpStatus.BAD_REQUEST
    );
  }
};

/**
 * @param {{ id: string }} authUser
 * @param {{ targetType: string, targetId: string, value: number }} body
 */
export async function upsertRating(authUser, body) {
  if (!authUser || !authUser.id) {
    throw new DomainError('Unauthorized', httpStatus.UNAUTHORIZED);
  }
  const { targetType, targetId, value } = body ?? {};
  assertValidTargetType(targetType);
  assertValidTargetId(targetId);
  assertValidValue(value);
  await assertTargetExists(targetType, targetId);

  const doc = await ratingRepository.upsert({
    targetType,
    targetId: new mongoose.Types.ObjectId(targetId),
    user: new mongoose.Types.ObjectId(authUser.id),
    value,
  });
  return toRatingDTO(doc.toObject ? doc.toObject() : doc);
}

/**
 * @param {{ targetType?: string, targetId?: string }} query
 */
export async function getAggregate(query) {
  const { targetType, targetId } = query ?? {};
  assertValidTargetType(targetType);
  assertValidTargetId(targetId);

  const aggregate = await ratingRepository.getAggregate({
    targetType,
    targetId: new mongoose.Types.ObjectId(targetId),
  });
  return toAggregateDTO(aggregate);
}

/**
 * @param {{ id: string }} authUser
 * @param {{ targetType?: string, targetId?: string }} query
 */
export async function getMine(authUser, query) {
  if (!authUser || !authUser.id) {
    throw new DomainError('Unauthorized', httpStatus.UNAUTHORIZED);
  }
  const { targetType, targetId } = query ?? {};
  assertValidTargetType(targetType);
  assertValidTargetId(targetId);

  const doc = await ratingRepository.findMine({
    targetType,
    targetId: new mongoose.Types.ObjectId(targetId),
    user: new mongoose.Types.ObjectId(authUser.id),
  });
  return { value: doc?.value ?? null };
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/services/ratingService.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 5: Backend — Controller

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/controllers/ratingController.js`

- [ ] **Step 1: Create the controller**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/controllers/ratingController.js
import { ok, httpResponseError } from '../utils/http/httpResponse.js';
import * as ratingService from '../services/ratingService.js';

/**
 * PUT /ratings
 */
export async function upsert(req, res) {
  try {
    const rating = await ratingService.upsertRating(req.user, req.body ?? {});
    ok(res, rating);
  } catch (error) {
    httpResponseError(res, error);
  }
}

/**
 * GET /ratings/aggregate?targetType=&targetId=
 */
export async function aggregate(req, res) {
  try {
    const result = await ratingService.getAggregate(req.query ?? {});
    ok(res, result);
  } catch (error) {
    httpResponseError(res, error);
  }
}

/**
 * GET /ratings/me?targetType=&targetId=
 */
export async function mine(req, res) {
  try {
    const result = await ratingService.getMine(req.user, req.query ?? {});
    ok(res, result);
  } catch (error) {
    httpResponseError(res, error);
  }
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/controllers/ratingController.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 6: Backend — Routes + registration

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/routes/subroutes/ratingRoutes.js`
- Modify: `/Users/egorzozula/Desktop/backendTemplate /src/routes/routes.js`

- [ ] **Step 1: Create the rating router**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/routes/subroutes/ratingRoutes.js
import { Router } from 'express';
import * as ratingController from '../../controllers/ratingController.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/aggregate', ratingController.aggregate);
router.get('/me', requireAuth, ratingController.mine);
router.put('/', requireAuth, ratingController.upsert);

export default router;
```

- [ ] **Step 2: Register the router in `routes.js`**

In `/Users/egorzozula/Desktop/backendTemplate /src/routes/routes.js`, add the import after the existing `commentRoutes` line:

```js
import ratingRoutes from "./subroutes/ratingRoutes.js";
```

And add the `.use(...)` after the existing `router.use("/comments", commentRoutes)` line:

```js
router.use("/ratings", ratingRoutes);
```

Full result for reference (assumes `commentRoutes` is already wired from the previous feature):

```js
import { Router } from "express";
import authRoutes from "./subroutes/authRoutes.js";
import sessionRoutes from "./subroutes/sessionRoutes.js";
import billingRoutes from "./subroutes/billingRoutes.js";
import subscriptionRoutes from "./subroutes/subscriptionRoutes.js";
import sportRoutes from "./subroutes/sportRoutes.js";
import playgroundRoutes from "./subroutes/playgroundRoutes.js";
import commentRoutes from "./subroutes/commentRoutes.js";
import ratingRoutes from "./subroutes/ratingRoutes.js";

const prefix = process.env.API_PREFIX ?? "";
const router = Router();

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/billing", billingRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/sports", sportRoutes);
router.use("/playgrounds", playgroundRoutes);
router.use("/comments", commentRoutes);
router.use("/ratings", ratingRoutes);

const appRouter = prefix
  ? (() => {
      const main = Router();
      main.use(prefix, router);
      return main;
    })()
  : router;

export default appRouter;
```

- [ ] **Step 3: Sanity-check syntax of both files**

Run:
```bash
cd "/Users/egorzozula/Desktop/backendTemplate " && \
  node --check src/routes/subroutes/ratingRoutes.js && \
  node --check src/routes/routes.js
```
Expected: no output.

- [ ] **Step 4: Ready to commit.**

---

## Task 7: Manual backend verification (curl)

No file changes — validates the backend before any frontend work.

- [ ] **Step 1: Start the backend dev server**

```bash
cd "/Users/egorzozula/Desktop/backendTemplate " && npm run dev
```
Wait until it reports listening. Determine `$BASE` from logs (`API_PREFIX` may add `/api`).

- [ ] **Step 2: Obtain a real access token + playgroundId**

Log in via the frontend, copy `accessToken` cookie from devtools.
```bash
export ACCESS=<paste-token>
curl -s "$BASE/playgrounds?bbox=22,44,40,52&limit=1" | jq '.items[0].id'
export PLAYGROUND_ID=<paste-id>
```

- [ ] **Step 3: PUT without auth → 401**

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","value":4}'
```
Expected: `HTTP/1.1 401`.

- [ ] **Step 4: PUT with value out of range → 400**

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","value":6}'
```
Expected: `HTTP/1.1 400`. Repeat with `0` and `-1` — both 400.

- [ ] **Step 5: PUT with non-integer value → 400**

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","value":3.5}'
```
Expected: `HTTP/1.1 400`.

- [ ] **Step 6: PUT with bad targetType → 400, non-existent targetId → 404**

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"weather","targetId":"'"$PLAYGROUND_ID"'","value":4}'
```
Expected: `HTTP/1.1 400`.

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"507f1f77bcf86cd799439011","value":4}'
```
Expected: `HTTP/1.1 404`.

- [ ] **Step 7: PUT happy path (first vote)**

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","value":4}'
```
Expected: `HTTP/1.1 200` with body `{ id, targetType, targetId, user: { id, name }, value: 4, ... }`.

- [ ] **Step 8: PUT again — same user, different value (idempotent count)**

```bash
curl -i -X PUT "$BASE/ratings" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","value":5}'
```
Expected: `HTTP/1.1 200`. The `id` should match the previous response (same row updated).

- [ ] **Step 9: GET aggregate**

```bash
curl -s "$BASE/ratings/aggregate?targetType=playground&targetId=$PLAYGROUND_ID" | jq
```
Expected: `{ "average": 5, "count": 1 }`. If you have a second test user account, log it in and PUT a `value: 3` from that account; then re-run aggregate — expect `{ "average": 4, "count": 2 }`.

- [ ] **Step 10: GET aggregate for empty target → null average**

```bash
curl -s "$BASE/ratings/aggregate?targetType=playground&targetId=507f1f77bcf86cd799439011" | jq
```
Expected: `{ "average": null, "count": 0 }`.

- [ ] **Step 11: GET aggregate with bad params → 400**

```bash
curl -i "$BASE/ratings/aggregate?targetType=weather&targetId=$PLAYGROUND_ID"
curl -i "$BASE/ratings/aggregate?targetType=playground&targetId=not-an-id"
```
Expected: both `HTTP/1.1 400`.

- [ ] **Step 12: GET /ratings/me**

```bash
curl -i "$BASE/ratings/me?targetType=playground&targetId=$PLAYGROUND_ID"
```
Expected: `HTTP/1.1 401` (no auth).

```bash
curl -s "$BASE/ratings/me?targetType=playground&targetId=$PLAYGROUND_ID" \
  -H "Cookie: accessToken=$ACCESS" | jq
```
Expected: `{ "value": 5 }` (from step 8).

- [ ] **Step 13: Ready to commit** (if any tweaks were needed during verification).

---

## Task 8: Frontend — API config and wiring

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/services/configs/rating.config.ts`
- Modify: `/Users/egorzozula/Desktop/sportMap/Template-frontend/services/index.ts`

- [ ] **Step 1: Create the rating API config**

```ts
// services/configs/rating.config.ts
import { getData, putData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface RatingUser {
	id: string | null
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

(Note: `GET /ratings/me` is intentionally NOT in this config. The component fetches it via raw `fetch` to bypass the auth-refresh interceptor for guests.)

- [ ] **Step 2: Wire `ratingApi` and types in `services/index.ts`**

Add an import alongside the existing config imports (after the existing `commentApiConfig` import):

```ts
import ratingApiConfig from './configs/rating.config'
```

Add an export alongside the existing `*Api` exports (after `commentApi`):

```ts
export const ratingApi = createApiMethods(ratingApiConfig, defaultInterceptors)
```

Add the type re-export block near other `export type` lines:

```ts
export type {
	Rating,
	RatingUser,
	RatingAggregate,
	UpsertRatingBody,
} from './configs/rating.config'
```

- [ ] **Step 3: Type-check the frontend**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx tsc --noEmit`
Expected: pre-existing errors in `components/booking/OrgCalendarPage.tsx` are OK to ignore; no NEW errors in the files you touched.

- [ ] **Step 4: Lint**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx eslint services/configs/rating.config.ts services/index.ts`
Expected: no errors.

- [ ] **Step 5: Ready to commit.**

---

## Task 9: Frontend — `StarBar` component

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/ratings/StarBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/ratings/StarBar.tsx
'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type StarBarSize = 'sm' | 'md' | 'lg'

type StarBarProps = {
	value: number | null
	max?: number
	size?: StarBarSize
	interactive?: boolean
	disabled?: boolean
	onChange?: (value: number) => void
	ariaLabel?: string
	className?: string
}

const SIZE_CLASSES: Record<StarBarSize, string> = {
	sm: 'h-4 w-4',
	md: 'h-5 w-5',
	lg: 'h-7 w-7',
}

const clampFillPercent = (value: number | null, index: number): number => {
	if (value == null) return 0
	const portion = value - index
	if (portion <= 0) return 0
	if (portion >= 1) return 100
	return Math.round(portion * 100)
}

const ReadOnlyStar = ({
	fillPercent,
	sizeClass,
}: {
	fillPercent: number
	sizeClass: string
}) => (
	<span className={cn('relative inline-block', sizeClass)} aria-hidden>
		<Star
			className={cn('text-muted-foreground/40 absolute inset-0', sizeClass)}
			strokeWidth={1.5}
		/>
		<span
			className="absolute inset-0 overflow-hidden"
			style={{ width: `${fillPercent}%` }}
		>
			<Star
				className={cn('fill-yellow-500 text-yellow-500', sizeClass)}
				strokeWidth={1.5}
			/>
		</span>
	</span>
)

const InteractiveStar = ({
	index,
	filled,
	sizeClass,
	disabled,
	onSelect,
	onHover,
	onLeave,
}: {
	index: number
	filled: boolean
	sizeClass: string
	disabled: boolean
	onSelect: () => void
	onHover: () => void
	onLeave: () => void
}) => (
	<button
		type="button"
		aria-label={`Поставити ${index} зірок`}
		onClick={onSelect}
		onMouseEnter={onHover}
		onMouseLeave={onLeave}
		onFocus={onHover}
		onBlur={onLeave}
		disabled={disabled}
		className={cn(
			'inline-flex cursor-pointer items-center justify-center rounded-sm p-0.5 transition-colors',
			'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
			disabled && 'cursor-not-allowed opacity-60',
		)}
	>
		<Star
			className={cn(
				sizeClass,
				filled
					? 'fill-yellow-500 text-yellow-500'
					: 'text-muted-foreground/40',
			)}
			strokeWidth={1.5}
		/>
	</button>
)

const StarBar = ({
	value,
	max = 5,
	size = 'md',
	interactive = false,
	disabled = false,
	onChange,
	ariaLabel,
	className,
}: StarBarProps) => {
	const [hover, setHover] = useState<number | null>(null)
	const sizeClass = SIZE_CLASSES[size]
	const indices = Array.from({ length: max }, (_, i) => i + 1)

	if (!interactive) {
		const renderReadOnlyStar = (index: number) => (
			<ReadOnlyStar
				key={index}
				fillPercent={clampFillPercent(value, index - 1)}
				sizeClass={sizeClass}
			/>
		)
		return (
			<span
				className={cn('inline-flex items-center gap-0.5', className)}
				role="img"
				aria-label={ariaLabel ?? (value != null ? `${value} з ${max}` : 'Без оцінки')}
			>
				{indices.map(renderReadOnlyStar)}
			</span>
		)
	}

	const handleSelect = (index: number) => () => onChange?.(index)
	const handleHover = (index: number) => () => setHover(index)
	const handleLeave = () => setHover(null)
	const activeValue = hover ?? value ?? 0

	const renderInteractiveStar = (index: number) => (
		<InteractiveStar
			key={index}
			index={index}
			filled={index <= activeValue}
			sizeClass={sizeClass}
			disabled={disabled}
			onSelect={handleSelect(index)}
			onHover={handleHover(index)}
			onLeave={handleLeave}
		/>
	)

	return (
		<span
			className={cn('inline-flex items-center gap-1', className)}
			role="radiogroup"
			aria-label={ariaLabel ?? 'Виберіть оцінку'}
		>
			{indices.map(renderInteractiveStar)}
		</span>
	)
}

export { StarBar }
```

- [ ] **Step 2: Lint the new file**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx eslint components/ratings/StarBar.tsx`
Expected: no errors.

- [ ] **Step 3: Type-check**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx tsc --noEmit 2>&1 | grep "components/ratings/StarBar" || echo "no TS errors in StarBar.tsx"`
Expected: "no TS errors in StarBar.tsx".

- [ ] **Step 4: Ready to commit.**

---

## Task 10: Frontend — `RatingSection` component

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/ratings/RatingSection.tsx`

- [ ] **Step 1: Verify required UI components exist**

Run:
```bash
ls /Users/egorzozula/Desktop/sportMap/Template-frontend/components/ui/{card,button,skeleton,empty}.tsx
```
Expected: all exist. Install any missing via `npx shadcn@latest add <name>`.

- [ ] **Step 2: Create the component**

```tsx
// components/ratings/RatingSection.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Star } from 'lucide-react'

import { ratingApi, ApiError, type RatingAggregate } from '@/services'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { StarBar } from './StarBar'

const PLURAL_FORM = (count: number): 'one' | 'few' | 'many' => {
	const mod10 = count % 10
	const mod100 = count % 100
	if (mod10 === 1 && mod100 !== 11) return 'one'
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
	return 'many'
}

const formatRatingsCount = (count: number): string => {
	const form = PLURAL_FORM(count)
	if (form === 'one') return `${count} оцінка`
	if (form === 'few') return `${count} оцінки`
	return `${count} оцінок`
}

const formatAverage = (value: number | null): string => {
	if (value == null) return '—'
	return value.toFixed(1)
}

type MeInfo = { id: string } | null

type RatingSectionProps = {
	targetType: 'playground'
	targetId: string
}

const loadMe = async (): Promise<MeInfo> => {
	try {
		const response = await fetch('/api/user/profile', {
			credentials: 'include',
		})
		if (!response.ok) return null
		const payload = (await response.json()) as
			| { data?: { id?: string } }
			| null
		const user = payload?.data
		if (!user || !user.id) return null
		return { id: user.id }
	} catch {
		return null
	}
}

const loadMyRating = async (
	targetType: string,
	targetId: string,
): Promise<number | null> => {
	try {
		const params = new URLSearchParams({ targetType, targetId })
		const response = await fetch(`/api/ratings/me?${params.toString()}`, {
			credentials: 'include',
		})
		if (!response.ok) return null
		const payload = (await response.json()) as { value?: number | null }
		return typeof payload.value === 'number' ? payload.value : null
	} catch {
		return null
	}
}

const RatingSection = ({ targetType, targetId }: RatingSectionProps) => {
	const [aggregate, setAggregate] = useState<RatingAggregate | null>(null)
	const [myValue, setMyValue] = useState<number | null>(null)
	const [me, setMe] = useState<MeInfo>(null)
	const [initialLoading, setInitialLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			setInitialLoading(true)
			try {
				const [aggregateRes, meRes, myRatingRes] = await Promise.all([
					ratingApi.getAggregate({
						queryParams: { targetType, targetId },
						silent: true,
					}),
					loadMe(),
					loadMyRating(targetType, targetId),
				])
				if (cancelled) return
				setAggregate(aggregateRes)
				setMe(meRes)
				setMyValue(myRatingRes)
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError ? err.displayMessage : 'Не вдалося завантажити оцінки'
				toast.error(message)
			} finally {
				if (!cancelled) setInitialLoading(false)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [targetType, targetId])

	const refetchAggregate = async () => {
		try {
			const res = await ratingApi.getAggregate({
				queryParams: { targetType, targetId },
				silent: true,
			})
			setAggregate(res)
		} catch {
			// silent: aggregate refresh failure leaves stale data but submission already succeeded
		}
	}

	const handleRate = async (value: number) => {
		if (submitting) return
		setSubmitting(true)
		try {
			await ratingApi.upsert({
				body: { targetType, targetId, value },
			})
			setMyValue(value)
			await refetchAggregate()
			toast.success('Дякуємо за оцінку!')
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		} finally {
			setSubmitting(false)
		}
	}

	if (initialLoading || aggregate == null) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Star className="h-5 w-5" />
						Оцінка
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-16 w-full" />
				</CardContent>
			</Card>
		)
	}

	const hasRatings = aggregate.count > 0

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Star className="h-5 w-5" />
					Оцінка
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
					<div className="flex flex-col gap-2">
						{hasRatings ? (
							<>
								<div className="flex items-baseline gap-3">
									<span className="text-4xl font-semibold tracking-tight">
										{formatAverage(aggregate.average)}
									</span>
									<StarBar value={aggregate.average} size="md" />
								</div>
								<span className="text-muted-foreground text-sm">
									{formatRatingsCount(aggregate.count)}
								</span>
							</>
						) : (
							<>
								<StarBar value={null} size="md" />
								<span className="text-muted-foreground text-sm italic">
									Поки немає оцінок
								</span>
							</>
						)}
					</div>

					{me ? (
						<div className="flex flex-col items-start gap-2 md:items-end">
							<span className="text-muted-foreground text-sm">Ваша оцінка</span>
							<StarBar
								value={myValue}
								interactive
								disabled={submitting}
								onChange={handleRate}
								size="lg"
								ariaLabel="Ваша оцінка"
							/>
						</div>
					) : (
						<Empty className="md:max-w-xs">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Star />
								</EmptyMedia>
								<EmptyTitle>Увійдіть, щоб оцінити</EmptyTitle>
								<EmptyDescription>
									Оцінювати площадки можуть лише авторизовані користувачі.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Link
									href="/login"
									className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
								>
									Увійти
								</Link>
							</EmptyContent>
						</Empty>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

export { RatingSection }
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx tsc --noEmit 2>&1 | grep -E "components/ratings/(StarBar|RatingSection)" || echo "no TS errors in ratings components"
```
Expected: "no TS errors in ratings components".

```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx eslint components/ratings/StarBar.tsx components/ratings/RatingSection.tsx
```
Expected: no errors.

- [ ] **Step 4: Ready to commit.**

---

## Task 11: Frontend — Embed widget on the playground detail page

**Files:**
- Modify: `/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/sports-map/[id]/page.tsx`

- [ ] **Step 1: Add the import**

Near the top of the file, alongside the existing `@/components/comments/CommentsSection` import (added in the previous feature), add:

```tsx
import { RatingSection } from '@/components/ratings/RatingSection'
```

- [ ] **Step 2: Render the widget**

Find the JSX block in the main column:
```tsx
<div className="space-y-6 lg:col-span-2">
  <Card>
    <CardHeader>
      <CardTitle>Опис</CardTitle>
    </CardHeader>
    {/* ... */}
  </Card>

  {playground.sports.length > 0 ? (
    /* ... */
  ) : null}

  {restPhotos.length > 0 ? (
    /* ... */
  ) : null}

  <CommentsSection targetType="playground" targetId={playground.id} />
</div>
```

Insert `<RatingSection ... />` immediately **after the closing `</Card>` of "Опис" and before any other content** (the rating belongs near the top of the column, right under the description):

```tsx
<RatingSection targetType="playground" targetId={playground.id} />
```

Final structure inside `lg:col-span-2`:
1. `Card "Опис"`
2. `<RatingSection ... />` ← new
3. `Card "Види спорту"` (conditional)
4. `Card "Фото"` (conditional)
5. `<CommentsSection ... />`

- [ ] **Step 3: Type-check and lint**

Run:
```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx tsc --noEmit 2>&1 | grep "sports-map/\[id\]/page" || echo "no TS errors in page.tsx"
```
Expected: "no TS errors in page.tsx".

```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx eslint 'app/[locale]/sports-map/[id]/page.tsx'
```
Expected: no errors.

- [ ] **Step 4: Ready to commit.**

---

## Task 12: Manual end-to-end verification (UI)

No file changes — final acceptance.

- [ ] **Step 1: Start both servers**

Backend (terminal A): `cd "/Users/egorzozula/Desktop/backendTemplate " && npm run dev`
Frontend (terminal B): `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npm run dev`

- [ ] **Step 2: Logged-out flow**

Open `http://localhost:3000/sports-map/<some-id>` in an incognito window.
Expected:
- "Оцінка" card renders between "Опис" and the rest.
- If the playground has ratings: large number, partial-fill stars, plural-correct "(N оцінок)".
- If no ratings: empty stars + "Поки немає оцінок".
- Right side shows the "Увійдіть, щоб оцінити" prompt with login button.
- Interactive stars are NOT rendered for the guest.

- [ ] **Step 3: Logged-in flow — first vote**

Log in. Reload the same page.
Expected:
- Right side shows "Ваша оцінка" with interactive stars (empty initially).
- Hovering over star 4 highlights stars 1-4. Moving away resets to current `myValue` (still 0 / unset).
- Clicking star 4 submits. After resolve:
  - Stars 1-4 stay filled (selection locked).
  - `(N оцінок)` updates (incremented by 1 if it's your first rating on this target).
  - Large average number updates.
  - Green toast "Дякуємо за оцінку!".

- [ ] **Step 4: Logged-in flow — change vote**

While still logged in on the same page, click star 5.
Expected:
- Selection updates to 5.
- Average refetches with the new value; `count` does NOT change (still your single vote).
- Green toast again.

- [ ] **Step 5: Partial-fill rendering**

Manually create ratings for the same target from at least three different test users with values 5, 4, 3 (use curl from Task 7 with their respective access tokens). Reload the page.
Expected:
- Large average shows `4.0` (or whatever the arithmetic mean is).
- Read-only stars on the left show partial-fill behavior matching the average. For an average like `4.3`, stars 1-4 are fully filled and star 5 is roughly 30% filled.

- [ ] **Step 6: Pluralization check**

With `count = 1` → label reads "1 оцінка".
With `count = 2`, `3`, or `4` → "N оцінки".
With `count = 5`, `6`, …, `20` → "N оцінок".
With `count = 21` → "21 оцінка".
With `count = 11`, `12`, `14` → "N оцінок" (the 11-14 exception).

Verify a few of these by adding/removing votes via curl and reloading.

- [ ] **Step 7: Error toast**

Stop the backend, then click a star.
Expected: red toast appears via the global toast interceptor (e.g., "Failed to submit rating" or network message).

Restart the backend. Confirm normal behavior resumes.

- [ ] **Step 8: Final code quality**

Run from frontend root:
```bash
npm run lint && \
  npm run format:check && \
  npx tsc --noEmit
```
Expected: all clean (except pre-existing errors in `components/booking/OrgCalendarPage.tsx` which are not yours). Run `npm run format` if `format:check` complains.

- [ ] **Step 9: Ready to commit / push.**

Summarize the work for the user; ask whether to commit. Do not commit autonomously.

---

## Self-review notes

- **Spec coverage:** model + indexes, repository (upsert/aggregate/findMine), DTO (toRatingDTO + toAggregateDTO), service (validation + registry + upsert + aggregate + mine), controller, routes (PUT + GET /aggregate + GET /me), route registration, frontend config (getAggregate + upsert, no /me in config by design), wiring in services/index.ts, StarBar (read-only with partial fill + interactive), RatingSection (average + interactive + guest CTA + plural formatting), page embed, manual verification — all present.
- **/ratings/me intentionally not in the typed API client** (decision rationale: a logged-out visitor's `userApi.me` already taught us the auth-refresh interceptor will redirect on 401; same applies here). The component uses a raw fetch with `credentials: 'include'`. Spec calls this out explicitly.
- **Aggregate is recomputed after every successful rate**, not optimistically derived from the old `aggregate` + `myValue`. This avoids drift on re-rates where we don't know the previous value's effect.
- **Plural formatting** uses Ukrainian rules (one / few / many) consistent with Slavic locale norms. Verified with the `11-14` exception.
- All commit checkpoints are non-autonomous per the user's standing policy.
