import { Checkout } from '@creem_io/nextjs'

const creemApiKey = process.env.CREEM_API_KEY
if (!creemApiKey)
	throw new Error('CREEM_API_KEY environment variable is required')

export const GET = Checkout({
	apiKey: creemApiKey,
	testMode: process.env.NODE_ENV !== 'production',
	defaultSuccessUrl: '/billing?checkout=success',
})
