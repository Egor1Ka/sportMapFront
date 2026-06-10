import { Header } from '@/components/landing/header'
import { Footer } from '@/components/landing/footer'
import './landing.css'

export default function LandingLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="bg-background text-foreground min-h-screen">
			<Header />
			<main>{children}</main>
			<Footer />
		</div>
	)
}
