'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './SportsMap.css'
import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react'

import {
	searchPlaces,
	reverseGeocode,
	type NominatimResult,
	type NominatimAddressHint,
} from '@/lib/nominatim'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type LocationValue = { lat?: number; lng?: number }

type LocationChange = {
	lat: number
	lng: number
	addressHint?: NominatimAddressHint
}

type Props = {
	value: LocationValue
	onChange: (next: LocationChange) => void
	errors?: { lat?: string; lng?: string }
	className?: string
}

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const DEFAULT_CENTER: [number, number] = [48.4647, 35.0462]
const DEFAULT_ZOOM = 12
const FOCUS_ZOOM = 15
const SEARCH_DEBOUNCE_MS = 400
const SEARCH_MIN_LENGTH = 3

const createMarkerIcon = (): L.DivIcon =>
	L.divIcon({
		className: 'sport-marker',
		html: `<div class="sport-marker__bubble" style="background:#16a34a">📍</div>`,
		iconSize: [36, 36],
		iconAnchor: [18, 18],
	})

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value)

const PlaygroundLocationPicker = ({ value, onChange, errors, className }: Props) => {
	const t = useTranslations('sportsMapUi')
	const containerRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<L.Map | null>(null)
	const markerRef = useRef<L.Marker | null>(null)
	const onChangeRef = useRef(onChange)

	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState<NominatimResult[]>([])
	const [searching, setSearching] = useState(false)
	const [resultsOpen, setResultsOpen] = useState(false)
	const [locating, setLocating] = useState(false)

	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	const ensureMarker = useCallback((map: L.Map, lat: number, lng: number) => {
		if (markerRef.current) {
			markerRef.current.setLatLng([lat, lng])
			return markerRef.current
		}
		const marker = L.marker([lat, lng], {
			icon: createMarkerIcon(),
			draggable: true,
		}).addTo(map)
		marker.on('dragend', async () => {
			const position = marker.getLatLng()
			const hint = await reverseGeocode(position.lat, position.lng)
			onChangeRef.current({
				lat: position.lat,
				lng: position.lng,
				addressHint: hint ?? undefined,
			})
		})
		markerRef.current = marker
		return marker
	}, [])

	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		if (mapRef.current) return

		const initialCenter: [number, number] =
			isFiniteNumber(value.lat) && isFiniteNumber(value.lng)
				? [value.lat, value.lng]
				: DEFAULT_CENTER
		const initialZoom =
			isFiniteNumber(value.lat) && isFiniteNumber(value.lng) ? FOCUS_ZOOM : DEFAULT_ZOOM

		const map = L.map(container).setView(initialCenter, initialZoom)
		L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)

		map.on('click', async (event: L.LeafletMouseEvent) => {
			const { lat, lng } = event.latlng
			ensureMarker(map, lat, lng)
			const hint = await reverseGeocode(lat, lng)
			onChangeRef.current({ lat, lng, addressHint: hint ?? undefined })
		})

		mapRef.current = map

		if (isFiniteNumber(value.lat) && isFiniteNumber(value.lng)) {
			ensureMarker(map, value.lat, value.lng)
		}

		return () => {
			map.remove()
			mapRef.current = null
			markerRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		const map = mapRef.current
		if (!map) return
		if (!isFiniteNumber(value.lat) || !isFiniteNumber(value.lng)) return
		ensureMarker(map, value.lat, value.lng)
	}, [value.lat, value.lng, ensureMarker])

	useEffect(() => {
		const query = searchQuery.trim()
		if (query.length < SEARCH_MIN_LENGTH) {
			setSearchResults([])
			setSearching(false)
			return
		}
		const controller = new AbortController()
		setSearching(true)
		const timer = setTimeout(async () => {
			const results = await searchPlaces(query, controller.signal)
			if (controller.signal.aborted) return
			setSearchResults(results)
			setSearching(false)
		}, SEARCH_DEBOUNCE_MS)
		return () => {
			controller.abort()
			clearTimeout(timer)
		}
	}, [searchQuery])

	const handleSelectResult = (result: NominatimResult) => () => {
		const lat = Number.parseFloat(result.lat)
		const lng = Number.parseFloat(result.lon)
		if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return
		const map = mapRef.current
		if (map) {
			map.setView([lat, lng], FOCUS_ZOOM)
			ensureMarker(map, lat, lng)
		}
		setResultsOpen(false)
		setSearchQuery(result.display_name)
		onChangeRef.current({
			lat,
			lng,
			addressHint: {
				city:
					result.address?.city ??
					result.address?.town ??
					result.address?.village ??
					result.address?.hamlet,
				district: result.address?.suburb ?? result.address?.city_district,
				street: result.address?.road
					? result.address.house_number
						? `${result.address.road}, ${result.address.house_number}`
						: result.address.road
					: undefined,
				fullAddress: result.display_name,
			},
		})
	}

	const handleLatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const lat = Number.parseFloat(event.target.value)
		if (!isFiniteNumber(lat)) return
		const lng = isFiniteNumber(value.lng) ? value.lng : 0
		onChangeRef.current({ lat, lng })
	}

	const handleLngChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const lng = Number.parseFloat(event.target.value)
		if (!isFiniteNumber(lng)) return
		const lat = isFiniteNumber(value.lat) ? value.lat : 0
		onChangeRef.current({ lat, lng })
	}

	const handleLocate = () => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) return
		setLocating(true)
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude } = position.coords
				const map = mapRef.current
				if (map) {
					map.setView([latitude, longitude], FOCUS_ZOOM)
					ensureMarker(map, latitude, longitude)
				}
				const hint = await reverseGeocode(latitude, longitude)
				onChangeRef.current({
					lat: latitude,
					lng: longitude,
					addressHint: hint ?? undefined,
				})
				setLocating(false)
			},
			() => {
				setLocating(false)
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		)
	}

	const handleClearSearch = () => {
		setSearchQuery('')
		setSearchResults([])
		setResultsOpen(false)
	}

	const hasLocation = isFiniteNumber(value.lat) && isFiniteNumber(value.lng)
	const showResults = resultsOpen && searchQuery.trim().length >= SEARCH_MIN_LENGTH

	return (
		<div className={cn('isolate space-y-3', className)}>
			<div className="relative">
				<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
				<Input
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
					onFocus={() => setResultsOpen(true)}
					placeholder={t('locationPicker.searchPlaceholder')}
					className="pr-10 pl-9"
				/>
				{searching ? (
					<Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
				) : searchQuery ? (
					<button
						type="button"
						onClick={handleClearSearch}
						className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
						aria-label={t('locationPicker.clearSearch')}
					>
						<X className="h-4 w-4" />
					</button>
				) : null}

				{showResults && searchResults.length > 0 ? (
					<div className="bg-popover absolute top-full right-0 left-0 z-[1200] mt-1 max-h-72 overflow-y-auto rounded-md border shadow-lg">
						{searchResults.map((result) => (
							<button
								key={result.place_id}
								type="button"
								onClick={handleSelectResult(result)}
								className="hover:bg-accent block w-full px-3 py-2 text-left text-sm"
							>
								<div className="flex items-start gap-2">
									<MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
									<span className="line-clamp-2">{result.display_name}</span>
								</div>
							</button>
						))}
					</div>
				) : null}
				{showResults && !searching && searchResults.length === 0 ? (
					<div className="bg-popover text-muted-foreground absolute top-full right-0 left-0 z-[1200] mt-1 rounded-md border px-3 py-2 text-sm shadow-lg">
						{t('locationPicker.nothingFound')}
					</div>
				) : null}
			</div>

			<div className="relative">
				<div
					ref={containerRef}
					className="h-80 w-full overflow-hidden rounded-lg border"
				/>
				{!hasLocation ? (
					<div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
						<div className="pointer-events-auto rounded-full bg-black/70 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-md">
							{t('locationPicker.clickHint')}
						</div>
					</div>
				) : null}
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onClick={handleLocate}
					disabled={locating}
					className="absolute right-3 bottom-3 z-[1100] shadow-md"
				>
					{locating ? (
						<Loader2 className="mr-1 h-4 w-4 animate-spin" />
					) : (
						<Navigation className="mr-1 h-4 w-4" />
					)}
					{t('locationPicker.myLocation')}
				</Button>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<Field data-invalid={errors?.lat ? true : undefined}>
					<FieldLabel htmlFor="picker-lat">{t('locationPicker.latLabel')}</FieldLabel>
					<Input
						id="picker-lat"
						type="number"
						step="any"
						value={isFiniteNumber(value.lat) ? value.lat : ''}
						onChange={handleLatChange}
						placeholder="48.464717"
					/>
					{errors?.lat ? <FieldError errors={[{ message: errors.lat }]} /> : null}
				</Field>
				<Field data-invalid={errors?.lng ? true : undefined}>
					<FieldLabel htmlFor="picker-lng">{t('locationPicker.lngLabel')}</FieldLabel>
					<Input
						id="picker-lng"
						type="number"
						step="any"
						value={isFiniteNumber(value.lng) ? value.lng : ''}
						onChange={handleLngChange}
						placeholder="35.046183"
					/>
					{errors?.lng ? <FieldError errors={[{ message: errors.lng }]} /> : null}
				</Field>
			</div>
		</div>
	)
}

export default PlaygroundLocationPicker
export type { LocationChange, LocationValue }
