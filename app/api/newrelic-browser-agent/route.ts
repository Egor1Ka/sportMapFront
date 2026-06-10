import { NextResponse } from 'next/server'

export async function GET() {
	try {
		const newrelic = await import('newrelic')
		const agent = newrelic.default ?? newrelic
		const header = agent.getBrowserTimingHeader({
			hasToRemoveScriptWrapper: true,
		})
		return new NextResponse(header, {
			headers: {
				'Content-Type': 'text/plain',
				'Cache-Control': 'private, max-age=3600',
			},
		})
	} catch {
		return new NextResponse('', { status: 204 })
	}
}
