import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DvirLogo } from '@/components/brand/dvir-logo'

async function Footer() {
	const t = await getTranslations('landing')

	return (
		<footer
			data-slot="landing-footer"
			className="border-foreground/10 bg-background border-t"
		>
			<div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-12">
				<div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<DvirLogo />
						<p className="text-muted-foreground mt-5 max-w-sm text-sm leading-relaxed">
							{t('hero.subtitle')}
						</p>
					</div>
					<nav className="flex flex-wrap gap-x-8 gap-y-3">
						<Link
							href="/sports-map"
							className="text-foreground/70 hover:text-foreground font-mono text-xs tracking-widest uppercase transition-colors"
						>
							{t('nav.map')}
						</Link>
						<Link
							href="#features"
							className="text-foreground/70 hover:text-foreground font-mono text-xs tracking-widest uppercase transition-colors"
						>
							{t('nav.features')}
						</Link>
						<Link
							href="/login"
							className="text-foreground/70 hover:text-foreground font-mono text-xs tracking-widest uppercase transition-colors"
						>
							{t('nav.login')}
						</Link>
					</nav>
				</div>
				<div className="border-foreground/10 mt-16 flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-muted-foreground text-xs">
						{t('footer.copyright')}
					</p>
					<p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
						Built for the game
					</p>
				</div>
			</div>
		</footer>
	)
}

export { Footer }
