import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

import { Toaster } from '@/components/ui/sonner'

export default async function LocaleLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const locale = await getLocale()
	const messages = await getMessages()

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			{children}
			<Toaster richColors closeButton />
		</NextIntlClientProvider>
	)
}
