# Unified Feedback Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the existing `RatingSection` and `CommentsSection` into a single `FeedbackSection` card "Відгуки" with one shared login prompt for guests, eliminating duplicated CTAs and a duplicate `loadMe` call on the playground detail page.

**Architecture:** Introduce a top-level orchestrator (`FeedbackSection`) that owns the `me` state and renders one shadcn `Card`. Refactor the existing rating and comments components into "blocks" (`FeedbackRating`, `FeedbackComments`) that no longer render their own `Card` shell or guest login Empty — they accept `meId: string | null` as a prop and render only the inner content. Reusable primitives (`StarBar`, `CommentItem`) stay untouched.

**Tech Stack:** Same as the existing pieces — Next.js 16 App Router, React 19, TypeScript, react-hook-form + zod, sonner, shadcn/ui (`base-nova`), lucide-react.

**Notes for the engineer:**
- This is a frontend-only refactor. Backend endpoints, types, and the API client are not touched.
- Per the user's standing policy: NEVER `git commit` without an explicit "commit" request. Each task ends with a "Ready to commit" checkpoint — do not auto-commit.
- The old `components/ratings/RatingSection.tsx` and `components/comments/CommentsSection.tsx` are no longer needed and must be deleted at the end. `components/ratings/StarBar.tsx` and `components/comments/CommentItem.tsx` are kept as reusable primitives.

---

## File Structure

**Create:**
- `components/feedback/FeedbackSection.tsx` — orchestrator: owns `me` state, renders one Card with header, shared login banner for guests, then the two blocks.
- `components/feedback/FeedbackRating.tsx` — internal rating block (no Card wrapper, no guest CTA). Receives `meId` prop. Owns aggregate + myValue state.
- `components/feedback/FeedbackComments.tsx` — internal comments block (no Card wrapper, no guest CTA). Receives `meId` and `isAdmin` props. Owns items + total state.

**Modify:**
- `app/[locale]/sports-map/[id]/page.tsx` — swap two imports/usages for one `<FeedbackSection ... />`.

**Delete (at end, once new flow works):**
- `components/ratings/RatingSection.tsx`
- `components/comments/CommentsSection.tsx`

**Keep untouched:**
- `components/ratings/StarBar.tsx` — reusable star renderer (read-only + interactive).
- `components/comments/CommentItem.tsx` — reusable comment row.
- `services/configs/rating.config.ts`, `services/configs/comment.config.ts`, `services/index.ts` — API layer untouched.

---

## Task 1: Create `FeedbackRating` block

This is the existing `RatingSection.tsx` minus its `Card`, header, and guest-Empty. Receives `meId` from the parent.

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/feedback/FeedbackRating.tsx`

- [ ] **Step 1: Create the directory**

Run: `mkdir -p /Users/egorzozula/Desktop/sportMap/Template-frontend/components/feedback`
Expected: directory exists (no output on success).

- [ ] **Step 2: Write the file**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ratingApi, ApiError, type RatingAggregate } from '@/services'
import { StarBar } from '@/components/ratings/StarBar'

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

type FeedbackRatingProps = {
	targetType: 'playground'
	targetId: string
	meId: string | null
}

const FeedbackRating = ({ targetType, targetId, meId }: FeedbackRatingProps) => {
	const [aggregate, setAggregate] = useState<RatingAggregate | null>(null)
	const [myValue, setMyValue] = useState<number | null>(null)
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			try {
				const [aggregateRes, myRatingRes] = await Promise.all([
					ratingApi.getAggregate({
						queryParams: { targetType, targetId },
						silent: true,
					}),
					meId ? loadMyRating(targetType, targetId) : Promise.resolve(null),
				])
				if (cancelled) return
				setAggregate(aggregateRes)
				setMyValue(myRatingRes)
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError ? err.displayMessage : 'Не вдалося завантажити оцінки'
				toast.error(message)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [targetType, targetId, meId])

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

	const hasRatings = aggregate != null && aggregate.count > 0

	return (
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

			{meId ? (
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
			) : null}
		</div>
	)
}

export { FeedbackRating }
```

