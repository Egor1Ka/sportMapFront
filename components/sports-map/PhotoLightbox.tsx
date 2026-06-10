'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PhotoLightboxProps {
	photos: string[]
	openIndex: number | null
	onChange: (index: number) => void
	onClose: () => void
}

const SWIPE_THRESHOLD = 50

const wrapIndex = (length: number, raw: number): number => {
	if (length <= 0) return 0
	const mod = raw % length
	return mod < 0 ? mod + length : mod
}

function PhotoLightbox({
	photos,
	openIndex,
	onChange,
	onClose,
}: PhotoLightboxProps) {
	const t = useTranslations('sportsMapUi')
	const isOpen = openIndex !== null && photos.length > 0
	const total = photos.length
	const safeIndex =
		openIndex !== null && total > 0 ? wrapIndex(total, openIndex) : 0
	const currentPhoto = isOpen ? photos[safeIndex] : null

	const goPrev = useCallback(() => {
		if (total === 0) return
		onChange(wrapIndex(total, safeIndex - 1))
	}, [onChange, safeIndex, total])

	const goNext = useCallback(() => {
		if (total === 0) return
		onChange(wrapIndex(total, safeIndex + 1))
	}, [onChange, safeIndex, total])

	useEffect(() => {
		if (!isOpen) return

		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') {
				event.preventDefault()
				goPrev()
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault()
				goNext()
			}
		}

		window.addEventListener('keydown', handleKey)
		return () => window.removeEventListener('keydown', handleKey)
	}, [isOpen, goPrev, goNext])

	const touchStartXRef = useRef<number | null>(null)

	const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
		touchStartXRef.current = event.touches[0].clientX
	}

	const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
		const startX = touchStartXRef.current
		touchStartXRef.current = null
		if (startX === null) return

		const delta = event.changedTouches[0].clientX - startX
		if (Math.abs(delta) < SWIPE_THRESHOLD) return
		if (delta > 0) goPrev()
		else goNext()
	}

	const handleOpenChange = (open: boolean) => {
		if (!open) onClose()
	}

	const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
		if (event.target === event.currentTarget) onClose()
	}

	const handlePrevClick = () => goPrev()
	const handleNextClick = () => goNext()
	const handleCloseClick = () => onClose()

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn(
					'!h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 !top-0 !left-0',
					'rounded-none border-0 bg-black/95 p-0 ring-0',
				)}
			>
				<div
					className="relative flex h-full w-full items-center justify-center"
					onClick={handleBackdropClick}
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
				>
					<button
						type="button"
						onClick={handleCloseClick}
						aria-label={t('lightbox.close')}
						className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
					>
						<X className="h-5 w-5" />
					</button>

					{total > 1 ? (
						<span className="absolute top-4 left-4 z-10 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-md">
							{safeIndex + 1} / {total}
						</span>
					) : null}

					{total > 1 ? (
						<button
							type="button"
							onClick={handlePrevClick}
							aria-label={t('lightbox.prev')}
							className="absolute top-1/2 left-2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:left-6"
						>
							<ChevronLeft className="h-6 w-6" />
						</button>
					) : null}

					{total > 1 ? (
						<button
							type="button"
							onClick={handleNextClick}
							aria-label={t('lightbox.next')}
							className="absolute top-1/2 right-2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:right-6"
						>
							<ChevronRight className="h-6 w-6" />
						</button>
					) : null}

					{currentPhoto ? (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img
							src={currentPhoto}
							alt={t('lightbox.photoAlt', { n: safeIndex + 1 })}
							className="max-h-full max-w-full object-contain select-none"
							draggable={false}
						/>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	)
}

export { PhotoLightbox }
