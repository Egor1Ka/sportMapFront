'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Error({
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	const t = useTranslations('errors')

	return (
		<div
			className={cn(
				'bg-background flex min-h-screen flex-col items-center justify-center px-6',
			)}
		>
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				<AlertCircle className="text-destructive size-12" />
				<div className="flex flex-col gap-2">
					<h1 className="text-foreground text-xl font-semibold">
						{t('title')}
					</h1>
					<p className="text-muted-foreground">{t('description')}</p>
				</div>
				<div className="flex gap-3">
					<Button variant="outline" onClick={reset}>
						{t('tryAgain')}
					</Button>
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link href="/" />}
					>
						{t('goHome')}
					</Button>
				</div>
			</div>
		</div>
	)
}
