# Comments System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polymorphic comments subsystem (backend + frontend) so authenticated users can post / list / delete comments on playgrounds, designed to extend to other target entities later.

**Architecture:** Layered backend (model → repository → service → controller → route + DTO) mirroring existing `playground` module. Polymorphism via `(targetType, targetId)` pair plus a small registry that maps `targetType → entity repository` for existence checks. Frontend uses the existing config-driven API client (`createApiMethods`) and a self-contained `CommentsSection` widget embedded into the playground detail page.

**Tech Stack:**
- Backend: Node.js (ESM), Express, Mongoose, jsonwebtoken
- Frontend: Next.js 16 App Router, React 19, TypeScript, react-hook-form + zod, shadcn/ui (`base-nova`), sonner

**Important repo notes:**
- Backend root has a **trailing space** in the path: `/Users/egorzozula/Desktop/backendTemplate /src/`. Always quote it.
- No automated test framework — verification is **manual via curl + UI**.
- Per user policy: never `git commit` without an explicit human "commit" request. This plan ends each task with a "Ready to commit" checkpoint; do **not** auto-commit.

---

## File Structure

**Backend (create):**
- `/Users/egorzozula/Desktop/backendTemplate /src/models/Comment.js` — schema + indexes
- `/Users/egorzozula/Desktop/backendTemplate /src/repository/comment.js` — DB ops
- `/Users/egorzozula/Desktop/backendTemplate /src/dto/commentDto.js` — `toDTO()`
- `/Users/egorzozula/Desktop/backendTemplate /src/services/commentService.js` — validation, registry, permissions
- `/Users/egorzozula/Desktop/backendTemplate /src/controllers/commentController.js` — thin handlers
- `/Users/egorzozula/Desktop/backendTemplate /src/routes/subroutes/commentRoutes.js` — Express router

**Backend (modify):**
- `/Users/egorzozula/Desktop/backendTemplate /src/routes/routes.js` — register `/comments`

**Frontend (create):**
- `services/configs/comment.config.ts` — endpoint configs + types
- `components/comments/CommentItem.tsx` — single row + delete dialog
- `components/comments/CommentsSection.tsx` — form + list + load more

**Frontend (modify):**
- `services/index.ts` — export `commentApi` and types
- `app/[locale]/sports-map/[id]/page.tsx` — embed `<CommentsSection ... />`

---

## Task 1: Backend — Comment model

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/models/Comment.js`

- [ ] **Step 1: Create the model file**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/models/Comment.js
import mongoose from 'mongoose';

export const COMMENT_TARGET_TYPES = ['playground'];

const commentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: COMMENT_TARGET_TYPES,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

commentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', commentSchema);
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/models/Comment.js`
Expected: no output (exit 0).

- [ ] **Step 3: Ready to commit** (ask user before running `git add` / `git commit`).

---

## Task 2: Backend — Comment repository

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/repository/comment.js`

- [ ] **Step 1: Create the repository file**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/repository/comment.js
import { Comment } from '../models/Comment.js';

/**
 * @param {{ targetType: string, targetId: import('mongoose').Types.ObjectId, author: import('mongoose').Types.ObjectId, text: string }} data
 * @returns {Promise<import('mongoose').Document>}
 */
export async function create(data) {
  const doc = await Comment.create(data);
  await doc.populate({ path: 'author', select: 'name avatar' });
  return doc;
}

/**
 * @param {{ targetType: string, targetId: import('mongoose').Types.ObjectId, limit: number, offset: number }} params
 * @returns {Promise<{ items: import('mongoose').Document[], total: number }>}
 */
export async function listByTarget({ targetType, targetId, limit, offset }) {
  const filter = { targetType, targetId };
  const [items, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .populate({ path: 'author', select: 'name avatar' })
      .lean()
      .exec(),
    Comment.countDocuments(filter).exec(),
  ]);
  return { items, total };
}

/**
 * @param {string} id
 * @returns {Promise<import('mongoose').Document | null>}
 */
export function findById(id) {
  return Comment.findById(id)
    .populate({ path: 'author', select: 'name avatar' })
    .exec();
}

/**
 * @param {string} id
 * @returns {Promise<import('mongoose').Document | null>}
 */
export function deleteById(id) {
  return Comment.findByIdAndDelete(id).exec();
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/repository/comment.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 3: Backend — DTO

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/dto/commentDto.js`

