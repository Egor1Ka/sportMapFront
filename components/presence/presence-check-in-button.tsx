'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { checkInApi } from '@/services'
import { ApiError } from '@/services'
import { useUserOptional } from '@/lib/auth/user-provider'
import type { CheckInViewer } from '@/services'

interface PresenceCheckInButtonProps {
	playgroundId: string
	viewer: CheckInViewer | null
	onChange?: (next: CheckInViewer, activeCount: number) => void
}

const formatExpires = (iso: string): string =>
	new Intl.DateTimeFormat(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(new Date(iso))

const handleLogin = () => {
	const returnTo =
		typeof window !== 'undefined' ? window.location.pathname : '/'
	window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
}

function PresenceCheckInButton({
	playgroundId,
	viewer,
	onChange,
}: PresenceCheckInButtonProps) {
	const user = useUserOptional()
	const t = useTranslations('presence')
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [busy, setBusy] = useState(false)

	if (!user) {
		return (
			<Button variant="default" onClick={handleLogin}>
				{t('loginToCheckIn')}
			</Button>
		)
	}

	const performCheckIn = async () => {
		setBusy(true)
		try {
			const result = await checkInApi.checkIn({ pathParams: { playgroundId } })
			onChange?.(result.viewer, result.activeCount)
			startTransition(() => router.refresh())
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		} finally {
			setBusy(false)
		}
	}

	const performCheckOut = async () => {
		setBusy(true)
		try {
			const result = await checkInApi.checkOut({ pathParams: { playgroundId } })
			onChange?.(result.viewer, result.activeCount)
			startTransition(() => router.refresh())
		} catch (err) {
			if (!(err instanceof ApiError)) throw err
		} finally {
			setBusy(false)
		}
	}

	const isCheckedIn = !!viewer?.isCheckedIn
	const expires = viewer?.expiresAt ?? null

	if (isCheckedIn) {
		const label = expires
			? t('youArePresent', { time: formatExpires(expires) })
			: t('youArePresentNoTime')
		return (
			<div className="flex flex-col gap-2 sm:flex-row">
				<Button
					variant="secondary"
					onClick={performCheckIn}
					disabled={busy || isPending}
				>
					{label}
				</Button>
				<Button
					variant="outline"
					onClick={performCheckOut}
					disabled={busy || isPending}
				>
					{t('checkOutCta')}
				</Button>
			</div>
		)
	}

	return (
		<Button onClick={performCheckIn} disabled={busy || isPending}>
			{t('checkInCta')}
		</Button>
	)
}

export { PresenceCheckInButton }
