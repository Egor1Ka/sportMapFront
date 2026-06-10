'use client'

import {
	use,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Printer } from 'lucide-react'

import { playgroundApi, ApiError, type Playground } from '@/services'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '@/components/ui/empty'
import { PlaygroundQrCode } from '@/components/sports-map/PlaygroundQrCode'
import { buildPlaygroundShareUrl } from '@/lib/qr-url'
import { cn } from '@/lib/utils'

type RouteParams = { id: string; locale: string }
type Props = { params: Promise<RouteParams> }

const subscribeNoop = () => () => {}
const getOriginSnapshot = () => window.location.origin
const getOriginServerSnapshot = () => ''

function PlaygroundPrintPage({ params }: Props) {
	const { id } = use(params)
	const t = useTranslations('sportsMapPages')
	const tQr = useTranslations('qrPrint')

	const [playground, setPlayground] = useState<Playground | null>(null)
	const [error, setError] = useState<ApiError | null>(null)
	const [loading, setLoading] = useState(true)
	const [retryCount, setRetryCount] = useState(0)

	const origin = useSyncExternalStore(
		subscribeNoop,
		getOriginSnapshot,
		getOriginServerSnapshot,
	)

	const printedRef = useRef(false)

	useEffect(() => {
		let cancelled = false

		const handleData = (data: Playground) => {
			if (cancelled) return
			setPlayground(data)
			setLoading(false)
		}
		const handleError = (err: unknown) => {
			if (cancelled) return
			if (err instanceof ApiError) {
				setError(err)
			}
			setLoading(false)
		}

		playgroundApi
			.getById({ pathParams: { id }, silent: true })
			.then(handleData)
			.catch(handleError)

		return () => {
			cancelled = true
		}
	}, [id, retryCount])

	useEffect(() => {
		if (!playground || !origin || printedRef.current) return
		printedRef.current = true
		window.print()
	}, [playground, origin])

	const handleRetry = () => {
		printedRef.current = false
		setError(null)
		setLoading(true)
		setRetryCount((count) => count + 1)
	}

	const handleReprint = () => {
		window.print()
	}

	const renderLoading = () => (
		<div className="flex flex-col items-center gap-4">
			<Skeleton className="h-[520px] w-[520px] rounded-lg" />
			<Skeleton className="h-4 w-64" />
		</div>
	)

	const renderError = () => (
		<Empty>
			<EmptyHeader>
				<EmptyTitle>{t('print.loadError')}</EmptyTitle>
				<EmptyDescription>
					{t('print.loadErrorDesc')}
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={handleRetry}
						className={buttonVariants({ variant: 'default', size: 'sm' })}
					>
						{t('print.retry')}
					</button>
					<Link
						href="/sports-map"
						className={buttonVariants({ variant: 'outline', size: 'sm' })}
					>
						<ArrowLeft className="mr-1 h-4 w-4" />
						{t('print.backToMap')}
					</Link>
				</div>
			</EmptyContent>
		</Empty>
	)

	const renderReady = (data: Playground) => (
		<>
			<PlaygroundQrCode
				url={buildPlaygroundShareUrl(origin, id)}
				tagline={tQr('tagline')}
			/>
			<div className="no-print mt-12 flex gap-3">
				<button
					type="button"
					onClick={handleReprint}
					className={buttonVariants({ variant: 'default', size: 'sm' })}
				>
					<Printer className="mr-1 h-4 w-4" />
					{t('print.reprintButton')}
				</button>
				<Link
					href={`/sports-map/${data.id}`}
					className={buttonVariants({ variant: 'outline', size: 'sm' })}
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					{t('print.backToPlayground')}
				</Link>
			</div>
		</>
	)

	const renderBody = () => {
		if (loading) return renderLoading()
		if (error) return renderError()
		if (playground && origin) return renderReady(playground)
		return renderLoading()
	}

	return (
		<>
			<style>{`
				@page { size: A4; margin: 0; }
				@media print {
					html, body { background: white !important; }
					.no-print { display: none !important; }
					header,
					[data-slot="sidebar"],
					[data-slot="sidebar-gap"],
					[data-slot="sidebar-container"],
					[data-slot="sidebar-rail"] { display: none !important; }
					[data-slot="playground-qr-code"] { break-inside: avoid; }
				}
			`}</style>
			<meta name="robots" content="noindex" />
			<main
				className={cn(
					'bg-muted flex min-h-screen w-full items-center justify-center px-6 py-12 print:min-h-0 print:bg-white print:px-0 print:py-8',
				)}
			>
				<section className="flex w-full max-w-[210mm] flex-col items-center justify-center bg-white py-16 print:py-0">
					{renderBody()}
				</section>
			</main>
		</>
	)
}

export default PlaygroundPrintPage
