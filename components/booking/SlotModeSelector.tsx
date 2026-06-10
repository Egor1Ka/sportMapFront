'use client'

import { useTranslations } from 'next-intl'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { SlotMode } from '@/lib/slot-engine'

interface ModeOption {
	value: SlotMode
	label: string
	description: string
}

interface SlotModeSelectorProps {
	value: SlotMode
	onChange: (mode: SlotMode) => void
}

function SlotModeSelector({ value, onChange }: SlotModeSelectorProps) {
	const t = useTranslations('booking')

	const modeOptions: ModeOption[] = [
		{ value: 'fixed', label: t('modes.fixed'), description: t('modeDescriptions.fixed') },
		{ value: 'optimal', label: t('modes.optimal'), description: t('modeDescriptions.optimal') },
		{ value: 'dynamic', label: t('modes.dynamic'), description: t('modeDescriptions.dynamic') },
	]

	const handleChange = (newValue: unknown) => onChange(newValue as SlotMode)

	const renderOption = (option: ModeOption) => (
		<label key={option.value} className="flex cursor-pointer items-start gap-2">
			<RadioGroupItem value={option.value} className="mt-0.5" />
			<div>
				<div className="text-sm font-medium">{option.label}</div>
				<div className="text-muted-foreground text-xs">
					{option.description}
				</div>
			</div>
		</label>
	)

	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-muted-foreground text-sm font-medium">
				{t('slotMode')}
			</h3>
			<RadioGroup value={value} onValueChange={handleChange}>
				{modeOptions.map(renderOption)}
			</RadioGroup>
		</div>
	)
}

export { SlotModeSelector }
