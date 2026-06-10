'use client'

import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import { addMinutes, addDays, isSameDay, startOfDay } from 'date-fns'
import { uk as ukLocale } from 'date-fns/locale/uk'
import { CalendarDays, Clock, Hourglass, Users, AlignLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldError } from '@/components/ui/field'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { isStartInPast } from '@/lib/events/event-validators'
import { cn } from '@/lib/utils'
interface SportOption {
	id: string
	code?: string
	label: string
	icon: string | null
	color?: string | null
}

interface EventFormValues {
	sportId: string
	date: Date
	time: string
	durationMin: number
	hasLimit: boolean
	maxParticipants: number | null
	description: string | null
}

const buildSchema = (t: (key: string) => string) =>
	z.object({
		sportId: z.string().min(1, t('errors.sportRequired')),
		date: z.date(),
		time: z
			.string()
			.min(1, t('errors.timeRequired'))
			.regex(/^\d{2}:\d{2}$/, t('errors.timeInvalid')),
		durationMin: z.number().int().min(15).max(480),
		hasLimit: z.boolean(),
		maxParticipants: z.number().int().min(2).max(100).nullable(),
		description: z.string().max(280).nullable(),
	})

interface EventFormSubmitPayload {
	sportId: string
	startAt: string
	durationMin: number
	maxParticipants: number | null
	description: string | null
}

interface EventFormProps {
	sports: SportOption[]
	defaultValues: Partial<EventFormValues>
	submitLabel: string
	onSubmit: (
		values: EventFormSubmitPayload,
		setError: UseFormSetError<EventFormValues>,
	) => Promise<void>
}

const DURATION_PRESETS = [
	{ value: 30, key: '30m' as const },
	{ value: 60, key: '1h' as const },
	{ value: 90, key: '1h30m' as const },
	{ value: 120, key: '2h' as const },
	{ value: 180, key: '3h' as const },
]

const combineDateTime = (date: Date, time: string): Date => {
	const [hours, minutes] = time.split(':').map(Number)
	const local = startOfDay(date)
	return addMinutes(local, hours * 60 + minutes)
}

const isPastDay = (date: Date): boolean => {
	const today = startOfDay(new Date())
	return startOfDay(date).getTime() < today.getTime()
}

type DateLabelTranslations = {
	today: string
	tomorrow: string
}

const formatDateLabel = (date: Date, locale: string, labels: DateLabelTranslations): string => {
	const today = new Date()
	const tomorrow = addDays(today, 1)
	const formatter = new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'long',
	})
	if (isSameDay(date, today)) {
		return `${labels.today}, ${formatter.format(date)}`
	}
	if (isSameDay(date, tomorrow)) {
		return `${labels.tomorrow}, ${formatter.format(date)}`
	}
	const weekday = new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	}).format(date)
	return weekday
}

const normalizeDescription = (raw: string | null): string | null => {
	if (raw == null) return null
	const trimmed = raw.trim()
	return trimmed.length === 0 ? null : trimmed
}

const FieldHeader = ({
	icon,
	label,
}: {
	icon: React.ReactNode
	label: string
}) => (
	<div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
		<span className="text-foreground/70">{icon}</span>
		<span>{label}</span>
	</div>
)

