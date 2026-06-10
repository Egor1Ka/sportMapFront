'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function setLocale(locale: string) {
	const store = await cookies()
	store.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
	revalidatePath('/')
}
