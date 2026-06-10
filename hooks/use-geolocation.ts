'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_CITY = { name: 'Київ', lat: 50.4501, lng: 30.5234 }

type DeniedReason = 'permission' | 'unavailable' | 'timeout'

type GeoState =
	| { status: 'pending'; lat: number; lng: number }
	| { status: 'granted'; lat: number; lng: number }
	| { status: 'denied'; lat: number; lng: number; reason: DeniedReason }

const initialState = (): GeoState => ({
	status: 'pending',
	lat: DEFAULT_CITY.lat,
	lng: DEFAULT_CITY.lng,
})

const REASON_BY_CODE: Record<number, DeniedReason> = {
	1: 'permission',
	3: 'timeout',
}

const resolveReason = (code: number): DeniedReason =>
	REASON_BY_CODE[code] ?? 'unavailable'

const isGeolocationAvailable = (): boolean =>
	typeof navigator !== 'undefined' &&
	typeof navigator.geolocation !== 'undefined'

const useGeolocation = () => {
	const [state, setState] = useState<GeoState>(initialState)
	const [attemptCount, setAttemptCount] = useState(0)
	const attemptCountRef = useRef(0)

	const setGranted = useCallback((position: GeolocationPosition) => {
		setState({
			status: 'granted',
			lat: position.coords.latitude,
			lng: position.coords.longitude,
		})
	}, [])

	const setDenied = useCallback((reason: DeniedReason) => {
		setState({
			status: 'denied',
			lat: DEFAULT_CITY.lat,
			lng: DEFAULT_CITY.lng,
			reason,
		})
	}, [])

	const handleError = useCallback(
		(error: GeolocationPositionError) => {
			setDenied(resolveReason(error.code))
		},
		[setDenied],
	)

	const request = useCallback(() => {
		attemptCountRef.current += 1
		setAttemptCount(attemptCountRef.current)
		if (!isGeolocationAvailable()) {
			setDenied('unavailable')
			return
		}
		navigator.geolocation.getCurrentPosition(setGranted, handleError)
	}, [setGranted, handleError, setDenied])

	useEffect(() => {
		queueMicrotask(request)
	}, [request])

	return { ...state, retry: request, attemptCount }
}

export { useGeolocation, DEFAULT_CITY }
export type { GeoState, DeniedReason }
