# App Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commit policy (user override):** The user's global memory says *never* commit autonomously — wait for an explicit "закоммить" / "commit" request. The `git commit` steps in this plan describe **what** to commit; do not run them until the user explicitly asks. After finishing the last code task, stage nothing and stop at the verification step.

**Goal:** Add a single shared sidebar to every authenticated route plus the public `/sports-map` route, with user identity + actions in the sidebar footer. Landing (`/`) and auth pages (`/login`, `/signup`) keep their current layouts.

**Architecture:** Two route groups inside `app/[locale]/` share one `AppShell` component (`SidebarProvider` + floating `Sidebar` + `SidebarInset`). `(app)/` requires auth and redirects to `/login`. `(public-app)/` allows anonymous users; the footer renders a "Sign in" link when there is no user. The existing top-bar `AppHeader` is deleted — its user dropdown moves into the sidebar footer (`NavUser`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui `Sidebar` (already in repo, variant `floating`, collapsible `icon`), `@base-ui/react` primitives, `next-intl`.

**Spec:** `docs/superpowers/specs/2026-05-17-app-sidebar-design.md`

**No automated tests:** the repo has no Jest/Vitest. Verification = `npm run lint` + `npm run build` + manual browser checks against the verification list in the spec.

---

## File map

**Create:**

- `components/app-shell/app-shell.tsx` — provider wrapper.
- `components/app-shell/app-sidebar.tsx` — sidebar markup, nav items, logo.
- `components/app-shell/nav-user.tsx` — footer block (user dropdown OR sign-in button).
- `app/[locale]/(public-app)/layout.tsx` — new public group layout.

**Modify:**

- `lib/auth/user-provider.tsx` — accept nullable user, add `useUserOptional`.
- `app/[locale]/(app)/layout.tsx` — replace `AppHeader` + `UserProvider` with `AppShell`.
- `i18n/messages/en.json` — add `nav.map`.
- `i18n/messages/uk.json` — add `nav.map`.

**Move (folders):**

- `app/[locale]/sports-map/` → `app/[locale]/(public-app)/sports-map/`
- `app/[locale]/staff/` → `app/[locale]/(app)/staff/`
- `app/[locale]/org/` → `app/[locale]/(app)/org/`
- `app/[locale]/book/` → `app/[locale]/(app)/book/`

**Delete:**

- `components/app-header.tsx` — replaced by `NavUser`.

---

## Task 1: Update `UserProvider` to allow a nullable user

**Files:**

- Modify: `lib/auth/user-provider.tsx`

- [ ] **Step 1: Replace file contents**

Open `lib/auth/user-provider.tsx` and replace its contents with:

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
	if (!user) {
		throw new Error('useUser must be used within an authenticated UserProvider')
	}
	return user
}

function useUserOptional(): User | null {
	return useContext(UserContext)
}

export { UserProvider, useUser, useUserOptional }
```

- [ ] **Step 2: Verify no callers break**

Run:

```bash
grep -rn "useUser\|UserProvider" /Users/egorzozula/Desktop/sportMap/Template-frontend --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next
```

Expected: every existing call site uses `useUser()` or `UserProvider` with a non-null `user`. Confirmed locations today:

- `app/[locale]/(app)/layout.tsx` — passes `user` after `getUser()` + redirect, still non-null.
- `components/app-header.tsx` — calls `useUser()`. (This file is deleted in Task 9; until then it still works because `(app)/` always has a non-null user.)
- `components/edit-profile-dialog.tsx` (if it uses `useUser`) — same guarantee.

If any new caller appears, it must use `useUserOptional()` when null is possible.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit (only when user asks)**

```bash
git add lib/auth/user-provider.tsx
git commit -m "feat(auth): support nullable user via useUserOptional"
```

---

## Task 2: Create `AppShell`

**Files:**

- Create: `components/app-shell/app-shell.tsx`

- [ ] **Step 1: Make the directory**

```bash
mkdir -p /Users/egorzozula/Desktop/sportMap/Template-frontend/components/app-shell
```

- [ ] **Step 2: Write the file**

Create `components/app-shell/app-shell.tsx` with:

```tsx
'use client'

