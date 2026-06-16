import { redirect } from 'next/navigation'

import { getUser } from '@/lib/auth/get-user'

type Props = {
	params: Promise<{ id: string }>
	children: React.ReactNode
}

export default async function EditPlaygroundLayout({ params, children }: Props) {
	const user = await getUser()
	if (!user) {
		const { id } = await params
		redirect(`/login?callbackUrl=/sports-map/${id}/edit`)
	}

	return <>{children}</>
}
