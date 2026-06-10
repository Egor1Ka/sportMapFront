import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DvirLogo } from '@/components/brand/dvir-logo'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

async function Header() {
	const t = await getTranslations('landing')

	return (
		<header
			data-slot="landing-header"
			className="absolute top-0 right-0 left-0 z-50 w-full"
		>
			<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-12">
				<Link href="/" aria-label={t('nav.logo')}>
					<DvirLogo />
				</Link>

				<nav className="hidden items-center gap-10 md:flex">
					<Link
						href="#features"
						className="text-foreground/60 hover:text-foreground font-mono text-xs tracking-widest uppercase transition-colors"
					>
						{t('nav.features')}
					</Link>
					<Link
						href="#how-it-works"
						className="text-foreground/60 hover:text-foreground font-mono text-xs tracking-widest uppercase transition-colors"
					>
						{t('nav.howItWorks')}
					</Link>
					<Link
						href="/sports-map"
						className="text-foreground/60 hover:text-foreground font-mono text-xs tracking-widest uppercase transition-colors"
					>
						{t('nav.map')}
					</Link>
				</nav>

				<div className="flex items-center gap-3">
					<ThemeToggle />
					<LanguageSwitcher />
					<Link
						href="/login"
						className="text-foreground/80 hover:text-foreground hidden h-9 items-center justify-center px-3 text-sm font-medium transition-colors sm:inline-flex"
					>
						{t('nav.login')}
					</Link>
					<Link
						href="/sports-map"
						className="bg-brand text-brand-foreground inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all hover:bg-brand-600"
					>
						{t('nav.signup')}
					</Link>
				</div>
			</div>
		</header>
	)
}

export { Header }
