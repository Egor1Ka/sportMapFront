'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { UseFormSetError } from 'react-hook-form'
import { format } from 'date-fns'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { EventForm } from './event-form'
import type {
	EventFormValues,
	EventFormSubmitPayload,
	SportOption,
} from './event-form'
import { eventApi, ApiError, setServerErrors } from '@/services'
import type { PlaygroundEvent } from '@/services'

interface EventEditSheetProps {
	open: boolean
	onOpenChange: (next: boolean) => void
	event: PlaygroundEvent
	sports: SportOption[]
	onSaved: (updated: PlaygroundEvent) => void
}

const startToDateAndTime = (startAt: string) => {
	const start = new Date(startAt)
	return { date: start, time: format(start, 'HH:mm') }
}

function EventEditSheet({
	open,
	onOpenChange,
	event,
	sports,
	onSaved,
}: EventEditSheetProps) {
	const t = useTranslations('events')
	const router = useRouter()
	const { date, time } = startToDateAndTime(event.startAt)

	const submit = async (
		payload: EventFormSubmitPayload,
		setError: UseFormSetError<EventFormValues>,
	) => {
		try {
			const updated = await eventApi.update({
				pathParams: { id: event.id },
				body: payload,
			})
			onSaved(updated)
			toast.success(t('save'))
			onOpenChange(false)
			router.refresh()
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
			setServerErrors(err, setError as never)
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl"
			>
				<SheetHeader className="border-b px-6 py-5">
					<SheetTitle className="text-2xl font-semibold">{t('edit')}</SheetTitle>
				</SheetHeader>
				<div className="px-6 pt-5 pb-8">
					<EventForm
						sports={sports}
						defaultValues={{
							sportId: event.sport.id,
							date,
							time,
							durationMin: event.durationMin,
							hasLimit: event.maxParticipants !== null,
							maxParticipants: event.maxParticipants,
							description: event.description,
						}}
						submitLabel={t('save')}
						onSubmit={submit}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { EventEditSheet }
