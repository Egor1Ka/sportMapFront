'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import './SportsMap.css'

import type { MapPoint, MapPointRating, MapPointSport } from '@/lib/overpass'

type Bounds = {
	swLng: number
	swLat: number
	neLng: number
	neLat: number
}

type Props = {
	points: MapPoint[]
	center?: [number, number]
	zoom?: number
	className?: string
	onBoundsChange?: (bounds: Bounds) => void
	onMapClick?: () => void
	compact?: boolean
}

type SportStyle = { color: string; emoji: string }

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const DEFAULT_CENTER: [number, number] = [48.4647, 35.0462]
const DEFAULT_ZOOM = 12

const DEFAULT_STYLE: SportStyle = { color: '#64748b', emoji: '🏅' }

const SPORT_STYLES: Record<string, SportStyle> = {
	soccer: { color: '#16a34a', emoji: '⚽' },
	futsal: { color: '#16a34a', emoji: '⚽' },
	basketball: { color: '#ea580c', emoji: '🏀' },
	fitness: { color: '#db2777', emoji: '💪' },
	workout: { color: '#db2777', emoji: '💪' },
	running: { color: '#0ea5e9', emoji: '🏃' },
	athletics: { color: '#dc2626', emoji: '🏃' },
	tennis: { color: '#ca8a04', emoji: '🎾' },
	table_tennis: { color: '#ca8a04', emoji: '🏓' },
	badminton: { color: '#ca8a04', emoji: '🏸' },
	pickleball: { color: '#ca8a04', emoji: '🏸' },
	multi: { color: '#4f46e5', emoji: '🏟️' },
	cycling: { color: '#0d9488', emoji: '🚴' },
	equestrian: { color: '#a16207', emoji: '🐎' },
	volleyball: { color: '#7c3aed', emoji: '🏐' },
	beachvolleyball: { color: '#7c3aed', emoji: '🏐' },
	canoe: { color: '#0891b2', emoji: '🛶' },
	gymnastics: { color: '#be185d', emoji: '🤸' },
	handball: { color: '#ea580c', emoji: '🤾' },
	chess: { color: '#475569', emoji: '♟️' },
	climbing: { color: '#9333ea', emoji: '🧗' },
	ice_skating: { color: '#0284c7', emoji: '⛸️' },
	ice_hockey: { color: '#1e40af', emoji: '🏒' },
	skateboard: { color: '#525252', emoji: '🛹' },
	swimming: { color: '#0284c7', emoji: '🏊' },
	shooting: { color: '#525252', emoji: '🎯' },
	paintball: { color: '#525252', emoji: '🎯' },
	wakeboarding: { color: '#0891b2', emoji: '🏄' },
	water_ski: { color: '#0891b2', emoji: '🎿' },
	karting: { color: '#dc2626', emoji: '🏎️' },
	baseball: { color: '#475569', emoji: '⚾' },
	yoga: { color: '#a855f7', emoji: '🧘' },
	poker: { color: '#475569', emoji: '🂠' },
	pinball: { color: '#475569', emoji: '🎱' },
}

const MULTI_STYLE: SportStyle = SPORT_STYLES.multi

const getStyleByCode = (code: string): SportStyle => SPORT_STYLES[code] ?? DEFAULT_STYLE

const getMarkerStyle = (sports: MapPointSport[] | undefined): SportStyle => {
	if (!sports || sports.length === 0) return DEFAULT_STYLE
	if (sports.length > 1) return MULTI_STYLE
	return getStyleByCode(sports[0].code)
}

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')

type PopupLabels = {
	fallbackTitle: string
	sportObject: string
	formatRatingAria: (average: string) => string
}

const buildMissingSportLine = (labels: PopupLabels): string =>
	`<div class="sport-popup__sport">🏅 ${escapeHtml(labels.sportObject)}</div>`

const renderSportRow = (sport: MapPointSport): string => {
	const { emoji } = getStyleByCode(sport.code)
	const label = sport.label.trim().length > 0 ? sport.label : sport.code
	return `<div class="sport-popup__sport">${emoji} ${escapeHtml(label)}</div>`
}

