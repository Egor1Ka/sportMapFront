'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

type CollapsibleCardProps = {
	title: React.ReactNode
	meta?: React.ReactNode
	description?: React.ReactNode
	actions?: React.ReactNode
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	className?: string
	contentClassName?: string
	children: React.ReactNode
}

const CollapsibleCard = ({
	title,
	meta,
	description,
	actions,
	defaultOpen = false,
	open,
	onOpenChange,
	className,
	contentClassName,
	children,
}: CollapsibleCardProps) => (
	<Card className={className}>
		<Collapsible
			defaultOpen={defaultOpen}
			open={open}
			onOpenChange={onOpenChange}
		>
			<div className="flex items-center gap-2 px-4">
				<CollapsibleTrigger
					className={cn(
						'group/collcard flex flex-1 items-center gap-3 rounded-md py-1 text-left transition',
						'hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
					)}
				>
					<ChevronDown
						className="text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200 group-aria-expanded/collcard:rotate-180"
						aria-hidden
					/>
					<div className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="text-base leading-snug font-medium">{title}</span>
						{meta ? (
							<span className="text-muted-foreground text-sm font-normal">
								{meta}
							</span>
						) : null}
					</div>
				</CollapsibleTrigger>
				{actions ? (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				) : null}
			</div>
			<CollapsibleContent className="data-open:animate-collapsible-down data-closed:animate-collapsible-up overflow-hidden">
				{description ? (
					<p className="text-muted-foreground -mt-2 px-4 pb-2 text-xs">
						{description}
					</p>
				) : null}
				<CardContent className={cn(contentClassName)}>{children}</CardContent>
			</CollapsibleContent>
		</Collapsible>
	</Card>
)

export { CollapsibleCard }