- [ ] **Step 3: Lint the new file**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx eslint components/feedback/FeedbackRating.tsx`
Expected: exit 0, no output.

- [ ] **Step 4: Type-check**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx tsc --noEmit 2>&1 | grep "feedback/FeedbackRating" || echo "no TS errors in FeedbackRating.tsx"`
Expected: "no TS errors in FeedbackRating.tsx".

- [ ] **Step 5: Ready to commit.**

---

## Task 2: Create `FeedbackComments` block

The existing `CommentsSection.tsx` minus its `Card`, header, and guest-Empty. Receives `meId` and `isAdmin` from the parent.

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/feedback/FeedbackComments.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { commentApi, ApiError, type Comment } from '@/services'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CommentItem } from '@/components/comments/CommentItem'

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

type FeedbackCommentsProps = {
	targetType: 'playground'
	targetId: string
	meId: string | null
	isAdmin: boolean
}

const FeedbackComments = ({
	targetType,
	targetId,
	meId,
	isAdmin,
}: FeedbackCommentsProps) => {
	const [items, setItems] = useState<Comment[]>([])
	const [total, setTotal] = useState(0)
	const [offset, setOffset] = useState(0)
	const [initialLoading, setInitialLoading] = useState(true)
	const [moreLoading, setMoreLoading] = useState(false)

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { text: '' },
	})

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			setInitialLoading(true)
			try {
				const res = await commentApi.list({
					queryParams: { targetType, targetId, limit: PAGE_SIZE, offset: 0 },
					silent: true,
				})
				if (cancelled) return
				setItems(res.items)
				setTotal(res.total)
				setOffset(res.items.length)
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
		if (!meId) return false
		if (isAdmin) return true
		return comment.author.id === meId
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
		<div className="space-y-4">
			<div className="text-muted-foreground text-sm">
				Коментарі{' '}
				<span className="text-foreground/70">({total})</span>
			</div>

			{meId ? (
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
						<FieldDescription>До {MAX_TEXT_LENGTH} символів.</FieldDescription>
						<FieldError errors={[errors.text]} />
					</Field>
					<div className="flex justify-end">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Публікація…' : 'Опублікувати'}
						</Button>
					</div>
				</form>
			) : null}

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
		</div>
	)
}

export { FeedbackComments }
```

- [ ] **Step 2: Lint the new file**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx eslint components/feedback/FeedbackComments.tsx`
Expected: exit 0, no output.

- [ ] **Step 3: Type-check**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx tsc --noEmit 2>&1 | grep "feedback/FeedbackComments" || echo "no TS errors in FeedbackComments.tsx"`
Expected: "no TS errors in FeedbackComments.tsx".

- [ ] **Step 4: Ready to commit.**

---

## Task 3: Create `FeedbackSection` orchestrator

Owns the `me` state, renders one Card with header "Відгуки", a single login banner for guests at the top, then the two blocks separated by a `Separator`.

**Files:**
- Create: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/feedback/FeedbackSection.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { FeedbackRating } from './FeedbackRating'
import { FeedbackComments } from './FeedbackComments'

type MeInfo = { id: string; isAdmin: boolean } | null

const loadMe = async (): Promise<MeInfo> => {
	try {
		const response = await fetch('/api/user/profile', {
			credentials: 'include',
		})
		if (!response.ok) return null
		const payload = (await response.json()) as
			| { data?: { id?: string; role?: string } }
			| null
		const user = payload?.data
		if (!user || !user.id) return null
		return { id: user.id, isAdmin: user.role === 'admin' }
	} catch {
		return null
	}
}

type FeedbackSectionProps = {
	targetType: 'playground'
	targetId: string
}

const FeedbackSection = ({ targetType, targetId }: FeedbackSectionProps) => {
	const [me, setMe] = useState<MeInfo>(null)
	const [meLoaded, setMeLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false
		const run = async () => {
			const result = await loadMe()
			if (cancelled) return
			setMe(result)
			setMeLoaded(true)
		}
		run()
		return () => {
			cancelled = true
		}
	}, [])

	const meId = me?.id ?? null
	const isAdmin = me?.isAdmin ?? false

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MessageSquare className="h-5 w-5" />
					Відгуки
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{meLoaded && !me ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<MessageSquare />
							</EmptyMedia>
							<EmptyTitle>Увійдіть, щоб залишити оцінку та коментар</EmptyTitle>
							<EmptyDescription>
								Перегляд оцінок та коментарів доступний усім, але писати можуть лише
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
				) : null}

				<FeedbackRating
					targetType={targetType}
					targetId={targetId}
					meId={meId}
				/>

				<Separator />

				<FeedbackComments
					targetType={targetType}
					targetId={targetId}
					meId={meId}
					isAdmin={isAdmin}
				/>
			</CardContent>
		</Card>
	)
}

export { FeedbackSection }
```

