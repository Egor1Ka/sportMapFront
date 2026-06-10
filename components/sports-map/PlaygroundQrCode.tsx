'use client'

import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

interface PlaygroundQrCodeProps {
	url: string
	projectName?: string
	tagline?: string
	size?: number
	className?: string
}

const BRAND_GREEN = '#2F7D5B'
const BRAND_ACCENT = '#E8743B'
const QR_FOREGROUND = '#143d2c'

const LOGO_BADGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
	<rect width="80" height="80" rx="20" fill="#ffffff"/>
	<rect x="8" y="8" width="64" height="64" rx="15" fill="${BRAND_GREEN}"/>
	<g transform="translate(24,21)" fill="none">
		<path d="M0 0 L14 0 C27 0 38 8 38 19 C38 30 27 38 14 38 L0 38 Z" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round"/>
		<line x1="0" y1="19" x2="34" y2="19" stroke="#ffffff" stroke-width="2.6"/>
		<circle cx="17" cy="19" r="7" stroke="#ffffff" stroke-width="2.6"/>
		<circle cx="17" cy="19" r="2.4" fill="${BRAND_ACCENT}"/>
	</g>
</svg>`

const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(LOGO_BADGE_SVG)}`

const buildLogoSettings = (size: number) => ({
	src: LOGO_DATA_URI,
	height: Math.round(size * 0.22),
	width: Math.round(size * 0.22),
	excavate: true,
})

function PlaygroundQrCode({
	url,
	projectName = 'Dvir',
	tagline,
	size = 520,
	className,
}: PlaygroundQrCodeProps) {
	return (
		<div
			data-slot="playground-qr-code"
			className={cn(
				'flex flex-col items-center justify-center gap-4',
				className,
			)}
		>
			<div className="flex flex-col items-center gap-1">
				<span className="text-5xl font-extrabold tracking-tight text-[#143d2c]">
					{projectName}
				</span>
				{tagline ? (
					<span className="text-xl font-bold tracking-tight text-[#2F7D5B]">
						{tagline}
					</span>
				) : null}
			</div>
			<div className="rounded-3xl border border-black/6 bg-white p-4 shadow-[0_18px_50px_-12px_rgba(20,61,44,0.28)] print:border-black/10 print:p-3 print:shadow-none">
				<QRCodeSVG
					value={url}
					size={size}
					level="H"
					marginSize={0}
					bgColor="#ffffff"
					fgColor={QR_FOREGROUND}
					imageSettings={buildLogoSettings(size)}
				/>
			</div>
			<span className="max-w-full break-all text-center text-xs text-neutral-500">
				{url}
			</span>
		</div>
	)
}

export { PlaygroundQrCode }
