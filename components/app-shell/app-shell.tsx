'use client'

import type { User } from '@/services'
import { DvirLogo } from '@/components/brand/dvir-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { UserProvider } from '@/lib/auth/user-provider'

import { AppSidebar } from './app-sidebar'

type Props = {
	user: User | null
	children: React.ReactNode
}

export function AppShell({ user, children }: Props) {
	return (
		<UserProvider user={user}>
			<SidebarProvider
				defaultOpen
				style={
					{
						'--sidebar-width': '13rem',
					} as React.CSSProperties
				}
			>
				<AppSidebar />
				<SidebarInset className="isolate">
					<header className="bg-background/80 sticky top-0 z-30 flex h-12 items-center gap-2 border-b px-3 backdrop-blur">
						<SidebarTrigger />
						<DvirLogo
							markClassName="h-6 w-6"
							wordmarkClassName="text-lg"
						/>
						<div className="ml-auto flex items-center gap-2">
							<LanguageSwitcher />
							<ThemeToggle />
						</div>
					</header>
					{children}
				</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
