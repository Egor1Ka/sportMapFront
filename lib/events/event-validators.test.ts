import { describe, it, expect } from 'vitest'
import { isWithin48hFuture, isStartInPast } from './event-validators'

describe('isWithin48hFuture', () => {
	const now = new Date('2026-05-17T10:00:00.000Z')

	it('returns true for time 1 hour ahead', () => {
		expect(isWithin48hFuture(new Date('2026-05-17T11:00:00.000Z'), now)).toBe(true)
	})

	it('returns true for time 47:59 ahead', () => {
		expect(isWithin48hFuture(new Date('2026-05-19T09:59:00.000Z'), now)).toBe(true)
	})

	it('returns false for time 48:01 ahead', () => {
		expect(isWithin48hFuture(new Date('2026-05-19T10:01:00.000Z'), now)).toBe(false)
	})

	it('returns false for time in the past', () => {
		expect(isWithin48hFuture(new Date('2026-05-17T09:00:00.000Z'), now)).toBe(false)
	})

	it('returns false for time less than 5 minutes ahead', () => {
		expect(isWithin48hFuture(new Date('2026-05-17T10:04:00.000Z'), now)).toBe(false)
	})

	it('returns true for time exactly 5 minutes ahead', () => {
		expect(isWithin48hFuture(new Date('2026-05-17T10:05:00.000Z'), now)).toBe(true)
	})
})

describe('isStartInPast', () => {
	const now = new Date('2026-05-17T10:00:00.000Z')

	it('returns true if 1ms in the past', () => {
		expect(isStartInPast(new Date('2026-05-17T09:59:59.999Z'), now)).toBe(true)
	})

	it('returns false if 1ms in the future', () => {
		expect(isStartInPast(new Date('2026-05-17T10:00:00.001Z'), now)).toBe(false)
	})
})
