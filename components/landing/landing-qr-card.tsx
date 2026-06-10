'use client'

import { QRCodeSVG } from 'qrcode.react'

type Props = {
	url: string
	title: string
	subtitle: string
}

export function LandingQrCard({ url, title, subtitle }: Props) {
	return (
		<div className="relative w-full max-w-md">
			<div
				aria-hidden
				className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand/15 blur-3xl"
			/>
			<div className="relative flex flex-col items-stretch overflow-hidden rounded-3xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-black/10 px-7 pt-6 pb-4">
					<div>
						<div className="font-mono text-[10px] tracking-[0.25em] text-black/50 uppercase">
							Dvir
						</div>
						<div className="mt-1 text-lg font-semibold tracking-tight text-black">
							{title}
						</div>
					</div>
					<div className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-brand-600 uppercase">
						Live
					</div>
				</div>

				<div className="flex items-center justify-center px-7 py-8">
					<QRCodeSVG
						value={url}
						size={240}
						level="M"
						marginSize={0}
						bgColor="#ffffff"
						fgColor="#000000"
					/>
				</div>

				<div className="border-t border-black/10 bg-black/[0.025] px-7 py-4">
					<div className="font-mono text-[10px] tracking-widest text-black/50 uppercase">
						Scan to open
					</div>
					<div className="mt-1 truncate text-sm font-medium text-black/80">
						{subtitle}
					</div>
				</div>
			</div>
		</div>
	)
}
