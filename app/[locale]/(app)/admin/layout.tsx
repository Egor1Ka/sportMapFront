import { redirect } from 'next/navigation'

import { getUser } from '@/lib/auth/get-user'

export default async function AdminLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getUser()
	if (!user) redirect('/login')
	if (!user.isAdmin) redirect('/sports-map')

	return <>{children}</>
}