- [ ] **Step 2: Lint the new file**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx eslint components/feedback/FeedbackSection.tsx`
Expected: exit 0, no output.

- [ ] **Step 3: Type-check**

Run: `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npx tsc --noEmit 2>&1 | grep "feedback/FeedbackSection" || echo "no TS errors in FeedbackSection.tsx"`
Expected: "no TS errors in FeedbackSection.tsx".

- [ ] **Step 4: Ready to commit.**

---

## Task 4: Swap usages in the playground detail page

**Files:**
- Modify: `/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/sports-map/[id]/page.tsx`

- [ ] **Step 1: Replace two imports with one**

Remove these two import lines (both near the existing `@/components/comments/...` / `@/components/ratings/...` imports):
```tsx
import { CommentsSection } from '@/components/comments/CommentsSection'
import { RatingSection } from '@/components/ratings/RatingSection'
```

Add this single import in their place:
```tsx
import { FeedbackSection } from '@/components/feedback/FeedbackSection'
```

- [ ] **Step 2: Replace two JSX blocks with one**

Inside `<div className="space-y-6 lg:col-span-2">`, find the two existing blocks:

```tsx
<RatingSection targetType="playground" targetId={playground.id} />
```
…and (further down):
```tsx
<CommentsSection targetType="playground" targetId={playground.id} />
```

Remove both. Add a single line where the `<CommentsSection ... />` used to be (i.e., at the BOTTOM of the column, after "Опис", "Види спорту" (conditional), and "Фото" (conditional)):

```tsx
<FeedbackSection targetType="playground" targetId={playground.id} />
```

Final order inside `lg:col-span-2`:
1. `Card "Опис"`
2. `Card "Види спорту"` (conditional)
3. `Card "Фото"` (conditional)
4. `<FeedbackSection ... />`

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
Expected: exit 0, no output.

- [ ] **Step 4: Ready to commit.**

---

## Task 5: Delete obsolete files

`components/ratings/RatingSection.tsx` and `components/comments/CommentsSection.tsx` are no longer referenced (the page detail is the only consumer, and we just replaced it). Verify, then delete.

**Files:**
- Delete: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/ratings/RatingSection.tsx`
- Delete: `/Users/egorzozula/Desktop/sportMap/Template-frontend/components/comments/CommentsSection.tsx`

- [ ] **Step 1: Confirm there are no remaining imports**

Run:
```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  grep -rE "(components/ratings/RatingSection|components/comments/CommentsSection|RatingSection|CommentsSection)" \
    --include="*.ts" --include="*.tsx" .
```
Expected: only matches inside the files about to be deleted (`components/ratings/RatingSection.tsx`, `components/comments/CommentsSection.tsx`). No references in `app/` or anywhere else.

