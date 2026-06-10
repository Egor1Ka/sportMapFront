import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Rewrites are baked at build time, so BACKEND_URL must resolve to a valid URL
// during `next build`. Default to the compose service name used in production.
const backendUrl = process.env.BACKEND_URL || 'http://api:9000'

const nextConfig: NextConfig = {
	output: 'standalone',
	serverExternalPackages: ['newrelic'],
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'picsum.photos' },
		],
	},
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: `${backendUrl}/api/:path*`,
			},
		]
	},
}

export default withNextIntl(nextConfig)
