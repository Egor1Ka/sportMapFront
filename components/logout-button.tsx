'use client'

import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/use-logout'

export function LogoutButton({
	children,
	...props
}: React.ComponentProps<typeof Button>) {
	const handleLogout = useLogout()

	return (
		<Button onClick={handleLogout} {...props}>
			{children ?? 'Logout'}
		</Button>
	)
}
