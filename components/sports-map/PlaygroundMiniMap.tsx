'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './SportsMap.css'

type Props = {
	lat: number
	lng: number
	label?: string
	className?: string
	zoom?: number
}

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const createSimpleIcon = (): L.DivIcon =>
	L.divIcon({
		className: 'sport-marker',
		html: `<div class="sport-marker__bubble" style="background:#16a34a">📍</div>`,
		iconSize: [36, 36],
		iconAnchor: [18, 18],
	})

const PlaygroundMiniMap = ({ lat, lng, label, className, zoom = 15 }: Props) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<L.Map | null>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		if (mapRef.current) return

		const map = L.map(container, {
			zoomControl: true,
			scrollWheelZoom: false,
			dragging: true,
			doubleClickZoom: false,
		}).setView([lat, lng], zoom)
		L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)
		const marker = L.marker([lat, lng], { icon: createSimpleIcon() }).addTo(map)
		if (label) marker.bindTooltip(label, { permanent: false })
		mapRef.current = map

		return () => {
			map.remove()
			mapRef.current = null
		}
	}, [lat, lng, zoom, label])

	return <div ref={containerRef} className={className} />
}

export default PlaygroundMiniMap
