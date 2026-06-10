# App Sidebar — Design Spec

**Date:** 2026-05-17
**Status:** Approved (design phase)

## Goal

Add a single, beautiful sidebar that wraps every route in the application **except** the landing page (`/`) and the auth pages (`/login`, `/signup`). The sidebar carries the main navigation (currently just **Map**) and the user identity / actions block (profile dropdown, sign-out, billing — or a "Sign in" call to action when the visitor is anonymous).

## Scope

In scope:

- A shared `AppShell` component that renders shadcn `Sidebar` (variant `floating`, `collapsible="icon"`).
- Restructuring `app/[locale]/` route groups so the same shell is reused across protected and one public app route.
- Migration of user-menu functionality from the existing top-bar (`components/app-header.tsx`) into a new sidebar footer block (`NavUser`).
- Support for the `/sports-map` page being usable without authentication (footer shows "Sign in" instead of user info).

Out of scope:

- Language switcher inside the sidebar (lives only on the auth pages and landing).
- Theme toggle (dark/light).
- Multi-tenant / org switcher.
- Reorganising the content of the existing pages (`dashboard`, `billing`, `staff`, `org`, `book`, `sports-map`). We only change their wrapping layout.

## Current state (verified)

`app/[locale]/` currently contains:

- `(landing)/` — `/` lives here, has its own `Header` + `Footer` from `components/landing/`.
- `(auth)/` — `/login`, `/signup` with their own centred layout.
- `(app)/` — `dashboard`, `billing` wrapped by a top-bar (`components/app-header.tsx`) and auth-guarded by `getUser()` redirect.
- Top-level routes (NOT inside a route group): `sports-map`, `staff`, `org`, `book` — these only have the locale layout, no sidebar, no auth guard.

The header today shows the user avatar + name and a dropdown with `Edit name`, `Billing`, `Logout`.

`UserProvider` (`lib/auth/user-provider.tsx`) currently requires a non-null `User` and `useUser()` throws otherwise.

`getUser()` already returns `Promise<User | null>`.

## Target route structure

```
app/[locale]/
├── (landing)/          # / — public landing, NO sidebar
│   └── …
├── (auth)/             # /login, /signup — NO sidebar
│   └── …
├── (public-app)/       # NEW group — has sidebar, user may be null
│   └── sports-map/
│       ├── page.tsx
│       ├── new/
│       └── [id]/
└── (app)/              # has sidebar, REQUIRES auth (redirects to /login)
    ├── layout.tsx
    ├── dashboard/
    ├── billing/
    ├── staff/          # MOVED in from top level
    ├── org/            # MOVED in from top level
    └── book/           # MOVED in from top level
```

Folder moves:

- `app/[locale]/sports-map/` → `app/[locale]/(public-app)/sports-map/`
- `app/[locale]/staff/` → `app/[locale]/(app)/staff/`
- `app/[locale]/org/` → `app/[locale]/(app)/org/`
- `app/[locale]/book/` → `app/[locale]/(app)/book/`

Route URLs are unchanged — route groups (`(parens)`) do not contribute to the URL path.

## Layouts

### `app/[locale]/(app)/layout.tsx` (rewritten)

```tsx
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { getUser } from '@/lib/auth/get-user'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const user = await getUser()
	if (!user) redirect('/login')

	return <AppShell user={user}>{children}</AppShell>
}
```

The old `<UserProvider>` and `<AppHeader>` are gone from this file — the provider is now wired inside `AppShell`, and the header is replaced by the sidebar footer.

### `app/[locale]/(public-app)/layout.tsx` (new)

```tsx
import { AppShell } from '@/components/app-shell/app-shell'
import { getUser } from '@/lib/auth/get-user'

export default async function PublicAppLayout({ children }: { children: React.ReactNode }) {
	const user = await getUser()
	return <AppShell user={user}>{children}</AppShell>
}
```

No redirect — anonymous visitors are allowed.

## Components

### `components/app-shell/app-shell.tsx`

```tsx
'use client'

import type { User } from '@/services'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { UserProvider } from '@/lib/auth/user-provider'
import { AppSidebar } from './app-sidebar'

type Props = { user: User | null; children: React.ReactNode }

export function AppShell({ user, children }: Props) {
	return (
		<UserProvider user={user}>
			<SidebarProvider defaultOpen>
				<AppSidebar />
				<SidebarInset>{children}</SidebarInset>
			</SidebarProvider>
		</UserProvider>
	)
}
```

### `components/app-shell/app-sidebar.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '@/components/ui/sidebar'
import { NavUser } from './nav-user'

export function AppSidebar() {
	const pathname = usePathname()
	const t = useTranslations('nav')

	const isMapActive = pathname.includes('/sports-map')

	return (
		<Sidebar variant="floating" collapsible="icon">
			<SidebarHeader>
				<Link
					href="/"
					className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center"
				>
					<span className="text-lg">🏃</span>
					<span className="font-semibold group-data-[collapsible=icon]:hidden">
						SportMap
					</span>
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
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<NavUser />
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	)
}
```

Notes:

- `SidebarMenuButton` from `components/ui/sidebar.tsx` uses `useRender`, so we pass `render={<Link … />}` to render a real `next/link` anchor while keeping the button styling.
- The header logo is intentionally minimal. Replace the emoji with an SVG/logo when one exists; keeping the placeholder explicit makes that swap a one-line change.
- `group-data-[collapsible=icon]:hidden` is the existing sidebar convention for hiding text in icon mode.

### `components/app-shell/nav-user.tsx`

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, Pencil, CreditCard, MoreVertical } from 'lucide-react'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
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

	const handleNameUpdated = (updated: User) => {
		setUser(updated)
		setEditOpen(false)
	}

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground h-12 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!',
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
						<DropdownMenuContent
							side="right"
							align="end"
							className="w-56"
						>
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
								<DropdownMenuItem onClick={() => setEditOpen(true)}>
									<Pencil />
									Edit profile
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => router.push('/billing')}>
									<CreditCard />
									Billing
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
```

