'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MoreHorizontal, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { eventApi, ApiError } from '@/services'
import type { PlaygroundEvent } from '@/services'

interface EventMenuProps {
	event: PlaygroundEvent
	onEdit: () => void
	onCancelled: (updated: PlaygroundEvent) => void
}

function EventMenu({ event, onEdit, onCancelled }: EventMenuProps) {
	const t = useTranslations('events')
	const router = useRouter()
	const [confirmOpen, setConfirmOpen] = useState(false)
	const [busy, setBusy] = useState(false)

	const performCancel = async () => {
		setBusy(true)
		try {
			const updated = await eventApi.cancel({ pathParams: { id: event.id } })
			onCancelled(updated)
			router.refresh()
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		} finally {
			setBusy(false)
			setConfirmOpen(false)
		}
	}

	const openConfirm = () => setConfirmOpen(true)

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button variant="ghost" size="icon" aria-label={t('menu')} />
					}
				>
					<MoreHorizontal />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onEdit}>
						<Pencil className="mr-2 size-4" /> {t('edit')}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={openConfirm} variant="destructive">
						<X className="mr-2 size-4" /> {t('cancel')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('cancelConfirm')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('cancelConfirmDescription')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('back')}</AlertDialogCancel>
						<AlertDialogAction disabled={busy} onClick={performCancel}>
							{t('cancel')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export { EventMenu }
