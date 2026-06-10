'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	Field,
	FieldLabel,
	FieldError,
} from '@/components/ui/field'
import type { CreateScheduleOverrideBody } from '@/services/configs/booking.types'

interface ScheduleOverrideFormProps {
	staffId: string
	onSave: (body: CreateScheduleOverrideBody) => Promise<void>
}

function ScheduleOverrideForm({ staffId, onSave }: ScheduleOverrideFormProps) {
	const t = useTranslations('booking')

	const overrideSchema = z.object({
		date: z.string().min(1, t('validation.selectDate')),
		enabled: z.boolean(),
		slotStart: z.string().regex(/^\d{2}:\d{2}$/, t('validation.timeFormat')).optional(),
		slotEnd: z.string().regex(/^\d{2}:\d{2}$/, t('validation.timeFormat')).optional(),
		reason: z.string().optional(),
	})

	type OverrideFormData = z.infer<typeof overrideSchema>

	const {
		register,
		handleSubmit,
		control,
		watch,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<OverrideFormData>({
		resolver: zodResolver(overrideSchema),
		defaultValues: {
			date: '',
			enabled: false,
			slotStart: '10:00',
			slotEnd: '18:00',
			reason: '',
		},
	})

	const enabled = watch('enabled')

	const handleFormSubmit = async (data: OverrideFormData) => {
		const slots = data.enabled && data.slotStart && data.slotEnd
			? [{ start: data.slotStart, end: data.slotEnd }]
			: []

		await onSave({
			staffId,
			date: data.date,
			enabled: data.enabled,
			slots,
			reason: data.reason || undefined,
		})

		reset()
	}

	return (
		<form
			onSubmit={handleSubmit(handleFormSubmit)}
			className="flex flex-col gap-4"
		>
			<h3 className="text-sm font-semibold">{t('schedule.override')}</h3>

			<Field data-invalid={!!errors.date || undefined}>
				<FieldLabel htmlFor="override-date">{t('schedule.date')}</FieldLabel>
				<Input
					id="override-date"
					type="date"
					{...register('date')}
				/>
				<FieldError errors={[errors.date]} />
			</Field>

			<Field orientation="horizontal">
				<FieldLabel htmlFor="override-enabled">{t('schedule.workDay')}</FieldLabel>
				<Controller
					control={control}
					name="enabled"
					render={({ field }) => (
						<Switch
							id="override-enabled"
							checked={field.value}
							onCheckedChange={field.onChange}
						/>
					)}
				/>
			</Field>

			{enabled && (
				<div className="flex items-center gap-2">
					<Input
						type="time"
						className="w-28"
						{...register('slotStart')}
					/>
					<span className="text-muted-foreground text-xs">—</span>
					<Input
						type="time"
						className="w-28"
						{...register('slotEnd')}
					/>
				</div>
			)}

			<Separator />

			<Field data-invalid={!!errors.reason || undefined}>
				<FieldLabel htmlFor="override-reason">{t('schedule.reason')}</FieldLabel>
				<Input
					id="override-reason"
					placeholder={t('schedule.reasonPlaceholder')}
					{...register('reason')}
				/>
				<FieldError errors={[errors.reason]} />
			</Field>

			<Button type="submit" disabled={isSubmitting} className="w-full">
				{isSubmitting ? t('saving') : t('schedule.addException')}
			</Button>
		</form>
	)
}

export { ScheduleOverrideForm }
