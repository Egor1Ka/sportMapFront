import { redirect } from 'next/navigation'

import { getUser } from '@/lib/auth/get-user'

export default async function NewPlaygroundLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getUser()
	if (!user) redirect('/login?callbackUrl=/sports-map/new')

	return <>{children}</>
}
