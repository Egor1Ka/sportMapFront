'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { UseFormSetError } from 'react-hook-form'
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

interface EventCreateSheetProps {
	open: boolean
	onOpenChange: (next: boolean) => void
	playgroundId: string
	defaultSportId: string | null
	sports: SportOption[]
	onCreated?: () => void | Promise<void>
}

function EventCreateSheet({
	open,
	onOpenChange,
	playgroundId,
	defaultSportId,
	sports,
	onCreated,
}: EventCreateSheetProps) {
	const t = useTranslations('events')
	const router = useRouter()

	const submit = async (
		payload: EventFormSubmitPayload,
		setError: UseFormSetError<EventFormValues>,
	) => {
		try {
			await eventApi.create({
				pathParams: { playgroundId },
				body: payload,
			})
			toast.success(t('created'))
			onOpenChange(false)
			void onCreated?.()
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
					<SheetTitle className="text-2xl font-semibold">
						{t('createTitle')}
					</SheetTitle>
				</SheetHeader>
				<div className="px-6 pt-5 pb-8">
					<EventForm
						sports={sports}
						defaultValues={{
							sportId: defaultSportId ?? sports[0]?.id ?? '',
							durationMin: 60,
							hasLimit: false,
						}}
						submitLabel={t('createCta')}
						onSubmit={submit}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { EventCreateSheet }