function EventForm({
	sports,
	defaultValues,
	submitLabel,
	onSubmit,
}: EventFormProps) {
	const t = useTranslations('events')
	const tMap = useTranslations('sportsMapUi')
	const locale = useLocale()
	const schema = useMemo(() => buildSchema(t), [t])

	const {
		register,
		handleSubmit,
		control,
		watch,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<EventFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			sportId: defaultValues.sportId ?? '',
			date: defaultValues.date ?? new Date(),
			time: defaultValues.time ?? '',
			durationMin: defaultValues.durationMin ?? 60,
			hasLimit: defaultValues.hasLimit ?? false,
			maxParticipants: defaultValues.maxParticipants ?? null,
			description: defaultValues.description ?? null,
		},
	})

	const hasLimit = watch('hasLimit')
	const description = watch('description') ?? ''
	const selectedSportId = watch('sportId')
	const sportOptions = useMemo(() => sports, [sports])
	const selectedSport = useMemo(
		() => sportOptions.find((sport) => sport.id === selectedSportId) ?? null,
		[sportOptions, selectedSportId],
	)

	const submit = handleSubmit(async (values) => {
		const start = combineDateTime(values.date, values.time)
		if (isStartInPast(start)) {
			setError('time', {
				type: 'manual',
				message: t('errors.timeInPast'),
			})
			return
		}
		await onSubmit(
			{
				sportId: values.sportId,
				startAt: start.toISOString(),
				durationMin: values.durationMin,
				maxParticipants: values.hasLimit
					? (values.maxParticipants ?? 10)
					: null,
				description: normalizeDescription(values.description),
			},
			setError,
		)
	})

	const renderSportOption = (sport: SportOption) => (
		<SelectItem key={sport.id} value={sport.id}>
			<span className="flex items-center gap-2">
				{sport.icon && <span aria-hidden>{sport.icon}</span>}
				<span>{sport.label}</span>
			</span>
		</SelectItem>
	)

	const renderDurationOption = ({
		value,
		key,
	}: {
		value: number
		key: '30m' | '1h' | '1h30m' | '2h' | '3h'
	}) => (
		<SelectItem key={value} value={String(value)}>
			{t(`durationPreset.${key}`)}
		</SelectItem>
	)

	return (
		<form onSubmit={submit} className="flex flex-col gap-5">
			<Field data-invalid={!!errors.sportId || undefined}>
				<FieldHeader
					icon={<span aria-hidden>🏅</span>}
					label={t('fields.sport')}
				/>
				<Controller
					control={control}
					name="sportId"
					render={({ field }) => (
						<Select value={field.value} onValueChange={field.onChange}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={t('fields.sport')}>
									{selectedSport ? (
										<span className="flex items-center gap-2">
											{selectedSport.icon && (
												<span aria-hidden>{selectedSport.icon}</span>
											)}
											<span>{selectedSport.label}</span>
										</span>
									) : null}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>{sportOptions.map(renderSportOption)}</SelectContent>
						</Select>
					)}
				/>
				<FieldError errors={[errors.sportId]} />
			</Field>

			<Separator />

			<Field data-invalid={!!errors.date || !!errors.time || undefined}>
				<FieldHeader
					icon={<CalendarDays className="size-4" />}
					label={t('fields.when')}
				/>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
					<Controller
						control={control}
						name="date"
						render={({ field }) => (
							<Popover>
								<PopoverTrigger
									render={
										<Button
											type="button"
											variant="outline"
											className="w-full justify-start gap-2 sm:w-auto"
										/>
									}
								>
									<CalendarDays className="size-4" />
									{formatDateLabel(field.value, locale, {
											today: tMap('eventTime.today'),
											tomorrow: tMap('eventTime.tomorrow'),
										})}
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={field.value}
										onSelect={(date) => {
											if (date) field.onChange(date)
										}}
										disabled={isPastDay}
										locale={locale === 'uk' ? ukLocale : undefined}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						)}
					/>
					<div className="relative">
						<Clock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
						<Input
							type="time"
							step={60}
							className="w-full pl-9 sm:w-36"
							{...register('time')}
						/>
					</div>
				</div>
				<FieldError errors={[errors.date, errors.time]} />
			</Field>

			<Separator />

			<Field data-invalid={!!errors.durationMin || undefined}>
				<FieldHeader
					icon={<Hourglass className="size-4" />}
					label={t('fields.duration')}
				/>
				<Controller
					control={control}
					name="durationMin"
					render={({ field }) => (
						<Select
							value={String(field.value)}
							onValueChange={(value) => field.onChange(Number(value))}
						>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue>
									{t(
										`durationPreset.${
											DURATION_PRESETS.find(
												(preset) => preset.value === field.value,
											)?.key ?? '1h'
										}`,
									)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{DURATION_PRESETS.map(renderDurationOption)}
							</SelectContent>
						</Select>
					)}
				/>
				<FieldError errors={[errors.durationMin]} />
			</Field>

			<Separator />

			<Field>
				<div className="flex items-center justify-between gap-3">
					<FieldHeader
						icon={<Users className="size-4" />}
						label={t('fields.limit')}
					/>
					<Controller
						control={control}
						name="hasLimit"
						render={({ field }) => (
							<Switch
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						)}
					/>
				</div>
				{hasLimit && (
					<Controller
						control={control}
						name="maxParticipants"
						render={({ field }) => (
							<Input
								type="number"
								inputMode="numeric"
								min={2}
								max={100}
								placeholder="10"
								value={field.value ?? ''}
								onChange={(event) =>
									field.onChange(
										event.target.value === '' ? null : Number(event.target.value),
									)
								}
								className="w-full sm:w-32"
							/>
						)}
					/>
				)}
				<FieldError errors={[errors.maxParticipants]} />
			</Field>

			<Separator />

			<Field data-invalid={!!errors.description || undefined}>
				<FieldHeader
					icon={<AlignLeft className="size-4" />}
					label={t('fields.description')}
				/>
				<Textarea
					placeholder={t('fields.descriptionPlaceholder')}
					rows={3}
					{...register('description')}
				/>
				<div className="text-muted-foreground flex justify-end text-xs">
					<span data-slot="char-count">{description.length} / 280</span>
				</div>
				<FieldError errors={[errors.description]} />
			</Field>

			<Button
				type="submit"
				size="lg"
				disabled={isSubmitting}
				className={cn('mt-2 w-full')}
			>
				{isSubmitting ? t('saving') : submitLabel}
			</Button>
		</form>
	)
}

export { EventForm }
export type { EventFormValues, EventFormSubmitPayload, SportOption }
