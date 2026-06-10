'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { OrgStaffMember } from '@/services/configs/booking.types'

interface StaffTabsProps {
	staff: OrgStaffMember[]
	selectedId: string | null
	behavior: 'select-one' | 'show-all'
	allowAll?: boolean
	onSelect: (id: string | null) => void
}

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

function StaffTabs({
	staff,
	selectedId,
	behavior,
	allowAll = false,
	onSelect,
}: StaffTabsProps) {
	const t = useTranslations('booking')

	const isSelected = (member: OrgStaffMember): boolean =>
		selectedId === member.id

	const isActive = (member: OrgStaffMember): boolean =>
		behavior === 'show-all' || isSelected(member) || selectedId === null

	const handleClick = (member: OrgStaffMember) => () => {
		if (behavior === 'show-all') return
		const nextId = isSelected(member) ? null : member.id
		onSelect(nextId)
	}

	const handleAllClick = () => onSelect(null)

	const allActive = selectedId === null
	const showAllTab = allowAll && behavior === 'select-one'

	const renderTab = (member: OrgStaffMember) => (
		<button
			key={member.id}
			type="button"
			onClick={handleClick(member)}
			className={cn(
				'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 transition-opacity',
				isActive(member) ? 'opacity-100' : 'opacity-40',
				behavior === 'select-one' && 'cursor-pointer hover:opacity-80',
				behavior === 'show-all' && 'cursor-default',
			)}
		>
			<Avatar className="size-6">
				<AvatarImage src={member.avatar} alt={member.name} />
				<AvatarFallback className="text-[10px]">
					{getInitials(member.name)}
				</AvatarFallback>
			</Avatar>
			<span className="text-sm font-medium">{member.name}</span>
			<Badge variant="secondary" className="text-[10px]">
				{member.bookingCount}
			</Badge>
		</button>
	)

	return (
		<ScrollArea className="w-full">
			<div className="flex gap-2 pb-2">
				{showAllTab ? (
					<button
						type="button"
						onClick={handleAllClick}
						className={cn(
							'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 transition-opacity cursor-pointer hover:opacity-80',
							allActive ? 'opacity-100' : 'opacity-40',
						)}
					>
						<span className="text-sm font-medium">{t('allStaff')}</span>
					</button>
				) : null}
				{staff.map(renderTab)}
			</div>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	)
}

export { StaffTabs }
