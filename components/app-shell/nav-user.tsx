'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	CreditCard,
	LogIn,
	LogOut,
	Moon,
	MoreVertical,
	Pencil,
	Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { useUserOptional } from '@/lib/auth/user-provider'
import { useLogout } from '@/hooks/use-logout'
import { cn } from '@/lib/utils'
import type { User } from '@/services'

export function NavUser() {
	const user = useUserOptional()
	if (!user) return <SignInButton />
	return <UserMenu initialUser={user} />
}

function SignInButton() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					tooltip="Sign in"
					render={<Link href="/login" />}
				>
					<LogIn />
					<span>Sign in</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}

function UserMenu({ initialUser }: { initialUser: User }) {
	const router = useRouter()
	const [user, setUser] = useState(initialUser)
	const [editOpen, setEditOpen] = useState(false)
	const handleLogout = useLogout()
	const { theme, resolvedTheme, setTheme } = useTheme()

	const activeTheme = theme === 'system' ? resolvedTheme : theme
	const isDark = activeTheme === 'dark'

	const handleNameUpdated = (updated: User) => {
		setUser(updated)
		setEditOpen(false)
	}

	const openEdit = () => setEditOpen(true)
	const goBilling = () => router.push('/billing')
	const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="User menu"
							className={cn(
								'peer/menu-button group/menu-button flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding]',
								'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
								'data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground',
								'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!',
							)}
						>
							<Avatar size="sm">
								<AvatarImage
									src={user.avatar}
									alt={user.name}
									referrerPolicy="no-referrer"
								/>
								<AvatarFallback>
									{user.name?.charAt(0)?.toUpperCase() ?? '?'}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
								<span className="truncate font-medium">{user.name}</span>
								<span className="text-muted-foreground truncate text-xs">
									{user.email}
								</span>
							</div>
							<MoreVertical className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
						</DropdownMenuTrigger>
						<DropdownMenuContent side="right" align="end" className="w-56">
							<DropdownMenuGroup>
								<DropdownMenuLabel>
									<div className="flex flex-col gap-1">
										<span className="text-sm font-medium">{user.name}</span>
										<span className="text-muted-foreground text-xs">
											{user.email}
										</span>
									</div>
								</DropdownMenuLabel>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={openEdit}>
									<Pencil />
									Edit profile
								</DropdownMenuItem>
								<DropdownMenuItem onClick={goBilling}>
									<CreditCard />
									Billing
								</DropdownMenuItem>
								<DropdownMenuItem onClick={toggleTheme}>
									{isDark ? <Sun /> : <Moon />}
									{isDark ? 'Light theme' : 'Dark theme'}
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem onClick={handleLogout}>
									<LogOut />
									Logout
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>

			<EditProfileDialog
				user={user}
				open={editOpen}
				onOpenChange={setEditOpen}
				onSuccess={handleNameUpdated}
			/>
		</>
	)
}
