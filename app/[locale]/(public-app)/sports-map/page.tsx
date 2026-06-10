'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { playgroundApi, type Playground, type PlaygroundSport } from '@/services'
import type { MapPoint, MapPointRating, MapPointSport } from '@/lib/overpass'
import type { Bounds } from '@/components/sports-map/SportsMap'
import SportsFilter from '@/components/sports-map/SportsFilter'

const MapLoading = () => {
	const t = useTranslations('sportsMapPages')
	return <div style={{ padding: 16 }}>{t('list.loadingMap')}</div>
}

const SportsMap = dynamic(() => import('@/components/sports-map/SportsMap'), {
	ssr: false,
	loading: MapLoading,
})

const FETCH_DEBOUNCE_MS = 300

const buildBboxString = ({ swLng, swLat, neLng, neLat }: Bounds): string =>
	`${swLng.toFixed(6)},${swLat.toFixed(6)},${neLng.toFixed(6)},${neLat.toFixed(6)}`

const parseSelectedCodes = (raw: string | null): string[] => {
	if (!raw) return []
	return raw.split(',').map((code) => code.trim()).filter(Boolean)
}

const toMapPointSport = (sport: PlaygroundSport): MapPointSport => ({
	code: sport.code,
	label: sport.label,
})

const toMapPointSports = (sports: PlaygroundSport[]): MapPointSport[] =>
	sports.map(toMapPointSport)

const pickFirstPhoto = (photos: string[]): string | undefined =>
	photos.length > 0 ? photos[0] : undefined

const toMapPointRating = (rating: Playground['rating']): MapPointRating | undefined => {
	if (!rating) return undefined
	if (rating.average == null || rating.count <= 0) return undefined
	return { average: rating.average, count: rating.count }
}

const playgroundToMapPoint = (playground: Playground): MapPoint | null => {
	if (!playground) return null
	if (typeof playground.lat !== 'number' || typeof playground.lng !== 'number') return null
	const sports = toMapPointSports(playground.sports)
	return {
		id: playground.id,
		lat: playground.lat,
		lon: playground.lng,
		name: playground.name ?? undefined,
		sports: sports.length > 0 ? sports : undefined,
		photo: pickFirstPhoto(playground.photos),
		counters: playground.counters
			? {
					activeCheckIns: playground.counters.activeCheckIns ?? 0,
					upcomingEvents: playground.counters.upcomingEvents ?? 0,
				}
			: undefined,
		rating: toMapPointRating(playground.rating),
	}
}

const isMapPoint = (value: MapPoint | null): value is MapPoint => value !== null

const playgroundsToMapPoints = (playgrounds: Playground[]): MapPoint[] =>
	playgrounds.map(playgroundToMapPoint).filter(isMapPoint)

const fetchPoints = async (bounds: Bounds, sports: string | undefined): Promise<MapPoint[]> => {
	const result = await playgroundApi.listByBbox({
		queryParams: {
			bbox: buildBboxString(bounds),
			sports,
		},
		silent: true,
	})
	return playgroundsToMapPoints(result.items)
}

const SportsMapPage = () => {
	const t = useTranslations('sportsMapPages')
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const sportsParam = searchParams.get('sports')
	const selectedCodes = parseSelectedCodes(sportsParam)

	const [points, setPoints] = useState<MapPoint[]>([])
	const [error, setError] = useState<string | null>(null)

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const requestIdRef = useRef(0)
	const lastBoundsRef = useRef<Bounds | null>(null)

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [])

	const runFetch = useCallback(
		async (bounds: Bounds, sports: string | undefined) => {
			const requestId = requestIdRef.current + 1
			requestIdRef.current = requestId
			try {
				const next = await fetchPoints(bounds, sports)
				if (requestIdRef.current !== requestId) return
				setPoints(next)
				setError(null)
			} catch (err) {
				if (requestIdRef.current !== requestId) return
				setError(err instanceof Error ? err.message : t('list.loadError'))
			}
		},
		[t],
	)

	const handleBoundsChange = useCallback(
		(bounds: Bounds) => {
			lastBoundsRef.current = bounds
			if (debounceRef.current) clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(
				() => runFetch(bounds, sportsParam ?? undefined),
				FETCH_DEBOUNCE_MS,
			)
		},
		[runFetch, sportsParam],
	)

	useEffect(() => {
		const bounds = lastBoundsRef.current
		if (!bounds) return
		runFetch(bounds, sportsParam ?? undefined)
	}, [sportsParam, runFetch])

	const handleFilterChange = useCallback(
		(codes: string[]) => {
			const params = new URLSearchParams(searchParams.toString())
			if (codes.length === 0) params.delete('sports')
			else params.set('sports', codes.join(','))
			const query = params.toString()
			router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
		},
		[pathname, router, searchParams],
	)

	if (error) return <div style={{ padding: 16, color: 'crimson' }}>{error}</div>

	return (
		<div style={{ position: 'relative', height: 'calc(100vh - 3rem)', width: '100%' }}>
			<div style={{ position: 'absolute', top: 12, right: 12, zIndex: 9999 }}>
				<SportsFilter selectedCodes={selectedCodes} onChange={handleFilterChange} />
			</div>
			<Link
				href="/sports-map/new"
				style={{ position: 'absolute', right: 20, bottom: 24, zIndex: 9999 }}
				className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg transition hover:shadow-xl"
			>
				<Plus className="h-5 w-5" />
				{t('list.createPlayground')}
			</Link>
			<SportsMap points={points} onBoundsChange={handleBoundsChange} />
		</div>
	)
}

export default SportsMapPage
