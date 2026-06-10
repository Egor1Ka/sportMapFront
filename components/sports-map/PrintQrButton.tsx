'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { QrCode } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PrintQrButtonProps {
	playgroundId: string
	className?: string
}

function PrintQrButton({ playgroundId, className }: PrintQrButtonProps) {
	const t = useTranslations('sportsMapUi')
	const href = `/sports-map/${playgroundId}/print`

	return (
		<Link
			href={href}
			target="_blank"
			rel="noopener"
			aria-label={t('printQr.ariaLabel')}
			className={cn(
				buttonVariants({ variant: 'outline', size: 'sm' }),
				'w-full',
				className,
			)}
		>
			<QrCode className="mr-1 h-4 w-4" />
			{t('printQr.label')}
		</Link>
	)
}

export { PrintQrButton }
