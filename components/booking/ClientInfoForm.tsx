'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import {
	Field,
	FieldLabel,
	FieldError,
} from '@/components/ui/field'

type ClientInfoData = { name: string; phone?: string; email?: string }

interface ClientInfoFormProps {
	onSubmit: (data: ClientInfoData) => void
	isSubmitting: boolean
}

function ClientInfoForm({ onSubmit, isSubmitting }: ClientInfoFormProps) {
	const t = useTranslations('booking')

	const clientInfoSchema = z.object({
		name: z.string().min(2, t('validation.nameMin')),
		phone: z.string().optional(),
		email: z.string().email(t('validation.invalidEmail')).optional().or(z.literal('')),
	})

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ClientInfoData>({
		resolver: zodResolver(clientInfoSchema),
		defaultValues: {
			name: '',
			phone: '',
			email: '',
		},
	})

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="flex flex-col gap-3"
		>
			<h4 className="text-sm font-medium">{t('clientInfo')}</h4>

			<Field data-invalid={!!errors.name || undefined}>
				<FieldLabel htmlFor="client-name">
					{t('clientName')}
				</FieldLabel>
				<Input
					id="client-name"
					placeholder={t('enterName')}
					{...register('name')}
				/>
				<FieldError errors={[errors.name]} />
			</Field>

			<Field data-invalid={!!errors.phone || undefined}>
				<FieldLabel htmlFor="client-phone">{t('phone')}</FieldLabel>
				<Input
					id="client-phone"
					type="tel"
					placeholder="+380..."
					{...register('phone')}
				/>
				<FieldError errors={[errors.phone]} />
			</Field>

			<Field data-invalid={!!errors.email || undefined}>
				<FieldLabel htmlFor="client-email">{t('email')}</FieldLabel>
				<Input
					id="client-email"
					type="email"
					placeholder="email@example.com"
					{...register('email')}
				/>
				<FieldError errors={[errors.email]} />
			</Field>

			<button
				type="submit"
				disabled={isSubmitting}
				className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 inline-flex h-9 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
			>
				{isSubmitting ? t('creating') : t('confirmBooking')}
			</button>
		</form>
	)
}

export { ClientInfoForm }
export type { ClientInfoData }
