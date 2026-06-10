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
