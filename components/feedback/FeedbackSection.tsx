'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MessageSquare } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import { FeedbackRating } from './FeedbackRating'
import { FeedbackComments } from './FeedbackComments'

type MeInfo = { id: string; isAdmin: boolean } | null

const loadMe = async (): Promise<MeInfo> => {
	try {
		const response = await fetch('/api/user/profile', {
			credentials: 'include',
		})
		if (!response.ok) return null
		const payload = (await response.json()) as
			| { data?: { id?: string; role?: string } }
			| null
		const user = payload?.data
		if (!user || !user.id) return null
		return { id: user.id, isAdmin: user.role === 'admin' }
	} catch {
		return null
	}
}

type FeedbackSectionProps = {
	targetType: 'playground'
	targetId: string
}

const FeedbackSection = ({ targetType, targetId }: FeedbackSectionProps) => {
	const t = useTranslations('feedbackUi.section')
	const [me, setMe] = useState<MeInfo>(null)
	const [meLoaded, setMeLoaded] = useState(false)

	useEffect(() => {
		let cancelled = false
		const run = async () => {
			const result = await loadMe()
			if (cancelled) return
			setMe(result)
			setMeLoaded(true)
		}
		run()
		return () => {
			cancelled = true
		}
	}, [])

	const meId = me?.id ?? null
	const isAdmin = me?.isAdmin ?? false

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MessageSquare className="h-5 w-5" />
					{t('title')}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{meLoaded && !me ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<MessageSquare />
							</EmptyMedia>
							<EmptyTitle>{t('signInTitle')}</EmptyTitle>
							<EmptyDescription>{t('signInDescription')}</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Link
								href="/login"
								className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
							>
								{t('signIn')}
							</Link>
						</EmptyContent>
					</Empty>
				) : null}

				<FeedbackRating
					targetType={targetType}
					targetId={targetId}
					meId={meId}
				/>

				<Separator />

				<FeedbackComments
					targetType={targetType}
					targetId={targetId}
					meId={meId}
					isAdmin={isAdmin}
				/>
			</CardContent>
		</Card>
	)
}

export { FeedbackSection }
