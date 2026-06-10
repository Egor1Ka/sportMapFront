'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { setLocale } from '@/app/actions/locale'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
	const locale = useLocale()
	const [isPending, startTransition] = useTransition()

	function handleSwitch(newLocale: string) {
		startTransition(async () => {
			await setLocale(newLocale)
		})
	}

	return (
		<div className="flex gap-1">
			<Button
				variant={locale === 'en' ? 'default' : 'outline'}
				size="sm"
				onClick={() => handleSwitch('en')}
				disabled={isPending}
				className="h-8 px-3 text-xs"
			>
				EN
			</Button>
			<Button
				variant={locale === 'uk' ? 'default' : 'outline'}
				size="sm"
				onClick={() => handleSwitch('uk')}
				disabled={isPending}
				className="h-8 px-3 text-xs"
			>
				UK
			</Button>
		</div>
	)
}