const renderSportRows = (
	sports: MapPointSport[] | undefined,
	labels: PopupLabels,
): string => {
	if (!sports || sports.length === 0) return buildMissingSportLine(labels)
	return sports.map(renderSportRow).join('')
}

const buildDetailsHref = (id: string): string =>
	`/sports-map/${encodeURIComponent(id)}`

const buildTitleHtml = (point: MapPoint, labels: PopupLabels): string => {
	const title = escapeHtml(point.name && point.name.length > 0 ? point.name : labels.fallbackTitle)
	return `<a href="${buildDetailsHref(point.id)}" class="sport-popup__title">${title}</a>`
}

const buildPhotoHtml = (point: MapPoint, labels: PopupLabels): string => {
	if (!point.photo) return ''
	const safeUrl = escapeHtml(point.photo)
	const safeAlt = escapeHtml(point.name ?? labels.fallbackTitle)
	const href = buildDetailsHref(point.id)
	return `<a href="${href}" class="sport-popup__photo" aria-label="${safeAlt}"><img src="${safeUrl}" alt="${safeAlt}" loading="lazy" /></a>`
}

const buildWheelchairHtml = (wheelchair: string | undefined): string => {
	if (!wheelchair) return ''
	return `<div class="sport-popup__meta">♿ ${escapeHtml(wheelchair)}</div>`
}

const formatAverage = (value: number): string =>
	Number.isInteger(value) ? `${value}.0` : value.toFixed(1)

const buildRatingHtml = (
	rating: MapPointRating | undefined,
	labels: PopupLabels,
): string => {
	if (!rating) return ''
	const average = formatAverage(rating.average)
	const ariaLabel = escapeHtml(labels.formatRatingAria(average))
	return `<div class="sport-popup__rating" aria-label="${ariaLabel}"><span class="sport-popup__rating-icon">★</span><strong class="sport-popup__rating-value">${average}</strong></div>`
}

const buildWebsiteHtml = (website: string | undefined): string => {
	if (!website) return ''
	const safe = escapeHtml(website)
	return `<div class="sport-popup__meta">🔗 <a href="https://${safe}" target="_blank" rel="noreferrer">${safe}</a></div>`
}

const buildPopupHtml = (point: MapPoint, labels: PopupLabels): string => {
	const photoHtml = buildPhotoHtml(point, labels)
	const titleHtml = buildTitleHtml(point, labels)
	const sportsHtml = renderSportRows(point.sports, labels)
	const ratingHtml = buildRatingHtml(point.rating, labels)
	const wheelchairHtml = buildWheelchairHtml(point.wheelchair)
	const websiteHtml = buildWebsiteHtml(point.website)
	return `<div class="sport-popup">${photoHtml}<div class="sport-popup__body">${titleHtml}<div class="sport-popup__sports">${sportsHtml}</div>${ratingHtml}${wheelchairHtml}${websiteHtml}</div></div>`
}

const buildBadgeHtml = (point: MapPoint): string => {
	const counters = point.counters
	if (!counters) return ''
	const presenceBadge =
		counters.activeCheckIns > 0
			? `<span class="sport-marker__badge sport-marker__badge--presence">${counters.activeCheckIns}</span>`
			: ''
	const eventsBadge =
		counters.upcomingEvents > 0
			? `<span class="sport-marker__badge sport-marker__badge--events">📅 ${counters.upcomingEvents}</span>`
			: ''
	if (!presenceBadge && !eventsBadge) return ''
	return `<div class="sport-marker__badges">${presenceBadge}${eventsBadge}</div>`
}

const createSportIcon = (point: MapPoint): L.DivIcon => {
	const { color, emoji } = getMarkerStyle(point.sports)
	const isLive = (point.counters?.activeCheckIns ?? 0) > 0
	const bubbleClass = isLive
		? 'sport-marker__bubble sport-marker__bubble--live'
		: 'sport-marker__bubble'
	const badgesHtml = buildBadgeHtml(point)
	return L.divIcon({
		className: 'sport-marker',
		html: `<div class="sport-marker__inner"><div class="${bubbleClass}" style="background:${color}">${emoji}</div>${badgesHtml}</div>`,
		iconSize: [36, 36],
		iconAnchor: [18, 18],
		popupAnchor: [0, -18],
	})
}