- [ ] **Step 1: Create the DTO**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/dto/commentDto.js
const isPopulatedAuthor = (value) =>
  value && typeof value === 'object' && '_id' in value;

const toAuthorDTO = (author) => {
  if (!isPopulatedAuthor(author)) {
    return { id: null, name: null, avatar: null };
  }
  return {
    id: author._id.toString(),
    name: author.name ?? null,
    avatar: author.avatar ?? null,
  };
};

/**
 * @param {import('mongoose').Document} doc
 */
export function toDTO(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    targetType: doc.targetType,
    targetId: doc.targetId?.toString?.() ?? null,
    text: doc.text,
    author: toAuthorDTO(doc.author),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : null,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/dto/commentDto.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 4: Backend — Comment service (validation, registry, permissions)

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/services/commentService.js`

- [ ] **Step 1: Create the service**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/services/commentService.js
import mongoose from 'mongoose';
import * as commentRepository from '../repository/comment.js';
import * as playgroundRepository from '../repository/playground.js';
import { User } from '../models/User.js';
import { toDTO } from '../dto/commentDto.js';
import { COMMENT_TARGET_TYPES } from '../models/Comment.js';
import { DomainError } from '../utils/http/httpError.js';
import { httpStatus } from '../utils/http/httpStatus.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_TEXT_LENGTH = 2000;

const TARGET_REPOSITORIES = {
  playground: playgroundRepository,
};

const isValidObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

const parseLimit = (raw) => {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_LIMIT;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(value, MAX_LIMIT);
};

const parseOffset = (raw) => {
  if (raw === undefined || raw === null || raw === '') return 0;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < 0) return 0;
  return value;
};

const assertValidTargetType = (targetType) => {
  if (!COMMENT_TARGET_TYPES.includes(targetType)) {
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

const assertValidText = (text) => {
  if (typeof text !== 'string') {
    throw new DomainError('text is required', httpStatus.BAD_REQUEST);
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new DomainError('text must not be empty', httpStatus.BAD_REQUEST);
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new DomainError(
      `text must be at most ${MAX_TEXT_LENGTH} characters`,
      httpStatus.BAD_REQUEST
    );
  }
  return trimmed;
};

/**
 * @param {{ id: string }} authUser  payload from requireAuth (req.user)
 * @param {{ targetType: string, targetId: string, text: string }} body
 */
export async function createComment(authUser, body) {
  if (!authUser || !authUser.id) {
    throw new DomainError('Unauthorized', httpStatus.UNAUTHORIZED);
  }
  const { targetType, targetId, text } = body ?? {};
  assertValidTargetType(targetType);
  assertValidTargetId(targetId);
  const trimmedText = assertValidText(text);
  await assertTargetExists(targetType, targetId);

  const doc = await commentRepository.create({
    targetType,
    targetId: new mongoose.Types.ObjectId(targetId),
    author: new mongoose.Types.ObjectId(authUser.id),
    text: trimmedText,
  });
  return toDTO(doc.toObject ? doc.toObject() : doc);
}

/**
 * @param {{ targetType?: string, targetId?: string, limit?: string, offset?: string }} query
 */
export async function listComments(query) {
  const { targetType, targetId } = query ?? {};
  assertValidTargetType(targetType);
  assertValidTargetId(targetId);

  const limit = parseLimit(query.limit);
  const offset = parseOffset(query.offset);

  const { items, total } = await commentRepository.listByTarget({
    targetType,
    targetId: new mongoose.Types.ObjectId(targetId),
    limit,
    offset,
  });
  return {
    items: items.map(toDTO),
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };
}

const isAdmin = async (userId) => {
  const user = await User.findById(userId).select('role').lean().exec();
  return user?.role === 'admin';
};

/**
 * @param {{ id: string }} authUser  from requireAuth
 * @param {string} commentId
 */
export async function deleteComment(authUser, commentId) {
  if (!authUser || !authUser.id) {
    throw new DomainError('Unauthorized', httpStatus.UNAUTHORIZED);
  }
  if (!isValidObjectId(commentId)) {
    throw new DomainError('Invalid id', httpStatus.BAD_REQUEST);
  }
  const doc = await commentRepository.findById(commentId);
  if (!doc) {
    throw new DomainError('Comment not found', httpStatus.NOT_FOUND);
  }
  const authorId = doc.author?._id?.toString?.() ?? doc.author?.toString?.();
  const isOwner = authorId === authUser.id;
  const admin = isOwner ? false : await isAdmin(authUser.id);
  if (!isOwner && !admin) {
    throw new DomainError('Forbidden', httpStatus.FORBIDDEN);
  }
  await commentRepository.deleteById(commentId);
  return { id: commentId };
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/services/commentService.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 5: Backend — Controller

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/controllers/commentController.js`

- [ ] **Step 1: Create the controller**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/controllers/commentController.js
import { ok, created, httpResponseError } from '../utils/http/httpResponse.js';
import * as commentService from '../services/commentService.js';

/**
 * POST /comments
 */
export async function create(req, res) {
  try {
    const comment = await commentService.createComment(req.user, req.body ?? {});
    created(res, comment);
  } catch (error) {
    httpResponseError(res, error);
  }
}

/**
 * GET /comments?targetType=&targetId=&limit=&offset=
 */
export async function list(req, res) {
  try {
    const result = await commentService.listComments(req.query ?? {});
    ok(res, result);
  } catch (error) {
    httpResponseError(res, error);
  }
}

/**
 * DELETE /comments/:id
 */
export async function remove(req, res) {
  try {
    const result = await commentService.deleteComment(req.user, req.params?.id);
    ok(res, result);
  } catch (error) {
    httpResponseError(res, error);
  }
}
```

- [ ] **Step 2: Sanity-check syntax**

Run: `cd "/Users/egorzozula/Desktop/backendTemplate " && node --check src/controllers/commentController.js`
Expected: no output.

- [ ] **Step 3: Ready to commit.**

---

## Task 6: Backend — Routes + registration

**Files:**
- Create: `/Users/egorzozula/Desktop/backendTemplate /src/routes/subroutes/commentRoutes.js`
- Modify: `/Users/egorzozula/Desktop/backendTemplate /src/routes/routes.js`

- [ ] **Step 1: Create the comment router**

```js
// /Users/egorzozula/Desktop/backendTemplate /src/routes/subroutes/commentRoutes.js
import { Router } from 'express';
import * as commentController from '../../controllers/commentController.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', commentController.list);
router.post('/', requireAuth, commentController.create);
router.delete('/:id', requireAuth, commentController.remove);

