import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Dvir — Play near you.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '72px',
					background:
						'radial-gradient(ellipse at top right, #1b3b2c 0%, #0f1512 60%)',
					color: 'white',
					fontFamily: 'system-ui, -apple-system, sans-serif',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 14,
						fontSize: 22,
						letterSpacing: 6,
						textTransform: 'uppercase',
						color: 'rgba(255,255,255,0.75)',
					}}
				>
					<div
						style={{
							width: 14,
							height: 14,
							borderRadius: 999,
							background: '#e8743b',
							boxShadow: '0 0 24px 6px rgba(232,116,59,0.45)',
						}}
					/>
					Dvir
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<div
						style={{
							display: 'flex',
							fontSize: 110,
							lineHeight: 1,
							fontWeight: 700,
							letterSpacing: -3,
						}}
					>
						Play near you.
					</div>
					<div
						style={{
							display: 'flex',
							fontSize: 110,
							lineHeight: 1,
							fontWeight: 700,
							letterSpacing: -3,
							color: '#4fb286',
						}}
					>
						The game is on.
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						fontSize: 24,
						color: 'rgba(255,255,255,0.7)',
					}}
				>
					<div style={{ display: 'flex' }}>
						Courts · Games · Players · Live
					</div>
					<div style={{ display: 'flex' }}>dvir.app</div>
				</div>
			</div>
		),
		size,
	)
}
