'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { CalendarStrategy } from './types'

const CalendarContext = createContext<CalendarStrategy | null>(null)

interface CalendarProviderProps {
	strategy: CalendarStrategy
	children: ReactNode
}

function CalendarProvider({ strategy, children }: CalendarProviderProps) {
	return <CalendarContext value={strategy}>{children}</CalendarContext>
}

const useCalendarStrategy = (): CalendarStrategy => {
	const strategy = useContext(CalendarContext)
	if (!strategy)
		throw new Error('useCalendarStrategy must be used within CalendarProvider')
	return strategy
}

export { CalendarProvider, useCalendarStrategy }