export default router;
```

- [ ] **Step 2: Register the router in `routes.js`**

In `/Users/egorzozula/Desktop/backendTemplate /src/routes/routes.js`, add the import and `.use(...)`:

```js
import commentRoutes from "./subroutes/commentRoutes.js";
```

and inside the `router.use(...)` block (after the existing `playgrounds` line):

```js
router.use("/comments", commentRoutes);
```

Full result for reference:
```js
import { Router } from "express";
import authRoutes from "./subroutes/authRoutes.js";
import sessionRoutes from "./subroutes/sessionRoutes.js";
import billingRoutes from "./subroutes/billingRoutes.js";
import subscriptionRoutes from "./subroutes/subscriptionRoutes.js";
import sportRoutes from "./subroutes/sportRoutes.js";
import playgroundRoutes from "./subroutes/playgroundRoutes.js";
import commentRoutes from "./subroutes/commentRoutes.js";

const prefix = process.env.API_PREFIX ?? "";
const router = Router();

router.use("/auth", authRoutes);
router.use("/sessions", sessionRoutes);
router.use("/billing", billingRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/sports", sportRoutes);
router.use("/playgrounds", playgroundRoutes);
router.use("/comments", commentRoutes);

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
  node --check src/routes/subroutes/commentRoutes.js && \
  node --check src/routes/routes.js
```
Expected: no output.

- [ ] **Step 4: Ready to commit.**

---

## Task 7: Manual backend verification (curl)

No file changes — this task validates the backend before any frontend work.

- [ ] **Step 1: Start the backend dev server**

In the backend directory (terminal A, foreground):
```bash
cd "/Users/egorzozula/Desktop/backendTemplate " && npm run dev
```
Wait until it reports listening on its configured port. The `API_PREFIX` from `.env` may add a prefix (e.g. `/api`); confirm by reading `.env` or the startup logs and use the resulting base URL below — written as `$BASE` in examples.

- [ ] **Step 2: Obtain a real access token**

Sign in via the existing auth flow (the project uses OAuth via `authRoutes`). Easiest: use the frontend (`npm run dev` in another terminal) to log in, then copy the `accessToken` cookie value from devtools. Export it for the next steps:
```bash
export ACCESS=<paste-access-token>
```

You also need a real `playgroundId` from the DB. Get one:
```bash
curl -s "$BASE/playgrounds?bbox=22,44,40,52&limit=1" | jq '.items[0].id'
export PLAYGROUND_ID=<paste-id-from-output>
```

- [ ] **Step 3: Verify POST without auth → 401**

```bash
curl -i -X POST "$BASE/comments" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","text":"hi"}'
```
Expected: `HTTP/1.1 401`.

- [ ] **Step 4: Verify POST with bad targetType → 400**

```bash
curl -i -X POST "$BASE/comments" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"weather","targetId":"'"$PLAYGROUND_ID"'","text":"hi"}'
```
Expected: `HTTP/1.1 400` and body `{"error":"Unsupported targetType \"weather\""}`.

- [ ] **Step 5: Verify POST with non-existent targetId → 404**

```bash
curl -i -X POST "$BASE/comments" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"507f1f77bcf86cd799439011","text":"hi"}'
```
Expected: `HTTP/1.1 404`.

- [ ] **Step 6: Verify POST with empty text → 400**

```bash
curl -i -X POST "$BASE/comments" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","text":"   "}'
```
Expected: `HTTP/1.1 400` with `text must not be empty`.

- [ ] **Step 7: Verify a happy-path POST**

```bash
curl -i -X POST "$BASE/comments" \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=$ACCESS" \
  -d '{"targetType":"playground","targetId":"'"$PLAYGROUND_ID"'","text":"первый коммент"}'
