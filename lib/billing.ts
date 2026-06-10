export const formatPrice = (
	cents: number,
	currency: string,
	locale = 'en-US',
) =>
	new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
	}).format(cents / 100)
