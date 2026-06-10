'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Inbox } from 'lucide-react'

import {
	playgroundEditRequestApi,
	ApiError,
	type EditRequestStatus,
	type EditRequestWithPlayground,
} from '@/services'
import { RequestCard } from '@/components/admin/RequestCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TabValue = EditRequestStatus
const TABS: TabValue[] = ['pending', 'approved', 'rejected']

const removeFromList = (
	list: EditRequestWithPlayground[],
	requestId: string,
): EditRequestWithPlayground[] => list.filter((item) => item.request.id !== requestId)

function AdminPlaygroundRequestsPage() {
	const t = useTranslations('admin.requests')

	const [status, setStatus] = useState<TabValue>('pending')
	const [items, setItems] = useState<EditRequestWithPlayground[]>([])
	const [loading, setLoading] = useState(true)
	const [actionId, setActionId] = useState<string | null>(null)

	const fetchList = useCallback(async (next: TabValue) => {
		setLoading(true)
		try {
			const result = await playgroundEditRequestApi.list({
				queryParams: { status: next },
				silent: true,
			})
			setItems(result.items)
		} catch (err) {
			if (err instanceof ApiError) toast.error(err.displayMessage)
			setItems([])
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchList(status)
	}, [fetchList, status])

	const handleTabChange = (value: string) => setStatus(value as TabValue)

	const handleApprove = async (requestId: string) => {
		setActionId(requestId)
		const previous = items
		setItems(removeFromList(items, requestId))
		try {
			await playgroundEditRequestApi.approve({ pathParams: { id: requestId } })
			toast.success(t('toastApproved'))
		} catch (err) {
			setItems(previous)
			if (!(err instanceof ApiError)) toast.error(t('toastApproveFailed'))
		} finally {
			setActionId(null)
		}
	}

	const handleReject = async (requestId: string) => {
		setActionId(requestId)
		const previous = items
		setItems(removeFromList(items, requestId))
		try {
			await playgroundEditRequestApi.reject({ pathParams: { id: requestId } })
			toast.success(t('toastRejected'))
		} catch (err) {
			setItems(previous)
			if (!(err instanceof ApiError)) toast.error(t('toastRejectFailed'))
		} finally {
			setActionId(null)
		}
	}

	const renderTabLabel = (value: TabValue) => t(`tabs.${value}`)

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 p-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
				<p className="text-muted-foreground text-sm">{t('subtitle')}</p>
			</div>

			<Tabs value={status} onValueChange={handleTabChange}>
				<TabsList>
					{TABS.map((value) => (
						<TabsTrigger key={value} value={value}>
							{renderTabLabel(value)}
						</TabsTrigger>
					))}
				</TabsList>

				{TABS.map((value) => (
					<TabsContent key={value} value={value} className="mt-4 space-y-3">
						{loading && status === value ? (
							<RequestListLoading />
						) : items.length === 0 ? (
							<EmptyState message={t('empty')} />
						) : (
							items.map((pair) => (
								<RequestCard
									key={pair.request.id}
									pair={pair}
									pending={actionId === pair.request.id}
									resolved={value !== 'pending'}
									onApprove={handleApprove}
									onReject={handleReject}
								/>
							))
						)}
					</TabsContent>
				))}
			</Tabs>
		</div>
	)
}

function RequestListLoading() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-32 w-full" />
			<Skeleton className="h-32 w-full" />
		</div>
	)
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="border-border/60 text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed py-16">
			<Inbox className="size-8" />
			<p className="text-sm">{message}</p>
		</div>
	)
}

export default AdminPlaygroundRequestsPage
