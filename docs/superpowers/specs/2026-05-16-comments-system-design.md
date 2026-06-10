# Comments System — Design Spec

**Date:** 2026-05-16
**Scope:** Backend (`/Users/egorzozula/Desktop/backendTemplate /src/`) + Frontend (`/Users/egorzozula/Desktop/sportMap/Template-frontend/`)

## Goal

Build a polymorphic comments subsystem that:
- Lets authenticated users post comments on **target entities**.
- In MVP supports `targetType = "playground"` only; the design must extend cleanly to other entities.
- Provides list / create / delete on the backend with a comments widget on the playground detail page.

## Out of scope (MVP)

- Nested replies / threading.
- Editing comments.
- Likes / reactions.
- Moderation queue, reports, soft-delete.
- Cursor-based pagination (offset/limit is enough for current expected volume).
- Automated tests (project has none today).

## Architecture

### Backend layers (mirror existing `playground` / `sport` modules)

```
routes/subroutes/commentRoutes.js   → registered in routes.js under "/comments"
controllers/commentController.js    → thin request/response handlers, uses ok/created/httpResponseError
services/commentService.js          → validation, permissions, target lookup
repository/comment.js               → pure Mongoose operations
models/Comment.js                   → schema + indexes
dto/commentDto.js                   → toDTO serializer
```

### Frontend layers

```
services/configs/comment.config.ts  → endpoint configs (list / create / remove)
services/index.ts                   → export commentApi with defaultInterceptors
                                       (auth refresh + toast)
components/comments/CommentsSection.tsx → main widget (form + list + load more)
components/comments/CommentItem.tsx     → single row + delete dialog

app/[locale]/sports-map/[id]/page.tsx   → embeds <CommentsSection targetType="playground" targetId={playground.id} />
```

### Polymorphism approach

- `Comment` stores `targetType: String` (enum) + `targetId: ObjectId` — two explicit fields.
- No Mongoose `refPath` (would force a single combined `target` field and complicate indexing).
- Compound index `(targetType, targetId, createdAt desc)` serves the main query.
- A whitelist + small registry maps each `targetType` to its repository for existence checks:
  ```js
  // services/commentService.js
  const TARGET_REPOSITORIES = {
    playground: () => import('../repository/playground.js'),
  };
  ```
  New entities are added by extending the enum and the registry.

## Data model

