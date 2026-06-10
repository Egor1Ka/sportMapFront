import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { LoginForm } from '@/components/login-form'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'login.title',
		descriptionKey: 'login.description',
		path: '/login',
		locale,
		noIndex: true,
	})
}

export default function LoginPage() {
	return <LoginForm />
}