```
Expected: `HTTP/1.1 201` and a JSON body with `id`, `author.name`, `text`, `createdAt`. Save the id:
```bash
export COMMENT_ID=<id-from-response>
```

- [ ] **Step 8: Verify GET list**

```bash
curl -s "$BASE/comments?targetType=playground&targetId=$PLAYGROUND_ID&limit=10&offset=0" | jq
```
Expected: `{ items: [..], total: 1, limit: 10, offset: 0, hasMore: false }`. The new comment must be in `items`.

- [ ] **Step 9: Verify DELETE permission**

Delete as the same user:
```bash
curl -i -X DELETE "$BASE/comments/$COMMENT_ID" \
  -H "Cookie: accessToken=$ACCESS"
```
Expected: `HTTP/1.1 200` `{"id":"..."}`.

If you have a second user account, log it in and try deleting a comment authored by user A — expect `HTTP/1.1 403`. If you have an admin (a user document with `role: "admin"` in Mongo), repeat as admin — expect `HTTP/1.1 200`. Document any deviation before moving on.

- [ ] **Step 10: Ready to commit** (if any tweaks were needed during verification, commit those now).

---

## Task 8: Frontend — API config and wiring

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/services/configs/comment.config.ts`
- Modify: `/Users/egorzozula/Desktop/sportMap/Template-frontend/services/index.ts`

- [ ] **Step 1: Create the comment API config**

```ts
// services/configs/comment.config.ts
import { getData, postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface CommentAuthor {
	id: string | null
	name: string | null
	avatar: string | null
}

interface Comment {
	id: string
	targetType: 'playground'
	targetId: string
	text: string
	author: CommentAuthor
	createdAt: string | null
	updatedAt: string | null
}

interface CommentListResponse {
	items: Comment[]
	total: number
	limit: number
	offset: number
	hasMore: boolean
}

interface CreateCommentBody {
	targetType: 'playground'
	targetId: string
	text: string
}

interface DeleteCommentResponse {
	id: string
}

const commentApiConfig = {
	list: endpoint<void, CommentListResponse>({
		url: () => `/api/comments`,
		method: getData,
		defaultErrorMessage: 'Failed to load comments',
	}),
	create: endpoint<CreateCommentBody, Comment>({
		url: () => `/api/comments`,
		method: postData,
		defaultErrorMessage: 'Failed to post comment',
	}),
	remove: endpoint<void, DeleteCommentResponse>({
		url: ({ id }) => `/api/comments/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete comment',
	}),
}

