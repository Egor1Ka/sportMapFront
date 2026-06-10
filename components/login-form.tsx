'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
	resolvePostLoginCallbackPath,
	setCallbackCookie,
} from '@/lib/auth-callback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'

export function LoginForm({
	className,
	...props
}: React.ComponentProps<'div'>) {
	const t = useTranslations('login')

	useEffect(() => {
		const callbackPath = resolvePostLoginCallbackPath()
		if (!callbackPath) return
		setCallbackCookie(callbackPath)
	}, [])

	const handleGoogleLogin = () => {
		window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`
	}

	return (
		<div className={cn('flex flex-col gap-6', className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="p-0">
					<div className="animate-in fade-in slide-in-from-bottom-4 p-8 duration-500 md:p-12">
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-3xl font-semibold tracking-tight">
									{t('title')}
								</h1>
								<p className="text-muted-foreground text-sm text-balance">
									{t('description')}
								</p>
							</div>
							<Field>
								<Button
									variant="outline"
									type="button"
									className="w-full"
									onClick={handleGoogleLogin}
								>
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
										<path
											d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
											fill="currentColor"
										/>
									</svg>
									{t('googleLogin')}
								</Button>
							</Field>
							<FieldDescription className="text-center">
								{t('noAccount')} <Link href="/signup">{t('signupLink')}</Link>
							</FieldDescription>
						</FieldGroup>
					</div>
				</CardContent>
			</Card>
			<FieldDescription className="px-6 text-center">
				{t('terms')} <a href="#">{t('termsOfService')}</a> {t('and')}{' '}
				<a href="#">{t('privacyPolicy')}</a>.
			</FieldDescription>
		</div>
	)
}
