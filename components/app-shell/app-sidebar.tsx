'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MapIcon, Radio, ShieldCheck } from 'lucide-react'

import { DvirLogo } from '@/components/brand/dvir-logo'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '@/components/ui/sidebar'
import { useUserOptional } from '@/lib/auth/user-provider'
import { useAdminPendingCount } from '@/hooks/use-admin-pending-count'

import { NavUser } from './nav-user'

export function AppSidebar() {
	const pathname = usePathname()
	const t = useTranslations('nav')
	const user = useUserOptional()
	const isAdmin = user?.isAdmin ?? false
	const pendingCount = useAdminPendingCount(isAdmin)

	const isMapActive = pathname.includes('/sports-map')
	const isActivityActive = pathname.includes('/activity')
	const isModerationActive = pathname.includes('/admin/playground-requests')

	return (
		<Sidebar collapsible="offcanvas">
			<SidebarHeader className="border-sidebar-border border-b py-3">
				<Link
					href="/"
					aria-label="Dvir"
					className="flex items-center px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
				>
					<DvirLogo
						markClassName="size-8"
						wordmarkClassName="text-xl"
						className="group-data-[collapsible=icon]:gap-0 [&>span:last-child]:group-data-[collapsible=icon]:hidden"
					/>
				</Link>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									tooltip={t('map')}
									isActive={isMapActive}
									render={<Link href="/sports-map" />}
								>
									<MapIcon />
									<span>{t('map')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									tooltip={t('activity')}
									isActive={isActivityActive}
									render={<Link href="/activity" />}
								>
									<Radio />
									<span>{t('activity')}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
							{isAdmin ? (
								<SidebarMenuItem>
									<SidebarMenuButton
										tooltip={t('moderation')}
										isActive={isModerationActive}
										render={<Link href="/admin/playground-requests" />}
									>
										<ShieldCheck />
										<span>{t('moderation')}</span>
									</SidebarMenuButton>
									{pendingCount > 0 ? (
										<SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>
									) : null}
								</SidebarMenuItem>
							) : null}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-sidebar-border border-t">
				<NavUser />
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	)
}
