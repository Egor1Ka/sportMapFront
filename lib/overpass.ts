export type MapPointSport = {
	code: string
	label: string
}

export type MapPointCounters = {
	activeCheckIns: number
	upcomingEvents: number
}

export type MapPointRating = {
	average: number
	count: number
}

export type MapPoint = {
	id: string
	lat: number
	lon: number
	name?: string
	sports?: MapPointSport[]
	photo?: string
	website?: string
	wheelchair?: string
	counters?: MapPointCounters
	rating?: MapPointRating
}

type LatLon = { lat: number; lon: number }

type OverpassTags = Record<string, string | undefined>

type OverpassElement = {
	type: 'node' | 'way' | 'relation'
	id: number
	lat?: number
	lon?: number
	center?: LatLon
	tags?: OverpassTags
}

export type OverpassRaw = {
	version?: number
	generator?: string
	elements?: OverpassElement[]
}

const extractCoords = (element: OverpassElement): LatLon | null => {
	if (typeof element.lat === 'number' && typeof element.lon === 'number') {
		return { lat: element.lat, lon: element.lon }
	}
	if (element.center) return element.center
	return null
}

const pickName = (tags: OverpassTags): string | undefined =>
	tags.name ?? tags['name:uk'] ?? tags['name:en']

const trimmedCode = (raw: string): string => raw.trim()

const isNonEmptyCode = (code: string): boolean => code.length > 0

const toMapPointSport = (code: string): MapPointSport => ({ code, label: code })

const parseSportTag = (raw: string | undefined): MapPointSport[] => {
	if (!raw) return []
	return raw.split(/[;,]/).map(trimmedCode).filter(isNonEmptyCode).map(toMapPointSport)
}

const toMapPoint = (element: OverpassElement): MapPoint | null => {
	const coords = extractCoords(element)
	if (!coords) return null
	const tags = element.tags ?? {}
	const sports = parseSportTag(tags.sport)
	return {
		id: `${element.type}/${element.id}`,
		lat: coords.lat,
		lon: coords.lon,
		name: pickName(tags),
		sports: sports.length > 0 ? sports : undefined,
		website: tags.website,
		wheelchair: tags.wheelchair,
	}
}

const isMapPoint = (value: MapPoint | null): value is MapPoint => value !== null

export const parseOverpassElements = (raw: OverpassRaw): MapPoint[] => {
	const elements = raw.elements ?? []
	return elements.map(toMapPoint).filter(isMapPoint)
}
