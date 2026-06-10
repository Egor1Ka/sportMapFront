import type {
	Playground,
	PlaygroundAddress,
	EditRequestDiff,
} from '@/services'

type AddressFields = Pick<PlaygroundAddress, 'city' | 'district' | 'street' | 'fullAddress'>

interface ModeratedFields {
	name: string | null
	description: string | null
	address: AddressFields
	lat: number
	lng: number
}

const normalizeString = (value: string | null | undefined): string | null => {
	if (value === null || value === undefined) return null
	const trimmed = value.trim()
	return trimmed.length === 0 ? null : trimmed
}

const stringChanged = (a: string | null | undefined, b: string | null | undefined): boolean =>
	normalizeString(a) !== normalizeString(b)

const numberChanged = (a: number | null | undefined, b: number | null | undefined): boolean => {
	if (a === null || a === undefined) return b !== null && b !== undefined
	if (b === null || b === undefined) return true
	return a !== b
}

const addressKeys: Array<keyof AddressFields> = ['city', 'district', 'street', 'fullAddress']

const buildAddressDiff = (
	initial: PlaygroundAddress,
	next: AddressFields,
): Partial<PlaygroundAddress> | null => {
	const collectChanged = (
		acc: Partial<PlaygroundAddress>,
		key: keyof AddressFields,
	): Partial<PlaygroundAddress> => {
		if (!stringChanged(initial[key], next[key])) return acc
		return { ...acc, [key]: normalizeString(next[key]) }
	}
	const diff = addressKeys.reduce(collectChanged, {})
	return Object.keys(diff).length === 0 ? null : diff
}

const computeModeratedDiff = (
	initial: Playground,
	next: ModeratedFields,
): EditRequestDiff => {
	const nameDiff = stringChanged(initial.name, next.name)
		? { name: normalizeString(next.name) }
		: {}
	const descriptionDiff = stringChanged(initial.description, next.description)
		? { description: normalizeString(next.description) }
		: {}
	const addressDiff = buildAddressDiff(initial.address, next.address)
	const latDiff = numberChanged(initial.lat, next.lat) ? { lat: next.lat } : {}
	const lngDiff = numberChanged(initial.lng, next.lng) ? { lng: next.lng } : {}

	return {
		...nameDiff,
		...descriptionDiff,
		...(addressDiff ? { address: addressDiff } : {}),
		...latDiff,
		...lngDiff,
	}
}

const isDiffEmpty = (diff: EditRequestDiff): boolean => Object.keys(diff).length === 0

const sportsChanged = (initial: Playground, nextSports: string[]): boolean => {
	const initialIds = [...initial.sports.map((sport) => sport.id)].sort()
	const nextIds = [...nextSports].sort()
	if (initialIds.length !== nextIds.length) return true
	const matchAt = (id: string, index: number) => id === nextIds[index]
	return !initialIds.every(matchAt)
}

const applyDiffPreview = (playground: Playground, diff: EditRequestDiff): Playground => {
	const mergedAddress: PlaygroundAddress = diff.address
		? { ...playground.address, ...diff.address }
		: playground.address

	return {
		...playground,
		name: 'name' in diff ? (diff.name ?? null) : playground.name,
		description:
			'description' in diff ? (diff.description ?? null) : playground.description,
		address: mergedAddress,
		lat: 'lat' in diff && diff.lat !== undefined ? diff.lat : playground.lat,
		lng: 'lng' in diff && diff.lng !== undefined ? diff.lng : playground.lng,
	}
}

export {
	computeModeratedDiff,
	isDiffEmpty,
	sportsChanged,
	applyDiffPreview,
	normalizeString,
}
export type { ModeratedFields, AddressFields }
