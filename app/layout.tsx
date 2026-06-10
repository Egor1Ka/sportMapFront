import { NewRelicBrowserScript } from '@/lib/monitoring/new-relic-browser-script'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })
const spaceGrotesk = Space_Grotesk({
	subsets: ['latin', 'latin-ext'],
	variable: '--font-space-grotesk',
	weight: ['400', '500', '600', '700'],
})

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html
			className={cn('font-sans', inter.variable, spaceGrotesk.variable)}
			suppressHydrationWarning
		>
			<body className="antialiased">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
				<NewRelicBrowserScript />
			</body>
		</html>
	)
}
