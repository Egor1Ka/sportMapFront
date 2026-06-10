'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'

const ROTATION_MS = 4000

type CarouselItem = {
	url: string
	tag: string
	name: string
	rating: string
}

type Props = {
	items: CarouselItem[]
}

type SlideProps = {
	item: CarouselItem
	isActive: boolean
}

const Slide = ({ item, isActive }: SlideProps) => (
	<div
		className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}
	>
		<Image
			src={item.url}
			alt=""
			fill
			sizes="(max-width: 1024px) 100vw, 600px"
			className="object-cover"
		/>
		<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
		<div className="border-foreground/15 bg-background/80 absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3 rounded-2xl border p-3 backdrop-blur-xl sm:right-5 sm:bottom-5 sm:left-5 sm:gap-4 sm:p-4">
			<div className="min-w-0">
				<div className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
					{item.tag}
				</div>
				<div className="mt-1 truncate text-sm font-semibold">{item.name}</div>
			</div>
			<div className="flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1">
				<Star className="h-3 w-3 fill-brand text-brand" />
				<span className="text-xs font-medium text-brand">
					{item.rating}
				</span>
			</div>
		</div>
	</div>
)

const Dot = ({ active }: { active: boolean }) => (
	<span
		className={`h-1 rounded-full transition-all duration-500 ${active ? 'w-8 bg-brand' : 'bg-foreground/30 w-3'}`}
	/>
)

export function PhotosCarousel({ items }: Props) {
	const [index, setIndex] = useState(0)

	useEffect(() => {
		const advance = () => setIndex((current) => (current + 1) % items.length)
		const id = setInterval(advance, ROTATION_MS)
		return () => clearInterval(id)
	}, [items.length])

	const renderSlide = (item: CarouselItem, slideIndex: number) => (
		<Slide
			key={item.url}
			item={item}
			isActive={slideIndex === index}
		/>
	)

	const renderDot = (item: CarouselItem, dotIndex: number) => (
		<Dot key={item.url} active={dotIndex === index} />
	)

	return (
		<div className="border-foreground/10 relative aspect-[5/4] overflow-hidden rounded-3xl border">
			{items.map(renderSlide)}
			<div className="absolute top-5 right-5 z-10 flex items-center gap-1.5">
				{items.map(renderDot)}
			</div>
		</div>
	)
}