export default commentApiConfig
export type {
	Comment,
	CommentAuthor,
	CommentListResponse,
	CreateCommentBody,
	DeleteCommentResponse,
}
```

- [ ] **Step 2: Wire `commentApi` and types in `services/index.ts`**

Add an import alongside the existing config imports:
```ts
import commentApiConfig from './configs/comment.config'
```

Add an export alongside the existing `*Api` exports (use `defaultInterceptors` so 401 triggers auth refresh):
```ts
export const commentApi = createApiMethods(commentApiConfig, defaultInterceptors)
```

Add the type re-export block near the other `export type` lines:
```ts
export type {
	Comment,
	CommentAuthor,
	CommentListResponse,
	CreateCommentBody,
	DeleteCommentResponse,
} from './configs/comment.config'
```

- [ ] **Step 3: Type-check the frontend**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx tsc --noEmit`
Expected: exits 0. If it errors on unrelated files, isolate by running `npx tsc --noEmit services/configs/comment.config.ts` and ensure your new file alone is clean before moving on.

- [ ] **Step 4: Lint**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npm run lint`
Expected: no errors in new files.

- [ ] **Step 5: Ready to commit.**

---

## Task 9: Frontend — `CommentItem` component

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/comments/CommentItem.tsx`

- [ ] **Step 1: Verify the required UI components exist**

Run:
```bash
ls /Users/egorzozula/Desktop/sportMap/Template-frontend/components/ui/{avatar,alert-dialog,button}.tsx
```
Expected: all three files exist. If any are missing, install via `npx shadcn@latest add <name>` from the project root before continuing.

- [ ] **Step 2: Create the component**

```tsx
// components/comments/CommentItem.tsx
'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Comment } from '@/services'

type CommentItemProps = {
	comment: Comment
	canDelete: boolean
	onDelete: (id: string) => Promise<void> | void
}

const formatCommentDate = (iso: string | null): string => {
	if (!iso) return ''
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ''
	return date.toLocaleString('uk-UA', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

const buildInitials = (name: string | null): string => {
	if (!name) return '?'
	const parts = name.trim().split(/\s+/).slice(0, 2)
	const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('')
	return initials || '?'
}

const CommentItem = ({ comment, canDelete, onDelete }: CommentItemProps) => {
	const [deleting, setDeleting] = useState(false)

	const handleConfirmDelete = async () => {
		setDeleting(true)
		try {
			await onDelete(comment.id)
		} finally {
			setDeleting(false)
		}
	}

	return (
		<div className="flex gap-3 py-4">
			<Avatar className="h-9 w-9">
				{comment.author.avatar ? (
					<AvatarImage src={comment.author.avatar} alt={comment.author.name ?? 'User'} />
				) : null}
				<AvatarFallback>{buildInitials(comment.author.name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-baseline gap-2 text-sm">
						<span className="font-medium">{comment.author.name ?? 'Користувач'}</span>
						<span className="text-muted-foreground text-xs">
							{formatCommentDate(comment.createdAt)}
						</span>
					</div>
					{canDelete ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									aria-label="Видалити коментар"
									disabled={deleting}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Видалити коментар?</AlertDialogTitle>
									<AlertDialogDescription>
										Цю дію не можна скасувати. Коментар буде видалено назавжди.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Скасувати</AlertDialogCancel>
									<AlertDialogAction onClick={handleConfirmDelete}>
										Видалити
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : null}
				</div>
				<p className="text-foreground/90 text-sm whitespace-pre-line">
					{comment.text}
				</p>
			</div>
		</div>
	)
}

export { CommentItem }
```

- [ ] **Step 3: Lint the new file**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx eslint components/comments/CommentItem.tsx`
Expected: no errors.

- [ ] **Step 4: Ready to commit.**

---

## Task 10: Frontend — `CommentsSection` component

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/comments/CommentsSection.tsx`

- [ ] **Step 1: Verify required UI components exist**

Run:
```bash
ls /Users/egorzozula/Desktop/sportMap/Template-frontend/components/ui/{card,textarea,button,field,separator,skeleton,empty}.tsx
```
Expected: all exist. Install any missing via `npx shadcn@latest add <name>`.

- [ ] **Step 2: Create the component**

