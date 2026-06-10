import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { buildPageMetadata, SITE } from '@/lib/seo'
import {
	ArrowRight,
	MapPin,
	Star,
	QrCode,
	Sparkles,
	ArrowDown,
} from 'lucide-react'
import { HeroMapPreview } from '@/components/landing/hero-map-preview'
import { LandingQrCard } from '@/components/landing/landing-qr-card'
import { PhotosCarousel } from '@/components/landing/photos-carousel'

const HERO_PHOTO_URL =
	'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=2400&q=85&auto=format&fit=crop'

const CAROUSEL_PHOTO_URLS = [
	'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=85&auto=format&fit=crop',
	'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=85&auto=format&fit=crop',
	'https://picsum.photos/seed/dvir-tennis/1600/1280',
	'https://picsum.photos/seed/dvir-skate/1600/1280',
	'https://picsum.photos/seed/dvir-fitness/1600/1280',
] as const

type CarouselI18nItem = { tag: string; name: string; rating: string }

const SPORT_TAGS = [
	'Football',
	'Basketball',
	'Tennis',
	'Fitness',
	'Skate',
	'Climbing',
	'Volleyball',
	'Running',
	'Swimming',
	'Yoga',
	'Chess',
	'Karting',
	'Padel',
	'BMX',
	'Cycling',
	'Gymnastics',
] as const

const STEPS = ['find', 'rate', 'share'] as const

const STEP_ICONS = {
	find: MapPin,
	rate: Star,
	share: QrCode,
} as const

const STATS = ['playgrounds', 'cities', 'reviews'] as const

type TFn = (key: string) => string

const renderSportTag = (tag: string, index: number) => (
	<span
		key={`${tag}-${index}`}
		className="text-foreground/60 hover:text-foreground inline-flex shrink-0 items-center gap-3 text-2xl tracking-tight transition-colors sm:text-3xl lg:text-4xl"
	>
		{tag}
		<span className="text-brand">·</span>
	</span>
)

function HeroBackdrop() {
	return (
		<>
			<div className="absolute inset-0 -z-20 bg-gradient-to-br from-[oklch(0.96_0.02_140)] via-[oklch(0.97_0.01_220)] to-background dark:from-[oklch(0.18_0.04_140)] dark:via-[oklch(0.12_0.02_220)] dark:to-black" />
			<Image
				src={HERO_PHOTO_URL}
				alt=""
				fill
				priority
				sizes="100vw"
				className="-z-10 object-cover opacity-30 mix-blend-multiply dark:opacity-50 dark:mix-blend-luminosity"
			/>
			<div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/30 via-white/60 to-background dark:from-black/40 dark:via-black/70 dark:to-black" />
			<div className="landing-noise pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-overlay dark:opacity-50" />
		</>
	)
}

function CourtIllustration() {
	return (
		<svg
			viewBox="0 0 600 360"
			className="text-foreground/40 absolute inset-0 h-full w-full"
			fill="none"
			stroke="currentColor"
			strokeWidth="1"
		>
			<rect x="20" y="20" width="560" height="320" />
			<line x1="300" y1="20" x2="300" y2="340" />
			<circle cx="300" cy="180" r="50" />
			<circle cx="300" cy="180" r="2" fill="currentColor" />
			<path d="M 20 80 L 130 80 L 130 280 L 20 280" />
			<path d="M 580 80 L 470 80 L 470 280 L 580 280" />
			<path d="M 20 130 L 80 130 L 80 230 L 20 230" />
			<path d="M 580 130 L 520 130 L 520 230 L 580 230" />
		</svg>
	)
}

const renderStep = (key: (typeof STEPS)[number], index: number, t: TFn) => {
	const Icon = STEP_ICONS[key]
	return (
		<div
			key={key}
			className="border-foreground/10 hover:border-foreground/30 group relative overflow-hidden rounded-2xl border bg-foreground/[0.02] p-8 transition-all duration-300 hover:bg-foreground/[0.04]"
		>
			<span className="font-display text-foreground/[0.08] absolute top-4 right-6 text-[80px] leading-none font-bold">
				{String(index + 1).padStart(2, '0')}
			</span>
			<div className="relative">
				<div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
					<Icon className="h-5 w-5" />
				</div>
				<h3 className="mb-2 text-lg font-semibold tracking-tight">
					{t(`howItWorks.steps.${key}.title`)}
				</h3>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{t(`howItWorks.steps.${key}.description`)}
				</p>
			</div>
		</div>
	)
}

