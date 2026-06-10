'use client'

import { useCallback, useState } from 'react'

interface EventCreateDialogState {
	isOpen: boolean
	open: () => void
	close: () => void
	setOpen: (next: boolean) => void
}

const useEventCreateDialog = (): EventCreateDialogState => {
	const [isOpen, setIsOpen] = useState(false)
	const open = useCallback(() => setIsOpen(true), [])
	const close = useCallback(() => setIsOpen(false), [])
	return { isOpen, open, close, setOpen: setIsOpen }
}

export { useEventCreateDialog }
