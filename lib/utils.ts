import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const isSafeRedirectPath = (path: string): boolean =>
	path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
