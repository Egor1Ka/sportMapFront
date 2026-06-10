'use client'

export default function GlobalError({
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: '100vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily:
						'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
					backgroundColor: '#fafafa',
					color: '#18181b',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '24px',
						maxWidth: '448px',
						padding: '24px',
						textAlign: 'center',
					}}
				>
					<h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
						Something went wrong
					</h1>
					<p
						style={{
							fontSize: '14px',
							color: '#71717a',
							margin: 0,
							lineHeight: 1.5,
						}}
					>
						An unexpected error occurred. Please try again.
					</p>
					<button
						onClick={reset}
						style={{
							padding: '8px 16px',
							fontSize: '14px',
							fontWeight: 500,
							border: '1px solid #e4e4e7',
							borderRadius: '8px',
							backgroundColor: '#ffffff',
							color: '#18181b',
							cursor: 'pointer',
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	)
}
