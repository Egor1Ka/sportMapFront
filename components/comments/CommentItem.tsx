'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
	const t = useTranslations('feedbackUi.commentItem')
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
					<AvatarImage src={comment.author.avatar} alt={comment.author.name ?? t('userFallback')} />
				) : null}
				<AvatarFallback>{buildInitials(comment.author.name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-baseline gap-2 text-sm">
						<span className="font-medium">{comment.author.name ?? t('userFallback')}</span>
						<span className="text-muted-foreground text-xs">
							{formatCommentDate(comment.createdAt)}
						</span>
					</div>
					{canDelete ? (
						<AlertDialog>
							<AlertDialogTrigger
								aria-label={t('deleteAriaLabel')}
								disabled={deleting}
								className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
							>
								<Trash2 className="h-4 w-4" />
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
									<AlertDialogDescription>
										{t('deleteDialogDescription')}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t('deleteDialogCancel')}</AlertDialogCancel>
									<AlertDialogAction onClick={handleConfirmDelete}>
										{t('deleteDialogConfirm')}
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
