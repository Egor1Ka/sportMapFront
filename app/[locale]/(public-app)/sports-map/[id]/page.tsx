'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
	ArrowLeft,
	MapPin,
	ExternalLink,
	Share2,
	Camera,
	Info,
	Pencil,
} from 'lucide-react'

import {
	playgroundApi,
	ApiError,
	type Playground,
	type PlaygroundSport,
} from '@/services'
import { PresenceCard } from '@/components/presence/presence-card'
import { EventList } from '@/components/events/event-list'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PrintQrButton } from '@/components/sports-map/PrintQrButton'
import { PhotoLightbox } from '@/components/sports-map/PhotoLightbox'
import { FeedbackSection } from '@/components/feedback/FeedbackSection'

const PlaygroundMiniMap = dynamic(
	() => import('@/components/sports-map/PlaygroundMiniMap'),
	{
		ssr: false,
		loading: () => <Skeleton className="h-48 w-full rounded-lg" />,
	},
)

type RouteParams = { id: string }
type Props = { params: Promise<RouteParams> }

const formatCoord = (value: number): string => value.toFixed(6)

const buildOsmUrl = (lat: number, lng: number): string =>
	`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`

const buildGoogleMapsUrl = (lat: number, lng: number): string =>
	`https://www.google.com/maps?q=${lat},${lng}`

const formatDate = (value: string | null): string | null => {
	if (!value) return null
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return null
	return date.toLocaleDateString('uk-UA', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	})
}

const getSportKey = (sport: PlaygroundSport) => sport.id

const renderSportBadgeOnHero = (sport: PlaygroundSport) => (
	<Badge
		key={getSportKey(sport)}
		className="border-white/20 bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
	>
		{sport.icon ? <span aria-hidden>{sport.icon}</span> : null}
		<span>{sport.label}</span>
	</Badge>
)

const renderSportBadge = (sport: PlaygroundSport) => (
	<Badge key={getSportKey(sport)} variant="secondary" className="text-sm">
		{sport.icon ? <span aria-hidden>{sport.icon}</span> : null}
		<span>{sport.label}</span>
	</Badge>
)

const createPhotoSlideRenderer = (
	onOpen: (index: number) => void,
	ariaLabelFn: (n: number) => string,
	altFn: (n: number) => string,
) => {
	const renderPhotoSlide = (photo: string, indexInRest: number) => {
		const fullIndex = indexInRest + 1
		const handleClick = () => onOpen(fullIndex)
		return (
			<CarouselItem key={`${photo}-${indexInRest}`}>
				<button
					type="button"
					onClick={handleClick}
					aria-label={ariaLabelFn(fullIndex + 1)}
					className="bg-muted group relative block aspect-video w-full cursor-zoom-in overflow-hidden rounded-lg"
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={photo}
						alt={altFn(fullIndex + 1)}
						className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
					/>
				</button>
			</CarouselItem>
		)
	}
	return renderPhotoSlide
}

const PlaygroundLoading = () => (
	<div className="bg-background min-h-screen">
		<Skeleton className="h-72 w-full sm:h-96" />
		<div className="mx-auto w-full max-w-5xl p-6">
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-4 lg:col-span-2">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-24 w-full" />
					<Skeleton className="aspect-video w-full" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-48 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			</div>
		</div>
	</div>
)

type PlaygroundErrorProps = { message: string; t: ReturnType<typeof useTranslations> }

const PlaygroundError = ({ message, t }: PlaygroundErrorProps) => (
	<div className="mx-auto flex min-h-screen w-full max-w-2xl items-center p-6">
		<Empty className="w-full">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Info />
				</EmptyMedia>
				<EmptyTitle>{t('detail.notFound')}</EmptyTitle>
				<EmptyDescription>{message}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Link
					href="/sports-map"
					className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					{t('detail.backToMap')}
				</Link>
			</EmptyContent>
		</Empty>
	</div>
)

