import { Checkout } from '@creem_io/nextjs'

const creemApiKey = process.env.CREEM_API_KEY

const billingNotConfigured = () =>
	new Response('Billing is not configured', { status: 503 })

// Don't throw at module load (it would break `next build` when the key is absent).
// Expose the real Creem checkout only when configured; otherwise return 503 at request time.
export const GET = creemApiKey
	? Checkout({
			apiKey: creemApiKey,
			testMode: process.env.NODE_ENV !== 'production',
			defaultSuccessUrl: '/billing?checkout=success',
		})
	: billingNotConfigured