Notes:

- The DropdownMenu opens to the right (`side="right"`) because the sidebar is on the left edge — feels natural and avoids covering the menu button.
- Local copy `useState(initialUser)` mirrors the existing `AppHeader` behaviour: after `Edit profile` succeeds we update the displayed name without a refetch.
- The dropdown trigger is a styled `DropdownMenuTrigger` (a button) — not `SidebarMenuButton` wrapped via `asChild`. The project uses `@base-ui/react`, which has no `asChild` slot; styling is replicated inline so the trigger still reads as a sidebar menu row. The same classes used by `SidebarMenuButton` (`peer/menu-button`, `group/menu-button`, the hover / collapse rules) are applied directly.
- `data-popup-open:*` is the base-ui equivalent of "is open" — kept so the row stays highlighted while the menu is open.

## `UserProvider` changes

`lib/auth/user-provider.tsx` is updated to accept a nullable user and to expose two hooks:

```tsx
'use client'

import { createContext, useContext } from 'react'
import type { User } from '@/services/configs/user.config'

const UserContext = createContext<User | null>(null)

function UserProvider({
	user,
	children,
}: {
	user: User | null
	children: React.ReactNode
}) {
	return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

function useUser(): User {
	const user = useContext(UserContext)
	if (!user) throw new Error('useUser must be used within an authenticated UserProvider')
	return user
}

function useUserOptional(): User | null {
	return useContext(UserContext)
}

export { UserProvider, useUser, useUserOptional }
```

`useUser()` keeps its original strict semantics so existing call-sites in `(app)/` continue to work. `useUserOptional()` is what the public sidebar footer uses.

## Removed

- `components/app-header.tsx` — replaced by `NavUser`. Delete the file once nothing imports it.
- The top-bar `<header>` wrapper inside `(app)/layout.tsx` — replaced by `AppShell`.

## i18n

A new translation namespace `nav` with one key for now:

```json
{
	"nav": { "map": "Map" }
}
```

Added to both `i18n/messages/en.json` and `i18n/messages/uk.json` (`Map` / `Карта`).

User-menu strings (`Edit profile`, `Billing`, `Logout`, `Sign in`) follow whatever the existing `AppHeader` does today — keep them hard-coded English for parity with the current code, or move them under `nav.user.*` if i18n there is desired later. Default decision: **hard-coded for parity**, matching `AppHeader`'s current behaviour.

## Behaviour

- On desktop the sidebar is `floating` with rounded corners + shadow, default-open.
- `⌘B` / `Ctrl+B` toggles between expanded and icon-collapsed (built into `SidebarProvider`).
- The collapsed state is persisted via the `sidebar_state` cookie (already implemented in `components/ui/sidebar.tsx`).
- On mobile (`useIsMobile` → viewport < 768px) the sidebar automatically renders as a Sheet drawer (already implemented).
- The active nav item uses `pathname.includes('/sports-map')` so deep routes like `/sports-map/new` and `/sports-map/[id]` keep Map highlighted.

## Active-route highlighting

For the single Map item, `pathname.includes('/sports-map')` is sufficient. If more items are added later, switch to a per-item helper that strips the `/[locale]` prefix and matches by `startsWith`.

## Verification

After implementation, manually verify in the browser:

1. `/` — landing renders without the sidebar.
2. `/login`, `/signup` — auth pages render without the sidebar.
3. `/sports-map` (logged out) — sidebar visible, footer shows **Sign in** button → goes to `/login`.
4. `/sports-map` (logged in) — sidebar visible, footer shows avatar + name + email + dropdown.
5. `/dashboard`, `/billing`, `/staff/...`, `/org/...`, `/book/...` (logged out) — redirected to `/login`.
6. `/dashboard` (logged in) — sidebar visible, Map item NOT highlighted, page content present, user menu in footer.
7. `⌘B` collapses sidebar to icon column; tooltips appear on hover; user dropdown still opens.
8. Mobile width (<768px) — sidebar is hidden, opens as a drawer via the `SidebarTrigger` (add one inside each page header if a trigger is needed on mobile; otherwise rely on the rail / cookie default).
9. `Edit profile` from the dropdown still opens the existing `EditProfileDialog` and updates the displayed name.
10. `Logout` calls `useLogout()` and lands on `/login`.

Run `npm run lint` and `npm run build` — both must pass.

## Open follow-ups (not part of this work)

- A mobile `SidebarTrigger` placement decision (in a top app-bar inside each page? a floating button?). For now mobile users open the sidebar via the rail or by tapping the edge — same as shadcn default.
- Theme toggle / language switcher inside the sidebar footer — explicitly excluded from this scope.
