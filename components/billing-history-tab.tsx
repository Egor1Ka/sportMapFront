'use client'

import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
} from '@/components/ui/empty'
import type { BillingPayment } from '@/services'

interface BillingHistoryTabProps {
	payments: BillingPayment[]
}

export function BillingHistoryTab({ payments }: BillingHistoryTabProps) {
	if (payments.length === 0) {
		return (
			<div className="pt-6">
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No payments yet</EmptyTitle>
						<EmptyDescription>
							Your payment history will appear here after your first purchase.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		)
	}

	return (
		<div className="pt-6">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Event</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{payments.map((payment) => (
						<TableRow key={payment.id}>
							<TableCell>
								{new Date(payment.createdAt).toLocaleDateString()}
							</TableCell>
							<TableCell>
								{(payment.amount / 100).toFixed(2)}{' '}
								{payment.currency.toUpperCase()}
							</TableCell>
							<TableCell>
								<Badge variant="outline" className="capitalize">
									{payment.type.replaceAll('_', ' ')}
								</Badge>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{payment.eventType.replaceAll('.', ' ')}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
