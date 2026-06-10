import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation, DEFAULT_CITY } from './use-geolocation'

const mockGetCurrentPosition = vi.fn()

beforeEach(() => {
	Object.defineProperty(global.navigator, 'geolocation', {
		value: { getCurrentPosition: mockGetCurrentPosition },
		configurable: true,
	})
	mockGetCurrentPosition.mockReset()
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useGeolocation', () => {
	it('starts in pending state with default city coordinates', () => {
		mockGetCurrentPosition.mockImplementation(() => {})
		const { result } = renderHook(() => useGeolocation())
		expect(result.current.status).toBe('pending')
		expect(result.current.lat).toBe(DEFAULT_CITY.lat)
		expect(result.current.lng).toBe(DEFAULT_CITY.lng)
	})

	it('transitions to granted with returned coords', async () => {
		mockGetCurrentPosition.mockImplementation((onSuccess) => {
			onSuccess({ coords: { latitude: 49.5, longitude: 32.5 } })
		})
		const { result } = renderHook(() => useGeolocation())
		await act(async () => {})
		expect(result.current.status).toBe('granted')
		expect(result.current.lat).toBe(49.5)
		expect(result.current.lng).toBe(32.5)
	})

	it('transitions to denied with permission reason and default city coords', async () => {
		mockGetCurrentPosition.mockImplementation((_onSuccess, onError) => {
			onError({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 })
		})
		const { result } = renderHook(() => useGeolocation())
		await act(async () => {})
		expect(result.current.status).toBe('denied')
		if (result.current.status === 'denied') {
			expect(result.current.reason).toBe('permission')
		}
		expect(result.current.lat).toBe(DEFAULT_CITY.lat)
	})

	it('exposes retry() to re-trigger geolocation', async () => {
		mockGetCurrentPosition
			.mockImplementationOnce((_s, onError) =>
				onError({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 }),
			)
			.mockImplementationOnce((onSuccess) =>
				onSuccess({ coords: { latitude: 48, longitude: 35 } }),
			)
		const { result } = renderHook(() => useGeolocation())
		await act(async () => {})
		expect(result.current.status).toBe('denied')
		await act(async () => {
			result.current.retry()
		})
		expect(result.current.status).toBe('granted')
		expect(result.current.lat).toBe(48)
	})

	it('falls back to unavailable when navigator.geolocation is undefined', async () => {
		Object.defineProperty(global.navigator, 'geolocation', {
			value: undefined,
			configurable: true,
		})
		const { result } = renderHook(() => useGeolocation())
		await act(async () => {})
		expect(result.current.status).toBe('denied')
		if (result.current.status === 'denied') {
			expect(result.current.reason).toBe('unavailable')
		}
		expect(result.current.lat).toBe(DEFAULT_CITY.lat)
	})

	it('transitions to denied with timeout reason on TIMEOUT error', async () => {
		mockGetCurrentPosition.mockImplementation((_onSuccess, onError) => {
			onError({ code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3 })
		})
		const { result } = renderHook(() => useGeolocation())
		await act(async () => {})
		expect(result.current.status).toBe('denied')
		if (result.current.status === 'denied') {
			expect(result.current.reason).toBe('timeout')
		}
	})
})
