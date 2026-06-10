import { LanguageSwitcher } from '@/components/language-switcher'

export default function AuthLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
			<div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.75_0.15_250/0.45),transparent)]" />
			<div className="absolute top-4 right-4">
				<LanguageSwitcher />
			</div>
			<div className="w-full max-w-sm">{children}</div>
		</div>
	)
}
