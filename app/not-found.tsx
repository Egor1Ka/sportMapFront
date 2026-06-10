import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'

export default async function NotFound() {
	const t = await getTranslations('errors')

	return (
		<div className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				<h1 className="text-foreground text-7xl font-bold tracking-tighter">
					404
				</h1>
				<div className="flex flex-col gap-2">
					<h2 className="text-foreground text-xl font-semibold">
						{t('notFoundTitle')}
					</h2>
					<p className="text-muted-foreground">{t('notFoundDescription')}</p>
				</div>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href="/" />}
				>
					{t('goHome')}
				</Button>
			</div>
		</div>
	)
}