import type { User } from '@/services'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { UserProvider } from '@/lib/auth/user-provider'

import { AppSidebar } from './app-sidebar'

type Props = {
	user: User | null
	children: React.ReactNode
}

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

- [ ] **Step 3: TypeScript will fail at this point — that's expected**

`./app-sidebar` does not exist yet. We create it in Task 3. Skip lint until then.

- [ ] **Step 4: Commit (only when user asks) — together with Task 3 and Task 4**

We bundle Tasks 2/3/4 into a single commit because the three files form one cohesive unit and don't compile independently. Final commit appears at the end of Task 4.

---

## Task 3: Create `AppSidebar`

**Files:**

- Create: `components/app-shell/app-sidebar.tsx`

- [ ] **Step 1: Write the file**

Create `components/app-shell/app-sidebar.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { MapIcon } from 'lucide-react'

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
					<span className="text-lg" aria-hidden>
						🏃
					</span>
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

- [ ] **Step 2: TypeScript will still fail**

`./nav-user` does not exist yet. We create it in Task 4. Skip lint until then.

---

## Task 4: Create `NavUser`

**Files:**

- Create: `components/app-shell/nav-user.tsx`

- [ ] **Step 1: Write the file**

Create `components/app-shell/nav-user.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	CreditCard,
	LogIn,
	LogOut,
	MoreVertical,
	Pencil,
} from 'lucide-react'

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

	const handleNameUpdated = (updated: User) => {
		setUser(updated)
		setEditOpen(false)
	}

	const openEdit = () => setEditOpen(true)
	const goBilling = () => router.push('/billing')

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger
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

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors. If lint complains about an unused import (e.g. `SidebarMenuButton` if you tweaked structure), remove it.

- [ ] **Step 3: Verify `User` import path**

The existing `components/app-header.tsx` imports `import type { User } from '@/services'`. Confirm the same alias works here. If TypeScript complains, fall back to `import type { User } from '@/services/configs/user.config'`.

- [ ] **Step 4: Commit (only when user asks) — bundles Tasks 2, 3, 4**

```bash
git add components/app-shell/app-shell.tsx components/app-shell/app-sidebar.tsx components/app-shell/nav-user.tsx
git commit -m "feat(app-shell): introduce sidebar shell with nav-user footer"
```

---

## Task 5: Add `nav.map` translations

**Files:**

- Modify: `i18n/messages/en.json`
- Modify: `i18n/messages/uk.json`

- [ ] **Step 1: Add the namespace to `en.json`**

In `i18n/messages/en.json`, insert a new top-level key `"nav"` immediately after the `"metadata"` block. Resulting top of the file:

```json
{
	"metadata": {
		"title": "Frontend Template",
		"description": "Next.js frontend template"
	},
	"nav": {
		"map": "Map"
	},
	"landing": {
```

- [ ] **Step 2: Add the namespace to `uk.json`**

In `i18n/messages/uk.json`, same position:

```json
{
	"metadata": {
		"title": "Frontend Template",
		"description": "Next.js frontend шаблон"
	},
	"nav": {
		"map": "Карта"
	},
	"landing": {
```

