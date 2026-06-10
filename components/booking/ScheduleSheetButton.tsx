'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { SettingsIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet'
import { ScheduleEditor } from './ScheduleEditor'
import { ScheduleOverrideForm } from './ScheduleOverrideForm'
import type {
	ScheduleTemplate,
	WeeklyHours,
	CreateScheduleOverrideBody,
} from '@/services/configs/booking.types'

interface ScheduleSheetButtonProps {
	schedule: ScheduleTemplate
	onSaveSchedule: (weeklyHours: WeeklyHours[]) => Promise<void>
	onSaveOverride: (body: CreateScheduleOverrideBody) => Promise<void>
}

function ScheduleSheetButton({
	schedule,
	onSaveSchedule,
	onSaveOverride,
}: ScheduleSheetButtonProps) {
	const t = useTranslations('booking')
	const [open, setOpen] = useState(false)

	const handleSaveSchedule = async (weeklyHours: WeeklyHours[]) => {
		await onSaveSchedule(weeklyHours)
		setOpen(false)
	}

	const handleSaveOverride = async (body: CreateScheduleOverrideBody) => {
		await onSaveOverride(body)
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors"
			>
				<SettingsIcon className="size-4" />
				{t('schedule.settings')}
			</SheetTrigger>
			<SheetContent className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{t('schedule.settings')}</SheetTitle>
					<SheetDescription>
						{t('schedule.settingsDescription')}
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col gap-6 py-4">
					<ScheduleEditor
						schedule={schedule}
						onSave={handleSaveSchedule}
					/>
					<Separator />
					<ScheduleOverrideForm
						staffId={schedule.staffId}
						onSave={handleSaveOverride}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export { ScheduleSheetButton }
