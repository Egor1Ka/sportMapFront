import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { SignupForm } from '@/components/signup-form'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'signup.title',
		descriptionKey: 'signup.description',
		path: '/signup',
		locale,
		noIndex: true,
	})
}

export default function SignupPage() {
	return <SignupForm />
}
