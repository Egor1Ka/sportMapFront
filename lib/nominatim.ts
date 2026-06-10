type NominatimAddress = {
	city?: string
	town?: string
	village?: string
	hamlet?: string
	suburb?: string
	city_district?: string
	state_district?: string
	state?: string
	road?: string
	house_number?: string
	postcode?: string
	country?: string
}

type NominatimResult = {
	place_id: number
	display_name: string
	lat: string
	lon: string
	address?: NominatimAddress
}

type NominatimAddressHint = {
	city?: string
	district?: string
	street?: string
	fullAddress?: string
}

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const DEFAULT_HEADERS: HeadersInit = { 'Accept-Language': 'uk,en' }

const buildSearchUrl = (query: string): string => {
	const params = new URLSearchParams({
		q: query,
		format: 'json',
		addressdetails: '1',
		limit: '5',
	})
	return `${SEARCH_URL}?${params.toString()}`
}

const buildReverseUrl = (lat: number, lng: number): string => {
	const params = new URLSearchParams({
		lat: String(lat),
		lon: String(lng),
		format: 'json',
		addressdetails: '1',
		zoom: '18',
	})
	return `${REVERSE_URL}?${params.toString()}`
}

const pickFirst = (...values: Array<string | undefined>): string | undefined => {
	const found = values.find((value) => value && value.length > 0)
	return found
}

const buildStreet = (road: string | undefined, house: string | undefined): string | undefined => {
	if (!road) return undefined
	if (!house) return road
	return `${road}, ${house}`
}

const buildAddressHint = (result: NominatimResult): NominatimAddressHint => {
	const address = result.address ?? {}
	return {
		city: pickFirst(address.city, address.town, address.village, address.hamlet),
		district: pickFirst(address.suburb, address.city_district, address.state_district),
		street: buildStreet(address.road, address.house_number),
		fullAddress: result.display_name,
	}
}

const isAbortError = (error: unknown): boolean =>
	error instanceof DOMException && error.name === 'AbortError'

const searchPlaces = async (
	query: string,
	signal?: AbortSignal,
): Promise<NominatimResult[]> => {
	const trimmed = query.trim()
	if (trimmed.length < 3) return []
	try {
		const response = await fetch(buildSearchUrl(trimmed), {
			headers: DEFAULT_HEADERS,
			signal,
		})
		if (!response.ok) return []
		const data = (await response.json()) as NominatimResult[]
		return data
	} catch (error) {
		if (isAbortError(error)) return []
		return []
	}
}

const reverseGeocode = async (
	lat: number,
	lng: number,
	signal?: AbortSignal,
): Promise<NominatimAddressHint | null> => {
	try {
		const response = await fetch(buildReverseUrl(lat, lng), {
			headers: DEFAULT_HEADERS,
			signal,
		})
		if (!response.ok) return null
		const data = (await response.json()) as NominatimResult
		if (!data) return null
		return buildAddressHint(data)
	} catch (error) {
		if (isAbortError(error)) return null
		return null
	}
}

export { searchPlaces, reverseGeocode, buildAddressHint }
export type { NominatimResult, NominatimAddressHint }
