'use client'

import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { getCalendarLocale } from '@/lib/calendar/utils'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { ScheduleTemplate, WeeklyHours } from '@/services/configs/booking.types'

const timeRangeSchema = z.object({
	start: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
	end: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
})

const daySchema = z.object({
	dayOfWeek: z.number(),
	enabled: z.boolean(),
	slots: z.array(timeRangeSchema),
})

const scheduleFormSchema = z.object({
	weeklyHours: z.array(daySchema),
})

type ScheduleFormData = z.infer<typeof scheduleFormSchema>

const toFormData = (schedule: ScheduleTemplate): ScheduleFormData => ({
	weeklyHours: schedule.weeklyHours.map((day) => ({
		dayOfWeek: day.dayOfWeek,
		enabled: day.enabled,
		slots: day.slots.length > 0
			? day.slots.map((s) => ({ start: s.start, end: s.end }))
			: [{ start: '10:00', end: '18:00' }],
	})),
})

interface ScheduleEditorProps {
	schedule: ScheduleTemplate
	onSave: (weeklyHours: WeeklyHours[]) => Promise<void>
}

interface DayRowProps {
	index: number
	control: ReturnType<typeof useForm<ScheduleFormData>>['control']
	register: ReturnType<typeof useForm<ScheduleFormData>>['register']
	watch: ReturnType<typeof useForm<ScheduleFormData>>['watch']
}

function DayRow({ index, control, register, watch }: DayRowProps) {
	const locale = useLocale()
	const calendarLocale = getCalendarLocale(locale)
	const dayOfWeek = watch(`weeklyHours.${index}.dayOfWeek`)
	const enabled = watch(`weeklyHours.${index}.enabled`)
	const dayName = calendarLocale.daysLong[dayOfWeek]

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">{dayName}</span>
				<Controller
					control={control}
					name={`weeklyHours.${index}.enabled`}
					render={({ field }) => (
						<Switch
							checked={field.value}
							onCheckedChange={field.onChange}
						/>
					)}
				/>
			</div>
			{enabled && (
				<div className="flex items-center gap-2">
					<Input
						type="time"
						className="w-28"
						{...register(`weeklyHours.${index}.slots.0.start`)}
					/>
					<span className="text-muted-foreground text-xs">—</span>
					<Input
						type="time"
						className="w-28"
						{...register(`weeklyHours.${index}.slots.0.end`)}
					/>
				</div>
			)}
		</div>
	)
}

function ScheduleEditor({ schedule, onSave }: ScheduleEditorProps) {
	const t = useTranslations('booking')
	const {
		control,
		register,
		handleSubmit,
		watch,
		formState: { isSubmitting },
	} = useForm<ScheduleFormData>({
		resolver: zodResolver(scheduleFormSchema),
		defaultValues: toFormData(schedule),
	})

	const { fields } = useFieldArray({
		control,
		name: 'weeklyHours',
	})

	const handleFormSubmit = async (data: ScheduleFormData) => {
		const toWeeklyHours = (day: ScheduleFormData['weeklyHours'][number]): WeeklyHours => ({
			dayOfWeek: day.dayOfWeek,
			enabled: day.enabled,
			slots: day.enabled ? day.slots : [],
		})

		await onSave(data.weeklyHours.map(toWeeklyHours))
	}

	const renderDay = (_field: (typeof fields)[number], index: number) => (
		<div key={_field.id}>
			<DayRow
				index={index}
				control={control}
				register={register}
				watch={watch}
			/>
			{index < fields.length - 1 && <Separator className="my-3" />}
		</div>
	)

	return (
		<form
			onSubmit={handleSubmit(handleFormSubmit)}
			className="flex flex-col gap-4"
		>
			<h3 className="text-sm font-semibold">{t('schedule.title')}</h3>
			<div className="flex flex-col gap-1">
				{fields.map(renderDay)}
			</div>
			<Button type="submit" disabled={isSubmitting} className="w-full">
				{isSubmitting ? t('saving') : t('schedule.save')}
			</Button>
		</form>
	)
}

export { ScheduleEditor }