```js
// models/Comment.js
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

**Field decisions:**

| Field | Type | Notes |
|---|---|---|
| `targetType` | `String` enum | Whitelisted by `COMMENT_TARGET_TYPES`. |
| `targetId` | `ObjectId` | Validated as ObjectId in service; existence checked via registry. |
| `author` | `ObjectId` → User | Set from `req.user.id` at create time. Required. |
| `text` | `String` | Trimmed, 1–2000 chars. |
| `createdAt` / `updatedAt` | `Date` | From `timestamps: true`. |

## API contract

### `POST /comments` (auth required)

Request:
```json
{ "targetType": "playground", "targetId": "<id>", "text": "Чудовий майданчик" }
```

Validation (service):
1. `targetType` ∈ `COMMENT_TARGET_TYPES` → else `400`.
2. `targetId` is a valid ObjectId string → else `400`.
3. Entity exists (registry lookup) → else `404` "Target not found".
4. `text` trimmed length between 1 and 2000 → else `400`.

Response: `201 Created` with comment DTO.

### `GET /comments?targetType=&targetId=&limit=&offset=` (public)

Query:
- `targetType` (required) — must be whitelisted.
- `targetId` (required) — valid ObjectId.
- `limit` (optional, default 20, max 100).
- `offset` (optional, default 0, ≥ 0).

Response:
```json
{
  "items": [CommentDTO, ...],
  "total": 153,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```
Sort: `createdAt: -1` (newest first). Items have `author` populated (`name`, `avatar`, `_id`).

### `DELETE /comments/:id` (auth required)

Permission rule (service-enforced):
- `req.user.id === comment.author.toString()` → allowed.
- OR `req.user.role === 'admin'` → allowed.
- Else → `403`.

Comment not found → `404`.

Response: `200 { id: string }`.

### Error model

All errors thrown as `DomainError(message, httpStatus.*)` so the existing `httpResponseError` formatter produces the standard `{ statusCode, status, data }` payload that the frontend `ApiError` + toast interceptor already handles.

## DTO

```ts
// commentDto.js → toDTO(doc)
type CommentDTO = {
  id: string;
  targetType: 'playground';            // future: union as enum grows
  targetId: string;
  text: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  createdAt: string;                   // ISO
  updatedAt: string;                   // ISO
};
```

`author` is populated to avoid N+1 on the client.

## Authorization details

The existing `requireAuth` middleware sets `req.user = jwtPayload`. The JWT payload's exact shape needs to be confirmed when implementing (read `services/authService.js`):

- If the payload already includes `role`, admin check is `req.user.role === 'admin'`.
- If not, two options (decide during implementation):
  1. Extend the access-token signer to include `role` (preferred — zero extra DB load).
  2. In the delete handler only, do `User.findById(req.user.id).select('role')` and check.

Either is acceptable; the spec mandates the behavior, not the mechanism.

## Frontend integration

### API client (`services/configs/comment.config.ts`)

```ts
import { getData, postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface CommentAuthor {
  id: string
  name: string
  avatar: string | null
}

interface Comment {
  id: string
  targetType: 'playground'
  targetId: string
  text: string
  author: CommentAuthor
  createdAt: string
  updatedAt: string
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
  remove: endpoint<void, { id: string }>({
    url: ({ id }) => `/api/comments/${id}`,
    method: deleteData,
    defaultErrorMessage: 'Failed to delete comment',
  }),
}

export default commentApiConfig
export type { Comment, CommentAuthor, CommentListResponse, CreateCommentBody }
```

Wired in `services/index.ts`:
```ts
export const commentApi = createApiMethods(commentApiConfig, defaultInterceptors)
export type { Comment, CommentAuthor, CommentListResponse, CreateCommentBody } from './configs/comment.config'
```

`defaultInterceptors` is used (not `publicInterceptors`) because create/delete need auth refresh on 401.

### Component: `CommentsSection`

Props:
```ts
type CommentsSectionProps = {
  targetType: 'playground'
  targetId: string
}
```

State:
- `items: Comment[]`
- `total: number`
- `offset: number`
- `loading: boolean` (first load + load more)
- `submitting: boolean`
- `me: User | null` (loaded via `userApi.me({ silent: true })`)

Behavior:
1. On mount → `commentApi.list({ params: { targetType, targetId, limit: 20, offset: 0 } })` and `userApi.me({ silent: true })` in parallel. If `me` call fails with 401, treat as guest (no error toast — `silent: true`).
2. Render:
   - `Card` with `CardHeader` ("Коментарі • {total}") and `CardContent`.
   - If `me` → form (RHF + zod: `text: z.string().trim().min(1).max(2000)`) with `Textarea` + submit `Button`.
   - Else → `Empty`-style card prompting login, link to `/login`.
   - List of `CommentItem` (avatar, name, formatted date, text, delete button if owner or admin).
   - "Завантажити ще" button when `items.length < total`.
3. On successful create → `setItems([newComment, ...items])`, `setTotal(t + 1)`, `reset()`, `toast.success("Коментар опубліковано")`.
4. On successful delete → `setItems(items.filter(byId))`, `setTotal(t - 1)`, `toast.success("Коментар видалено")`.
5. Validation errors come back via `setServerErrors(err, setError)` (form fields) or auto-toast (everything else).

### Component: `CommentItem`

Props:
```ts
type CommentItemProps = {
  comment: Comment
  canDelete: boolean              // owner || admin
  onDelete: (id: string) => Promise<void>
}
```

Renders: `Avatar` (uses `comment.author.avatar` or fallback initials), author name, relative date (or formatted UK locale), text with `whitespace-pre-line`. Delete icon-button → `AlertDialog` confirmation → call `onDelete(id)`.

### Page integration

In `app/[locale]/sports-map/[id]/page.tsx`, add the section after the existing "Опис" / "Види спорту" / "Фото" cards in the main column:

```tsx
<CommentsSection targetType="playground" targetId={playground.id} />
```

Stays inside `lg:col-span-2`.

## Edge cases

- Posting while logged in but token expired → auth-refresh interceptor retries once; if refresh fails the user is redirected to `/login`. Form preserves typed text? Out of scope — accept that the redirect drops the draft in MVP.
- Deleting a comment that was already deleted by an admin → backend returns 404, frontend shows toast and removes from list defensively.
- `targetId` for an entity that was deleted while comments remained → list returns whatever exists; create returns 404. Cascade-delete on entity removal is out of MVP scope.
- Very long text — capped at 2000 chars both on backend (Mongoose validator) and on frontend (zod + `maxLength` on Textarea).

## Manual verification checklist

Backend:
- `POST /comments` without auth → 401.
- `POST` with invalid `targetType` → 400.
- `POST` with non-existent `targetId` → 404.
- `POST` with empty `text` → 400.
- `POST` with `text` 2001 chars → 400.
- `POST` valid → 201, comment shows up in `GET`.
- `GET` without `targetType`/`targetId` → 400.
- `GET` returns newest first; `limit` / `offset` work; `total`/`hasMore` correct.
- `DELETE` own → 200.
- `DELETE` someone else as user → 403.
- `DELETE` someone else as admin → 200.
- `DELETE` missing id → 404.

Frontend (on `/sports-map/[id]`):
- Logged-out → sees list, sees login prompt instead of form.
- Logged-in → can post; new comment appears immediately on top.
- Own comment shows delete icon; others' do not (unless admin).
- Confirmation dialog cancels without action.
- "Завантажити ще" appends and stops when `hasMore` is false.
- Counter in header updates after create/delete.
- API error → toast via existing interceptor.

## Implementation order

1. Backend model + repository + DTO.
2. Backend service + controller + routes; wire into `routes.js`.
3. Confirm JWT payload role behavior; adjust as needed.
4. Frontend `comment.config.ts` + export from `services/index.ts`.
5. `CommentItem` + `CommentsSection` components.
6. Embed in playground detail page.
7. Manual verification per checklist.
