'use client'

import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

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
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination'
import { CommentItem } from '@/components/comments/CommentItem'

const MAX_TEXT_LENGTH = 2000
const PAGE_SIZE = 10

const buildSchema = (minMsg: string, maxMsg: string) =>
	z.object({
		text: z
			.string()
			.trim()
			.min(1, minMsg)
			.max(MAX_TEXT_LENGTH, maxMsg),
	})
type FormData = z.infer<ReturnType<typeof buildSchema>>

type FeedbackCommentsProps = {
	targetType: 'playground'
	targetId: string
	meId: string | null
	isAdmin: boolean
}

const buildPageRange = (
	current: number,
	total: number,
): (number | 'ellipsis')[] => {
	if (total <= 1) return [1]
	const pages = new Set<number>([1, total, current - 1, current, current + 1])
	const sorted = Array.from(pages)
		.filter((page) => page >= 1 && page <= total)
		.sort((a, b) => a - b)
	const range: (number | 'ellipsis')[] = []
	const appendWithEllipsis = (page: number, prev: number | null) => {
		if (prev !== null && page - prev > 1) range.push('ellipsis')
		range.push(page)
	}
	sorted.reduce<number | null>((prev, page) => {
		appendWithEllipsis(page, prev)
		return page
	}, null)
	return range
}

const FeedbackComments = ({
	targetType,
	targetId,
	meId,
	isAdmin,
}: FeedbackCommentsProps) => {
	const t = useTranslations('feedbackUi.comments')
	const [items, setItems] = useState<Comment[]>([])
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(1)
	const [loading, setLoading] = useState(true)

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

	const schema = buildSchema(t('validationMin'), t('validationMax', { max: MAX_TEXT_LENGTH }))

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { text: '' },
	})

	const fetchPage = useCallback(
		async (nextPage: number, showToastOnError = false) => {
			setLoading(true)
			try {
				const offset = (nextPage - 1) * PAGE_SIZE
				const res = await commentApi.list({
					queryParams: { targetType, targetId, limit: PAGE_SIZE, offset },
					silent: !showToastOnError,
				})
				setItems(res.items)
				setTotal(res.total)
			} catch (err) {
				if (!showToastOnError) return
				const message =
					err instanceof ApiError
						? err.displayMessage
						: t('loadError')
				toast.error(message)
			} finally {
				setLoading(false)
			}
		},
		[targetType, targetId, t],
	)

	useEffect(() => {
		void fetchPage(page, page === 1)
	}, [fetchPage, page])

	const handlePageClick = (next: number) => (event: React.MouseEvent) => {
		event.preventDefault()
		if (next < 1 || next > totalPages || next === page) return
		setPage(next)
	}

	const onSubmit = async (data: FormData) => {
		try {
			await commentApi.create({
				body: { targetType, targetId, text: data.text },
			})
			reset()
			toast.success(t('toastPublished'))
			if (page !== 1) {
				setPage(1)
				return
			}
			await fetchPage(1)
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		}
	}

	const handleDelete = async (id: string) => {
		try {
			await commentApi.remove({ pathParams: { id } })
			toast.success(t('toastDeleted'))
			const remainingOnPage = items.length - 1
			if (remainingOnPage === 0 && page > 1) {
				setPage(page - 1)
				return
			}
			await fetchPage(page)
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				await fetchPage(page)
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

	const pageRange = buildPageRange(page, totalPages)

	const renderPaginationEntry = (
		entry: number | 'ellipsis',
		index: number,
	) => {
		if (entry === 'ellipsis') {
			return (
				<PaginationItem key={`ellipsis-${index}`}>
					<PaginationEllipsis />
				</PaginationItem>
			)
		}
		return (
			<PaginationItem key={entry}>
				<PaginationLink
					href="#"
					isActive={entry === page}
					onClick={handlePageClick(entry)}
				>
					{entry}
				</PaginationLink>
			</PaginationItem>
		)
	}

	return (
		<div className="space-y-4">
			<div className="text-muted-foreground text-sm">
				{t('heading')} <span className="text-foreground/70">({total})</span>
			</div>

			{meId ? (
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
					<Field data-invalid={!!errors.text || undefined}>
						<FieldLabel htmlFor="comment-text">{t('fieldLabel')}</FieldLabel>
						<Textarea
							id="comment-text"
							rows={3}
							maxLength={MAX_TEXT_LENGTH}
							placeholder={t('placeholder')}
							{...register('text')}
						/>
						<FieldDescription>{t('fieldDescription', { max: MAX_TEXT_LENGTH })}</FieldDescription>
						<FieldError errors={[errors.text]} />
					</Field>
					<div className="flex justify-end">
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? t('buttonSubmitting') : t('buttonSubmit')}
						</Button>
					</div>
				</form>
			) : null}

			{loading ? (
				<div className="space-y-3">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : items.length === 0 ? (
				<p className="text-muted-foreground py-4 text-center text-sm italic">
					{t('empty')}
				</p>
			) : (
				<div>{items.map(renderComment)}</div>
			)}

			{totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href="#"
								text={t('paginationPrev')}
								onClick={handlePageClick(page - 1)}
								aria-disabled={page <= 1}
								className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
						{pageRange.map(renderPaginationEntry)}
						<PaginationItem>
							<PaginationNext
								href="#"
								text={t('paginationNext')}
								onClick={handlePageClick(page + 1)}
								aria-disabled={page >= totalPages}
								className={
									page >= totalPages ? 'pointer-events-none opacity-50' : ''
								}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	)
}

export { FeedbackComments }
