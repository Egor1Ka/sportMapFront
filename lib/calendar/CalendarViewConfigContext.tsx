'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { CalendarViewConfig } from './view-config'

const CalendarViewConfigContext = createContext<CalendarViewConfig | null>(null)

interface CalendarViewConfigProviderProps {
	config: CalendarViewConfig
	children: ReactNode
}

function CalendarViewConfigProvider({
	config,
	children,
}: CalendarViewConfigProviderProps) {
	return (
		<CalendarViewConfigContext value={config}>
			{children}
		</CalendarViewConfigContext>
	)
}

const useViewConfig = (): CalendarViewConfig => {
	const ctx = useContext(CalendarViewConfigContext)
	if (!ctx)
		throw new Error(
			'useViewConfig must be used inside CalendarViewConfigProvider',
		)
	return ctx
}

export { CalendarViewConfigProvider, useViewConfig }