const renderStat = (key: (typeof STATS)[number], t: TFn) => (
	<div
		key={key}
		className="border-foreground/10 flex flex-col items-start border-l pl-3 sm:pl-4"
	>
		<span className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
			{t(`hero.stats.${key}.value`)}
		</span>
		<span className="text-muted-foreground mt-1 truncate font-mono text-[10px] tracking-widest uppercase">
			{t(`hero.stats.${key}.label`)}
		</span>
	</div>
)

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'landing.title',
		descriptionKey: 'landing.description',
		path: '/',
		locale,
	})
}

const buildCarouselItem =
	(rawItems: CarouselI18nItem[]) => (url: string, photoIndex: number) => ({
		url,
		tag: rawItems[photoIndex].tag,
		name: rawItems[photoIndex].name,
		rating: rawItems[photoIndex].rating,
	})

export default async function LandingPage() {
	const t = await getTranslations('landing')
	const tSeo = await getTranslations('seo.landing')
	const marqueeTags = [...SPORT_TAGS, ...SPORT_TAGS]
	const carouselRaw = t.raw('photosBlock.carousel') as CarouselI18nItem[]
	const carouselItems = CAROUSEL_PHOTO_URLS.map(buildCarouselItem(carouselRaw))

	const jsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Organization',
				'@id': `${SITE.url}/#organization`,
				name: SITE.name,
				url: SITE.url,
				logo: `${SITE.url}/opengraph-image`,
			},
			{
				'@type': 'WebSite',
				'@id': `${SITE.url}/#website`,
				name: SITE.name,
				url: SITE.url,
				description: tSeo('description'),
				publisher: { '@id': `${SITE.url}/#organization` },
				inLanguage: ['en', 'uk'],
			},
		],
	}

	return (
		<div className="bg-background flex flex-col">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<section className="relative isolate flex min-h-[100svh] items-center overflow-hidden px-4 pt-32 pb-20 sm:px-6 sm:pb-24 lg:px-12">
				<HeroBackdrop />

				<div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_minmax(0,1fr)] lg:gap-16">
					<div className="animate-[landing-reveal_0.8s_ease_both]">
						<div className="border-foreground/20 bg-foreground/5 mb-8 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 backdrop-blur-md">
							<span className="relative flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
							</span>
							<span className="font-mono text-[11px] tracking-widest uppercase">
								{t('hero.badge')}
							</span>
						</div>

						<h1 className="font-display text-5xl leading-[0.9] font-bold tracking-[-0.04em] sm:text-6xl lg:text-[88px] xl:text-[112px]">
							<span className="block">{t('hero.titleLine1')}</span>
							<span className="block">
								<span className="text-brand">
									{t('hero.titleLine2Highlight')}
								</span>
								<span>{t('hero.titleLine2Suffix')}</span>
							</span>
						</h1>

						<p className="text-muted-foreground mt-8 max-w-lg text-base leading-relaxed sm:text-lg">
							{t('hero.subtitle')}
						</p>

						<div className="mt-10 flex flex-wrap items-center gap-4">
							<Link
								href="/sports-map"
								className="group bg-brand text-brand-foreground inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold tracking-tight transition-all hover:scale-[1.02] hover:bg-brand-600"
							>
								<Sparkles className="h-4 w-4" />
								{t('hero.primaryCta')}
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
							</Link>
							<Link
								href="/login"
								className="text-foreground/80 hover:text-foreground border-foreground/20 hover:border-foreground/40 inline-flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-all"
							>
								{t('hero.secondaryCta')}
							</Link>
						</div>

						<div className="mt-12 grid max-w-md grid-cols-3 gap-3 sm:gap-6">
							{STATS.map((key) => renderStat(key, t))}
						</div>
					</div>

					<div className="hidden animate-[landing-reveal_0.9s_0.2s_ease_both] md:block">
						<HeroMapPreview
							openLabel={t('hero.map.open')}
							liveLabel={t('hero.map.live')}
							countLabel={t('hero.map.count')}
						/>
					</div>
				</div>

				<div className="text-muted-foreground absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex">
					<span className="font-mono text-[10px] tracking-widest uppercase">
						{t('hero.scrollHint')}
					</span>
					<ArrowDown className="h-3.5 w-3.5 animate-bounce" />
				</div>
			</section>

			<section
				aria-hidden
				className="border-foreground/10 border-y bg-foreground/[0.02] py-8"
			>
				<div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
					<div
						className="font-display flex shrink-0 items-center gap-8 pr-8 font-bold tracking-tight uppercase"
						style={{
							animation: 'landing-marquee 40s linear infinite',
						}}
					>
						{marqueeTags.map(renderSportTag)}
					</div>
				</div>
			</section>

			<section
				id="features"
				className="relative px-4 py-32 sm:px-6 lg:px-12"
			>
				<div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
					<div>
						<span className="text-brand mb-5 inline-block font-mono text-xs tracking-[0.2em] uppercase">
							{t('mapBlock.eyebrow')}
						</span>
						<h2 className="font-display text-4xl leading-[1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
							{t('mapBlock.title')}
						</h2>
						<p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed sm:text-lg">
							{t('mapBlock.description')}
						</p>
						<Link
							href="/sports-map"
							className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand transition-all hover:gap-3"
						>
							{t('mapBlock.cta')}
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
					<HeroMapPreview
						variant="showcase"
						openLabel={t('hero.map.open')}
						liveLabel={t('hero.map.live')}
						countLabel={t('mapBlock.countLabel')}
					/>
				</div>
			</section>

			<section className="relative px-4 py-32 sm:px-6 lg:px-12">
				<div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
					<div className="lg:order-2">
						<PhotosCarousel items={carouselItems} />
					</div>
					<div className="lg:order-1">
						<span className="text-brand mb-5 inline-block font-mono text-xs tracking-[0.2em] uppercase">
							{t('photosBlock.eyebrow')}
						</span>
						<h2 className="font-display text-4xl leading-[1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
							{t('photosBlock.title')}
						</h2>
						<p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed sm:text-lg">
							{t('photosBlock.description')}
						</p>
					</div>
				</div>
			</section>

			<section className="relative overflow-hidden px-4 py-32 sm:px-6 lg:px-12">
				<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--brand)_8%,transparent),transparent_60%)]" />
				<div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
					<div>
						<span className="text-brand mb-5 inline-block font-mono text-xs tracking-[0.2em] uppercase">
							{t('qrBlock.eyebrow')}
						</span>
						<h2 className="font-display text-4xl leading-[1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
							{t('qrBlock.title')}
						</h2>
						<p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed sm:text-lg">
							{t('qrBlock.description')}
						</p>
						<div className="mt-8 flex flex-col gap-3 text-sm">
							{(['print', 'share', 'scan'] as const).map((bulletKey) => (
								<div key={bulletKey} className="flex items-start gap-3">
									<span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" />
									<span className="text-foreground/80">
										{t(`qrBlock.bullets.${bulletKey}`)}
									</span>
								</div>
							))}
						</div>
					</div>
					<div className="flex justify-center">
						<div
							style={{
								animation: 'landing-bob 6s ease-in-out infinite',
							}}
						>
							<LandingQrCard
								url={t('qrBlock.cardUrl')}
								title={t('qrBlock.cardTitle')}
								subtitle={t('qrBlock.cardSubtitle')}
							/>
						</div>
					</div>
				</div>
			</section>

			<section
				id="how-it-works"
				className="border-foreground/10 border-t px-4 py-32 sm:px-6 lg:px-12"
			>
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 max-w-2xl">
						<span className="text-brand mb-5 inline-block font-mono text-xs tracking-[0.2em] uppercase">
							{t('howItWorks.eyebrow')}
						</span>
						<h2 className="font-display text-4xl leading-[1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
							{t('howItWorks.title')}
						</h2>
					</div>
					<div className="grid gap-4 sm:grid-cols-3">
						{STEPS.map((key, i) => renderStep(key, i, t))}
					</div>
				</div>
			</section>

			<section className="relative isolate overflow-hidden px-4 py-40 sm:px-6 lg:px-12">
				<div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand/[0.06] via-transparent to-brand-accent/[0.04]" />
				<div className="absolute inset-0 -z-20 overflow-hidden">
					<div className="absolute inset-0">
						<CourtIllustration />
					</div>
				</div>

				<div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
					<h2 className="font-display text-5xl leading-[0.9] font-bold tracking-[-0.04em] sm:text-6xl lg:text-8xl">
						<span className="block">{t('finalCta.line1')}</span>
						<span className="block text-brand">
							{t('finalCta.line2')}
						</span>
					</h2>
					<p className="text-muted-foreground max-w-xl text-lg">
						{t('finalCta.subtitle')}
					</p>
					<Link
						href="/sports-map"
						className="group bg-brand text-brand-foreground inline-flex h-14 items-center gap-2 rounded-full px-8 text-base font-semibold tracking-tight transition-all hover:scale-[1.03] hover:bg-brand-600"
					>
						{t('finalCta.button')}
						<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
					</Link>
				</div>
			</section>
		</div>
	)
}