- [ ] **Step 3: Sanity-check JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('/Users/egorzozula/Desktop/sportMap/Template-frontend/i18n/messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('/Users/egorzozula/Desktop/sportMap/Template-frontend/i18n/messages/uk.json','utf8')); console.log('OK')"
```

Expected: prints `OK`.

- [ ] **Step 4: Commit (only when user asks)**

```bash
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(i18n): add nav.map key"
```

---

## Task 6: Move route folders into route groups

**Files:**

- Move: `app/[locale]/sports-map/` → `app/[locale]/(public-app)/sports-map/`
- Move: `app/[locale]/staff/`, `org/`, `book/` → `app/[locale]/(app)/`

- [ ] **Step 1: Make the target group directory for the public-app group**

```bash
mkdir -p "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(public-app)"
```

(The `(app)` group directory already exists.)

- [ ] **Step 2: Move `sports-map`**

```bash
git mv "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/sports-map" "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(public-app)/sports-map"
```

If git refuses because the folder is untracked (the `git status` snapshot at the start of the session shows `sports-map/` as untracked `??`), fall back to plain `mv`:

```bash
mv "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/sports-map" "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(public-app)/sports-map"
```

- [ ] **Step 3: Move `staff`, `org`, `book`**

These are tracked by git. Use `git mv`:

```bash
git mv "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/staff" "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(app)/staff"
git mv "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/org"   "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(app)/org"
git mv "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/book"  "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(app)/book"
```

- [ ] **Step 4: Verify**

```bash
ls "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(app)"
ls "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/(public-app)"
ls "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]/" | sort
```

Expected `(app)` contents: `billing  book  dashboard  layout.tsx  org  staff`
Expected `(public-app)` contents: `sports-map`
Expected `[locale]/` top-level (no more sports-map / staff / org / book): `(app)  (auth)  (landing)  error.tsx  layout.tsx  not-found.tsx  shadcndemo`

(`shadcndemo` is currently a top-level route — leave it in place; the spec does not move it.)

- [ ] **Step 5: Hunt for path imports that referenced the old locations**

```bash
grep -rn "from '@/app/\[locale\]/\(sports-map\|staff\|org\|book\)" /Users/egorzozula/Desktop/sportMap/Template-frontend/app /Users/egorzozula/Desktop/sportMap/Template-frontend/components /Users/egorzozula/Desktop/sportMap/Template-frontend/lib /Users/egorzozula/Desktop/sportMap/Template-frontend/hooks 2>/dev/null
```

Expected: no matches. (Route folders are referenced by URL — the URLs are unchanged because route groups don't appear in URLs — so application code shouldn't import from these paths. If you find one, update it to the new path.)

- [ ] **Step 6: Commit (only when user asks)**

```bash
git add -A "/Users/egorzozula/Desktop/sportMap/Template-frontend/app/[locale]"
git commit -m "refactor(routes): group app and public-app routes under shared layouts"
```

---

## Task 7: Rewrite `(app)/layout.tsx` to use `AppShell`

**Files:**

- Modify: `app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: Replace file contents**

Replace `app/[locale]/(app)/layout.tsx` with:

```tsx
import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell/app-shell'
import { getUser } from '@/lib/auth/get-user'

export default async function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')

	return <AppShell user={user}>{children}</AppShell>
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors. If lint flags an unused import for the previously-imported `AppHeader` or `UserProvider`, you have stale text — re-replace the file.

---

## Task 8: Create `(public-app)/layout.tsx`

**Files:**

- Create: `app/[locale]/(public-app)/layout.tsx`

- [ ] **Step 1: Write the file**

Create `app/[locale]/(public-app)/layout.tsx` with:

```tsx
import { AppShell } from '@/components/app-shell/app-shell'
import { getUser } from '@/lib/auth/get-user'

export default async function PublicAppLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	return <AppShell user={user}>{children}</AppShell>
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit (only when user asks) — bundles Tasks 7 and 8**

```bash
git add app/[locale]/\(app\)/layout.tsx app/[locale]/\(public-app\)/layout.tsx
git commit -m "feat(app-shell): wire AppShell into (app) and (public-app) layouts"
```

---

## Task 9: Delete `AppHeader`

**Files:**

- Delete: `components/app-header.tsx`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -rn "components/app-header\|AppHeader" /Users/egorzozula/Desktop/sportMap/Template-frontend --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next
```

Expected: no matches. If matches remain, fix the importer first — do not delete the file until callers are gone. After Task 7 there should be no consumers.

- [ ] **Step 2: Remove the file**

```bash
git rm /Users/egorzozula/Desktop/sportMap/Template-frontend/components/app-header.tsx
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit (only when user asks)**

```bash
git commit -m "chore: remove AppHeader (replaced by sidebar NavUser)"
```

---

## Task 10: Build + manual verification

**Files:** none. This is the verification gate.

- [ ] **Step 1: Production build**

```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npm run build
```

Expected: build succeeds. No TypeScript errors. No "module not found" errors for the moved routes.

- [ ] **Step 2: Start dev server**

```bash
cd /Users/egorzozula/Desktop/sportMap/Template-frontend && npm run dev
```

Open `http://localhost:3000` in a browser.

- [ ] **Step 3: Walk the verification list from the spec**

For each row, open the URL and confirm the expectation.

| # | URL                                                | Logged in? | Expected                                                                |
| - | -------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| 1 | `/`                                                | either     | Landing page renders. NO sidebar.                                       |
| 2 | `/login`, `/signup`                                | either     | Auth pages render. NO sidebar.                                          |
| 3 | `/sports-map`                                      | no         | Sidebar visible. Footer shows **Sign in** button → clicks to `/login`. |
| 4 | `/sports-map`                                      | yes        | Sidebar visible. Footer shows avatar + name + email + dropdown.         |
| 5 | `/dashboard`, `/billing`, `/staff/...`, `/org/...`, `/book/...` | no | Redirected to `/login`.                                                 |
| 6 | `/dashboard`                                       | yes        | Sidebar visible. Map item NOT highlighted. User menu in footer.         |
| 7 | Any sidebar page, press `⌘B` (Mac) or `Ctrl+B`     | either     | Sidebar collapses to icon column. Tooltips appear on hover. Dropdown still opens. |
| 8 | Resize to <768px width                             | either     | Sidebar is hidden. (No mobile trigger yet — known follow-up.)           |
| 9 | Logged-in dropdown → **Edit profile**              | yes        | `EditProfileDialog` opens; saving updates the displayed name without a full refresh. |
| 10| Logged-in dropdown → **Logout**                    | yes        | Calls `useLogout()`, lands on `/login`.                                 |

- [ ] **Step 4: If anything fails**

Stop and fix the failing case. Do not move to a final commit if any row above is red.

- [ ] **Step 5: Stop**

Per the user's commit policy, do not autocommit. Report results to the user and wait for their `commit` instruction.

---

## Rollback plan

If something goes badly wrong mid-execution and the user wants to abort:

```bash
git restore --source=HEAD --staged --worktree lib/auth/user-provider.tsx
git clean -fd components/app-shell app/[locale]/\(public-app\)
git checkout HEAD -- app/[locale]/\(app\)/layout.tsx components/app-header.tsx
# folder moves: re-move folders back to their original locations using git mv (Task 6 in reverse)
```

(Only run these if the user explicitly requests a rollback. The cleanest abort is to do this BEFORE committing — once committed, use `git revert <hash>`.)

---

## Self-review (already performed by author)

- **Spec coverage:** Every section of `2026-05-17-app-sidebar-design.md` maps to a task above (UserProvider → Task 1; AppShell → Task 2; AppSidebar → Task 3; NavUser → Task 4; i18n → Task 5; route restructure → Task 6; layouts → Tasks 7+8; AppHeader removal → Task 9; verification → Task 10).
- **Placeholders:** None. Every code step has the full code block.
- **Type / name consistency:** `useUserOptional()` defined in Task 1 and called in Task 4; `AppShell` exported in Task 2 and imported in Tasks 7 and 8; `NavUser` exported in Task 4 and imported in Task 3; `AppSidebar` exported in Task 3 and imported in Task 2.
- **Known intentional deviation:** `DropdownMenuTrigger` is styled inline rather than wrapping `SidebarMenuButton` via `asChild`, because the project uses `@base-ui/react` which has no `asChild` slot. The classes mirror those of `SidebarMenuButton`.
- **Known follow-ups not in this plan:** mobile sidebar trigger placement, theme toggle, language switcher inside the footer.
