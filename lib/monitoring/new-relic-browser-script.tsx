'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

function NewRelicBrowserScript() {
	const [browserTimingHeader, setBrowserTimingHeader] = useState<string>('')

	useEffect(() => {
		fetch('/api/newrelic-browser-agent')
			.then((res) => res.text())
			.then(setBrowserTimingHeader)
			.catch(() => {})
	}, [])

	if (!browserTimingHeader) return null

	return (
		<Script
			id="newrelic-browser"
			strategy="afterInteractive"
			dangerouslySetInnerHTML={{ __html: browserTimingHeader }}
		/>
	)
}

export { NewRelicBrowserScript }
