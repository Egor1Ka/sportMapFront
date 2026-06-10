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