```tsx
// components/comments/CommentsSection.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { MessageSquare } from 'lucide-react'

import {
	commentApi,
	userApi,
	ApiError,
	type Comment,
} from '@/services'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
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
import { CommentItem } from './CommentItem'

const MAX_TEXT_LENGTH = 2000
const PAGE_SIZE = 20

const schema = z.object({
	text: z
		.string()
		.trim()
		.min(1, 'Введіть текст коментаря')
		.max(MAX_TEXT_LENGTH, `Максимум ${MAX_TEXT_LENGTH} символів`),
})
type FormData = z.infer<typeof schema>

type MeInfo = { id: string; isAdmin: boolean } | null

type CommentsSectionProps = {
	targetType: 'playground'
	targetId: string
}

const loadMe = async (): Promise<MeInfo> => {
	try {
		const res = await userApi.me({ silent: true })
		const user = res?.data
		if (!user || !user.id) return null
		// `role` is not in the User type but the backend returns it when present.
		const role = (user as unknown as { role?: string }).role
		return { id: user.id, isAdmin: role === 'admin' }
	} catch {
		return null
	}
}

const CommentsSection = ({ targetType, targetId }: CommentsSectionProps) => {
	const [items, setItems] = useState<Comment[]>([])
	const [total, setTotal] = useState(0)
	const [offset, setOffset] = useState(0)
	const [initialLoading, setInitialLoading] = useState(true)
	const [moreLoading, setMoreLoading] = useState(false)
	const [me, setMe] = useState<MeInfo>(null)

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { text: '' } })

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			setInitialLoading(true)
			try {
				const [listRes, meRes] = await Promise.all([
					commentApi.list({
						queryParams: { targetType, targetId, limit: PAGE_SIZE, offset: 0 },
						silent: true,
					}),
					loadMe(),
				])
				if (cancelled) return
				setItems(listRes.items)
				setTotal(listRes.total)
				setOffset(listRes.items.length)
				setMe(meRes)
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError ? err.displayMessage : 'Не вдалося завантажити коментарі'
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

	const handleLoadMore = async () => {
		setMoreLoading(true)
		try {
			const res = await commentApi.list({
				queryParams: { targetType, targetId, limit: PAGE_SIZE, offset },
			})
			setItems((prev) => [...prev, ...res.items])
			setTotal(res.total)
			setOffset((prev) => prev + res.items.length)
		} finally {
			setMoreLoading(false)
		}
	}

	const onSubmit = async (data: FormData) => {
		try {
			const created = await commentApi.create({
				body: { targetType, targetId, text: data.text },
			})
			setItems((prev) => [created, ...prev])
			setTotal((prev) => prev + 1)
			setOffset((prev) => prev + 1)
			reset()
			toast.success('Коментар опубліковано')
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		}
	}

	const handleDelete = async (id: string) => {
		try {
			await commentApi.remove({ pathParams: { id } })
			setItems((prev) => prev.filter((c) => c.id !== id))
			setTotal((prev) => Math.max(0, prev - 1))
			setOffset((prev) => Math.max(0, prev - 1))
			toast.success('Коментар видалено')
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				setItems((prev) => prev.filter((c) => c.id !== id))
			}
		}
	}

	const canDeleteComment = (comment: Comment): boolean => {
		if (!me) return false
		if (me.isAdmin) return true
		return comment.author.id === me.id
	}

	const renderComment = (comment: Comment) => (
		<div key={comment.id}>
			<CommentItem
				comment={comment}
				canDelete={canDeleteComment(comment)}
				onDelete={handleDelete}
			/>
			<Separator />
		</div>
	)

	const hasMore = items.length < total

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MessageSquare className="h-5 w-5" />
					Коментарі
					<span className="text-muted-foreground ml-1 text-sm font-normal">
						({total})
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{me ? (
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
						<Field data-invalid={!!errors.text || undefined}>
							<FieldLabel htmlFor="comment-text">Ваш коментар</FieldLabel>
							<Textarea
								id="comment-text"
								rows={3}
								maxLength={MAX_TEXT_LENGTH}
								placeholder="Поділіться враженнями про площадку"
								{...register('text')}
							/>
							<FieldDescription>
								До {MAX_TEXT_LENGTH} символів.
							</FieldDescription>
							<FieldError errors={[errors.text]} />
						</Field>
						<div className="flex justify-end">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Публікація…' : 'Опублікувати'}
							</Button>
						</div>
					</form>
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<MessageSquare />
							</EmptyMedia>
							<EmptyTitle>Увійдіть, щоб залишити коментар</EmptyTitle>
							<EmptyDescription>
								Перегляд коментарів доступний усім, але писати можуть лише
								авторизовані користувачі.
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

				<Separator />

				{initialLoading ? (
					<div className="space-y-3">
						<Skeleton className="h-16 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : items.length === 0 ? (
					<p className="text-muted-foreground py-4 text-center text-sm italic">
						Ще немає коментарів. Будьте першим!
					</p>
				) : (
					<div>{items.map(renderComment)}</div>
				)}

				{hasMore ? (
					<div className="flex justify-center">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleLoadMore}
							disabled={moreLoading}
						>
							{moreLoading ? 'Завантаження…' : 'Завантажити ще'}
						</Button>
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}

export { CommentsSection }
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx tsc --noEmit && \
  npx eslint components/comments/CommentsSection.tsx components/comments/CommentItem.tsx
```
Expected: no errors. If `npx tsc --noEmit` flags `user.role` access, the cast inside `loadMe()` (`as unknown as { role?: string }`) should keep it clean — re-check the cast location.

