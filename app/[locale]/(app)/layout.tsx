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