type MarkerOptions = { compact: boolean; onClick: () => void }

const createMarker = (
	point: MapPoint,
	options: MarkerOptions,
	labels: PopupLabels,
): L.Marker => {
	const marker = L.marker([point.lat, point.lon], { icon: createSportIcon(point) })
	if (options.compact) {
		marker.on('click', options.onClick)
		return marker
	}
	marker.bindPopup(buildPopupHtml(point, labels))
	return marker
}

const buildClusterLayer = (
	points: MapPoint[],
	options: MarkerOptions,
	labels: PopupLabels,
): L.MarkerClusterGroup => {
	const cluster = L.markerClusterGroup({
		showCoverageOnHover: false,
		spiderfyOnMaxZoom: !options.compact,
		chunkedLoading: true,
		maxClusterRadius: 60,
		zoomToBoundsOnClick: !options.compact,
	})
	const markers = points.map((point) => createMarker(point, options, labels))
	cluster.addLayers(markers)
	if (options.compact) {
		cluster.on('clusterclick', options.onClick)
	}
	return cluster
}

const extractBounds = (map: L.Map): Bounds => {
	const sw = map.getBounds().getSouthWest()
	const ne = map.getBounds().getNorthEast()
	return { swLng: sw.lng, swLat: sw.lat, neLng: ne.lng, neLat: ne.lat }
}

const SportsMap = ({
	points,
	center = DEFAULT_CENTER,
	zoom = DEFAULT_ZOOM,
	className,
	onBoundsChange,
	onMapClick,
	compact = false,
}: Props) => {
	const t = useTranslations('sportsMapUi')
	const containerRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<L.Map | null>(null)
	const onBoundsChangeRef = useRef(onBoundsChange)
	const onMapClickRef = useRef(onMapClick)

	const popupLabels = useMemo<PopupLabels>(() => {
		const formatRatingAria = (average: string) =>
			t('map.ratingAria', { average })
		return {
			fallbackTitle: t('map.fallbackTitle'),
			sportObject: t('map.sportObject'),
			formatRatingAria,
		}
	}, [t])

	useEffect(() => {
		onBoundsChangeRef.current = onBoundsChange
	}, [onBoundsChange])

	useEffect(() => {
		onMapClickRef.current = onMapClick
	}, [onMapClick])

	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		if (mapRef.current) return

		const mapOptions: L.MapOptions = compact
			? {
					zoomControl: false,
					attributionControl: false,
					scrollWheelZoom: false,
					doubleClickZoom: false,
					boxZoom: false,
					keyboard: false,
				}
			: {}
		const map = L.map(container, mapOptions).setView(center, zoom)
		L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)
		mapRef.current = map

		const emitBounds = () => {
			const handler = onBoundsChangeRef.current
			if (!handler) return
			handler(extractBounds(map))
		}

		const handleClick = () => {
			const handler = onMapClickRef.current
			if (!handler) return
			handler()
		}

		map.on('moveend', emitBounds)
		map.on('click', handleClick)
		emitBounds()

		return () => {
			map.off('moveend', emitBounds)
			map.off('click', handleClick)
			map.remove()
			mapRef.current = null
		}
	}, [center, zoom, compact])

	useEffect(() => {
		const map = mapRef.current
		if (!map) return
		if (points.length === 0) return

		const handleClusterClick = () => {
			const handler = onMapClickRef.current
			if (!handler) return
			handler()
		}

		const cluster = buildClusterLayer(
			points,
			{
				compact,
				onClick: handleClusterClick,
			},
			popupLabels,
		)
		map.addLayer(cluster)

		return () => {
			map.removeLayer(cluster)
		}
	}, [points, compact, popupLabels])

	return <div ref={containerRef} className={className} style={{ height: '100%', width: '100%' }} />
}

export default SportsMap
export type { Bounds }