If any external reference appears (a stray import that didn't get cleaned up in Task 4), STOP and fix it before deleting.

- [ ] **Step 2: Delete the files**

```bash
rm /Users/egorzozula/Desktop/sportMap/Template-frontend/components/ratings/RatingSection.tsx
rm /Users/egorzozula/Desktop/sportMap/Template-frontend/components/comments/CommentsSection.tsx
```

- [ ] **Step 3: Final type-check and lint over the touched scope**

Run:
```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx tsc --noEmit 2>&1 | grep -E "(feedback|ratings|comments|sports-map/\[id\])" || echo "no TS errors in touched scope"
```
Expected: "no TS errors in touched scope". (Pre-existing errors in `components/booking/OrgCalendarPage.tsx` are unrelated and OK to ignore.)

```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && \
  npx eslint \
    components/feedback/FeedbackSection.tsx \
    components/feedback/FeedbackRating.tsx \
    components/feedback/FeedbackComments.tsx \
    components/ratings/StarBar.tsx \
    components/comments/CommentItem.tsx \
    'app/[locale]/sports-map/[id]/page.tsx'
```
Expected: exit 0, no output.

- [ ] **Step 4: Ready to commit.**

---

## Task 6: Manual UI verification

No file changes — final acceptance.

- [ ] **Step 1: Start both servers**

Backend (terminal A): `cd "/Users/egorzozula/Desktop/backendTemplate " && npm run dev`
Frontend (terminal B): `cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npm run dev`

- [ ] **Step 2: Logged-out flow**

Open `http://localhost:3000/sports-map/<some-id>` in an incognito window.
Expected:
- ONE card titled "Відгуки" sits at the bottom of the main column.
- ONE Empty banner at the top of the card: "Увійдіть, щоб залишити оцінку та коментар" + single "Увійти" button.
- Below the banner: rating block with read-only average + count (or "Поки немає оцінок").
- Below that: separator.
- Below the separator: comments list (or "Ще немає коментарів"), NO form.
- No second login button. No duplicate prompts.

- [ ] **Step 3: Logged-in flow**

Log in, reload the same page.
Expected:
- ONE card titled "Відгуки".
- NO login banner (Empty hidden).
- Rating block shows read-only average + "Ваша оцінка" with interactive stars.
- Separator.
- Comments block shows the comment form (textarea + Опублікувати) + list + load-more if applicable.
- Clicking a star: average refetches, "Дякуємо за оцінку!" toast.
- Submitting a comment: appears at top of list, counter increments, "Коментар опубліковано" toast.

- [ ] **Step 4: Full code quality**

Run from frontend root:
```bash
npm run lint && \
  npm run format:check && \
  npx tsc --noEmit
```
Expected: clean (the pre-existing `components/booking/OrgCalendarPage.tsx` errors may still show — those are not part of this change). Run `npm run format` if `format:check` complains.

- [ ] **Step 5: Ready to commit / push.**

Summarize for the user; ask whether to commit. Do not commit autonomously.

---

## Self-review notes

- **Single `me` source.** `FeedbackSection` is the only place that calls `loadMe`. Both blocks receive `meId` and (for comments) `isAdmin` as props. This eliminates the duplicate `/api/user/profile` request that used to happen because each old section loaded `me` independently.
- **Single login CTA.** The `Empty` banner appears once at the top of the card; both child blocks suppress their own (they never render their own login UI because they receive `meId` as a prop instead of fetching it).
- **Behavior preservation.** All existing UX — partial-fill stars, Ukrainian plural counts, comment form validation, delete with AlertDialog, load-more — is preserved by copy-pasting the relevant logic into the new files. No behavioral change.
- **`meLoaded` gate on the login banner.** While the `me` fetch is in flight, the banner is hidden to avoid a flash of "Увійдіть…" for logged-in users on slow networks. Once `meLoaded` is true and `me` is `null`, the banner renders.
- **Sub-block components do not duplicate `me` fetches.** They no longer call `loadMe`; they just react to the `meId` prop. Removing the rating's old internal `loadMe` was the whole point of this refactor.
- **No backend changes**, no API client changes, no type re-exports needed. `Rating`, `RatingAggregate`, `Comment` types continue to flow from `@/services`.
- All commit checkpoints are non-autonomous per the user's standing policy.
