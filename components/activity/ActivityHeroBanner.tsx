'use client'

import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface Props {
	onAllow: () => void
}

const ActivityHeroBanner = ({ onAllow }: Props) => {
	const t = useTranslations('activity.hero')
	return (
		<div className="border-b">
			<div className="from-primary/10 via-primary/5 to-background relative overflow-hidden bg-gradient-to-br px-6 py-8">
				<div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
					<div className="bg-primary/10 ring-primary/20 flex h-14 w-14 items-center justify-center rounded-full ring-4">
						<MapPin className="text-primary h-7 w-7" />
					</div>
					<div className="space-y-1">
						<h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
							{t('title')}
						</h2>
						<p className="text-muted-foreground text-sm sm:text-base">
							{t('subtitle')}
						</p>
					</div>
					<Button size="lg" onClick={onAllow}>
						<MapPin className="mr-2 h-4 w-4" />
						{t('cta')}
					</Button>
					<p className="text-muted-foreground/80 text-xs">{t('hint')}</p>
				</div>
			</div>
		</div>
	)
}

export { ActivityHeroBanner }