- [ ] **Step 4: Ready to commit.**

---

## Task 11: Frontend — Embed widget on the playground detail page

**Files:**
- Modify: `/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/sports-map/[id]/page.tsx`

- [ ] **Step 1: Add the import**

Near the top of the file, after the existing imports from `@/components/sports-map/...`, add:
```tsx
import { CommentsSection } from '@/components/comments/CommentsSection'
```

- [ ] **Step 2: Render the widget in the main column**

Find the JSX block:
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
</div>
```

Immediately before the closing `</div>` of `lg:col-span-2`, add:
```tsx
<CommentsSection targetType="playground" targetId={playground.id} />
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx tsc --noEmit && \
  npx eslint app/\[locale\]/sports-map/\[id\]/page.tsx
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
- The "Коментарі" card renders.
- Counter shows `(N)` matching `commentApi.list` total.
- Instead of the form, the login prompt with an "Увійти" button is shown.
- Any existing comments render correctly with avatars, names, and dates.

- [ ] **Step 3: Logged-in flow — create**

Log in. Reload the same page.
Expected:
- Form (Textarea + button) is visible.
- Submitting empty text shows the inline `FieldError` "Введіть текст коментаря".
- Submitting valid text adds the new comment at the top, increments the counter, and shows a green toast "Коментар опубліковано".

- [ ] **Step 4: Logged-in flow — delete own**

Click the trash icon on your own comment.
Expected:
- `AlertDialog` opens.
- "Скасувати" closes it without action.
- "Видалити" removes the comment from the list, decrements the counter, shows toast "Коментар видалено".

- [ ] **Step 5: Logged-in flow — delete others'**

If another user's comment exists, confirm there is no trash icon on it. As an admin user, confirm the trash icon appears and deletion succeeds.

- [ ] **Step 6: "Завантажити ще"**

Manually insert > 20 comments via repeated POSTs (curl loop from Task 7) on the same playground. Reload the page.
Expected:
- 20 comments are rendered.
- "Завантажити ще" button is visible.
- Clicking it appends the next page; button disappears when all are loaded.

- [ ] **Step 7: Error toasts**

Stop the backend, then submit a comment from the frontend.
Expected: red toast appears via the existing `createToastInterceptor()` (e.g. "Не вдалося опублікувати коментар" or network message).

Restart the backend. Confirm normal behavior resumes.

- [ ] **Step 8: Final code quality**

Run from frontend root:
```bash
npm run lint && \
  npm run format:check && \
  npx tsc --noEmit
```
Expected: all clean. Run `npm run format` if `format:check` complains.

- [ ] **Step 9: Ready to commit / push.**

Summarize the work for the user; ask whether to commit. Do not commit autonomously.

---

## Self-review notes

- Spec coverage: model, repository, DTO, service (validation + registry + permissions), controller, routes, route registration, frontend config, frontend wiring, CommentItem, CommentsSection, page embed, manual verification — all present.
- Admin check uses DB lookup because the current JWT payload (`{ id, email, name }` in `authService.signAccessToken`) carries no `role`. This is option (2) from the spec; no schema change required.
- The frontend `userApi.me` response is wrapped as `ApiResponse<User>`; `loadMe()` reads `res.data`. The `role` field is not in the current `User` TS interface, so a narrow cast is used inside `loadMe()` rather than mutating the shared type — keeps the change local to this feature.
- Backend error format is `{ error, code?, details? }`, which the frontend's `ApiError.displayMessage` handles via `defaultErrorMessage` fallback; no extra mapping needed.
- All commit checkpoints are non-autonomous per the user's standing policy.
