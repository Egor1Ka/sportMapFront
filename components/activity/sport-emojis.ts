const DEFAULT_EMOJI = '🏅'

const SPORT_EMOJIS: Record<string, string> = {
	football: '⚽',
	futsal: '⚽',
	basketball: '🏀',
	workout: '💪',
	fitness: '💪',
	tennis: '🎾',
	table_tennis: '🏓',
	badminton: '🏸',
	pickleball: '🏸',
	running: '🏃',
	athletics: '🏃',
	volleyball: '🏐',
	beachvolleyball: '🏐',
	cycling: '🚴',
	swimming: '🏊',
	climbing: '🧗',
	yoga: '🧘',
	chess: '♟️',
	skateboard: '🛹',
	ice_skating: '⛸️',
	ice_hockey: '🏒',
	handball: '🤾',
	gymnastics: '🤸',
	equestrian: '🐎',
	canoe: '🛶',
	baseball: '⚾',
	shooting: '🎯',
	multi: '🏟️',
}

const hasEmojiForCode = (code: string): boolean => Boolean(SPORT_EMOJIS[code])

const pickSportEmoji = (code: string): string => SPORT_EMOJIS[code] ?? DEFAULT_EMOJI

const pickEmojiFromCodes = (codes: string[]): string => {
	const matched = codes.find(hasEmojiForCode)
	if (!matched) return DEFAULT_EMOJI
	return SPORT_EMOJIS[matched] ?? DEFAULT_EMOJI
}

export { pickSportEmoji, pickEmojiFromCodes, DEFAULT_EMOJI }