const PlaygroundPage = ({ params }: Props) => {
	const { id } = use(params)
	const t = useTranslations('sportsMapPages')
	const [playground, setPlayground] = useState<Playground | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

	useEffect(() => {
		let cancelled = false

		const load = async () => {
			setLoading(true)
			try {
				const playgroundResult = await playgroundApi.getById({
					pathParams: { id },
					silent: true,
				})
				if (cancelled) return
				setPlayground(playgroundResult)
				setError(null)
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError
						? err.displayMessage
						: t('detail.loadError')
				setError(message)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		load()
		return () => {
			cancelled = true
		}
	}, [id, t])

	const handleShare = async () => {
		const url = typeof window !== 'undefined' ? window.location.href : ''
		try {
			await navigator.clipboard.writeText(url)
			toast.success(t('detail.copySuccess'))
		} catch {
			toast.error(t('detail.copyError'))
		}
	}

	const openLightbox = (index: number) => () => setLightboxIndex(index)
	const closeLightbox = () => setLightboxIndex(null)

	const photoAriaLabel = (n: number) => t('detail.photoOpenAria', { n })
	const photoAlt = (n: number) => t('detail.photoAlt', { n })
	const renderPhotoSlide = createPhotoSlideRenderer(setLightboxIndex, photoAriaLabel, photoAlt)

	if (loading) return <PlaygroundLoading />
	if (error || !playground)
		return <PlaygroundError message={error ?? t('detail.unknownError')} t={t} />

	const title = playground.name ?? t('detail.noName')
	const createdAt = formatDate(playground.createdAt)
	const hasCoords =
		typeof playground.lat === 'number' && typeof playground.lng === 'number'
	const addressLine =
		playground.address.fullAddress ??
		[
			playground.address.city,
			playground.address.district,
			playground.address.street,
		]
			.filter(Boolean)
			.join(', ')
	const heroPhoto = playground.photos[0] ?? null
	const restPhotos = playground.photos.slice(1)

	return (
		<div className="bg-background min-h-screen pb-12">
			<section className="relative h-72 w-full overflow-hidden sm:h-96">
				{heroPhoto ? (
					<>
						<button
							type="button"
							onClick={openLightbox(0)}
							aria-label={t('detail.heroPhotoAria')}
							className="absolute inset-0 block h-full w-full cursor-zoom-in"
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={heroPhoto}
								alt={title}
								className="absolute inset-0 h-full w-full object-cover"
							/>
						</button>
						<div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/20" />
					</>
				) : (
					<div className="from-primary/30 to-primary/5 absolute inset-0 bg-linear-to-br" />
				)}

				<div className="relative mx-auto flex h-full max-w-5xl flex-col justify-between p-6">
					<div className="flex items-center justify-between gap-3">
						<Link
							href="/sports-map"
							className="inline-flex w-fit items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-md transition hover:bg-black/60"
						>
							<ArrowLeft className="h-4 w-4" />
							{t('detail.backToMap')}
						</Link>
						<Link
							href={`/sports-map/${playground.id}/edit`}
							className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-black backdrop-blur-md transition hover:bg-white"
						>
							<Pencil className="h-4 w-4" />
							{t('detail.edit')}
						</Link>
					</div>

					<div className="space-y-3 text-white">
						<h1 className="text-3xl font-semibold tracking-tight drop-shadow-md sm:text-4xl">
							{title}
						</h1>
						{playground.sports.length > 0 ? (
							<div className="flex flex-wrap gap-2">
								{playground.sports.map(renderSportBadgeOnHero)}
							</div>
						) : null}
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-5xl px-6 pt-6">
				<Breadcrumb className="mb-6">
					<BreadcrumbList>
						<BreadcrumbItem>
							<Link
								href="/sports-map"
								className="hover:text-foreground transition-colors"
							>
								{t('detail.mapBreadcrumb')}
							</Link>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{title}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="lg:col-span-2">
						<Tabs defaultValue="activity">
							<TabsList>
								<TabsTrigger value="activity">{t('detail.tabActivity')}</TabsTrigger>
								<TabsTrigger value="overview">{t('detail.tabOverview')}</TabsTrigger>
							</TabsList>

							<TabsContent value="activity" className="space-y-6">
								<PresenceCard
									playgroundId={playground.id}
									initialActiveCount={playground.counters?.activeCheckIns ?? 0}
									initialViewer={
										playground.viewer
											? {
													isCheckedIn: playground.viewer.isCheckedInHere,
													expiresAt: null,
												}
											: null
									}
								/>
								<EventList
									playgroundId={playground.id}
									sports={playground.sports}
									defaultSportId={playground.sports[0]?.id ?? null}
								/>
							</TabsContent>

							<TabsContent value="overview" className="space-y-6">
								<Card>
									<CardHeader>
										<CardTitle>{t('detail.descriptionTitle')}</CardTitle>
									</CardHeader>
									<CardContent>
										{playground.description ? (
											<p className="text-muted-foreground whitespace-pre-line leading-relaxed">
												{playground.description}
											</p>
										) : (
											<p className="text-muted-foreground text-sm italic">
												{t('detail.noDescription')}
											</p>
										)}
									</CardContent>
								</Card>

								{playground.sports.length > 0 ? (
									<Card>
										<CardHeader>
											<CardTitle>{t('detail.sportsTitle')}</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="flex flex-wrap gap-2">
												{playground.sports.map(renderSportBadge)}
											</div>
										</CardContent>
									</Card>
								) : null}

								{restPhotos.length > 0 ? (
									<Card>
										<CardHeader>
											<CardTitle className="flex items-center gap-2">
												<Camera className="h-5 w-5" />
												{t('detail.photosTitle')}
												<span className="text-muted-foreground ml-1 text-sm font-normal">
													({playground.photos.length})
												</span>
											</CardTitle>
										</CardHeader>
										<CardContent>
											<Carousel opts={{ align: 'start', loop: true }}>
												<CarouselContent>
													{restPhotos.map(renderPhotoSlide)}
												</CarouselContent>
												<CarouselPrevious />
												<CarouselNext />
											</Carousel>
										</CardContent>
									</Card>
								) : null}

								<FeedbackSection
									targetType="playground"
									targetId={playground.id}
								/>
							</TabsContent>
						</Tabs>
					</div>

					<aside className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<MapPin className="h-5 w-5" />
									{t('detail.locationTitle')}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{addressLine ? (
									<p className="text-sm leading-relaxed">{addressLine}</p>
								) : (
									<p className="text-muted-foreground text-sm italic">
										{t('detail.noAddress')}
									</p>
								)}

								{hasCoords ? (
									<>
										<PlaygroundMiniMap
											lat={playground.lat as number}
											lng={playground.lng as number}
											label={title}
											className="h-48 w-full overflow-hidden rounded-lg border"
										/>
										<div className="text-muted-foreground font-mono text-xs">
											{formatCoord(playground.lat as number)},{' '}
											{formatCoord(playground.lng as number)}
										</div>
										<Separator />
										<div className="flex flex-col gap-2">
											<a
												href={buildGoogleMapsUrl(
													playground.lat as number,
													playground.lng as number,
												)}
												target="_blank"
												rel="noreferrer"
												className={cn(
													buttonVariants({ variant: 'default', size: 'sm' }),
													'w-full',
												)}
											>
												{t('detail.getDirections')}
												<ExternalLink className="ml-1 h-3.5 w-3.5" />
											</a>
											<a
												href={buildOsmUrl(
													playground.lat as number,
													playground.lng as number,
												)}
												target="_blank"
												rel="noreferrer"
												className={cn(
													buttonVariants({ variant: 'outline', size: 'sm' }),
													'w-full',
												)}
											>
												{t('detail.openInOsm')}
												<ExternalLink className="ml-1 h-3.5 w-3.5" />
											</a>
										</div>
									</>
								) : null}
							</CardContent>
						</Card>

						<Card>
							<CardContent className="space-y-3 pt-6">
								<button
									type="button"
									onClick={handleShare}
									className={cn(
										buttonVariants({ variant: 'outline', size: 'sm' }),
										'w-full',
									)}
								>
									<Share2 className="mr-1 h-4 w-4" />
									{t('detail.share')}
								</button>
								<PrintQrButton playgroundId={id} />
								{createdAt ? (
									<p className="text-muted-foreground mt-3 text-center text-xs">
										{t('detail.addedOn', { date: createdAt })}
									</p>
								) : null}
							</CardContent>
						</Card>
					</aside>
				</div>
			</div>

			<PhotoLightbox
				photos={playground.photos}
				openIndex={lightboxIndex}
				onChange={setLightboxIndex}
				onClose={closeLightbox}
			/>
		</div>
	)
}

export default PlaygroundPage
