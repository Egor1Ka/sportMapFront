'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import type { MapPoint } from '@/lib/overpass'

const SportsMap = dynamic(() => import('@/components/sports-map/SportsMap'), {
	ssr: false,
	loading: () => (
		<div className="bg-foreground/5 absolute inset-0 animate-pulse" />
	),
})

const DEFAULT_CENTER: [number, number] = [48.4647, 35.0462]
const DEFAULT_ZOOM = 13

const HERO_POINTS: MapPoint[] = [
	{
		id: 'h1',
		lat: 48.4702,
		lon: 35.0405,
		name: 'Park Avenue Court',
		sports: [{ code: 'basketball', label: 'Basketball' }],
		rating: { average: 4.8, count: 32 },
	},
	{
		id: 'h2',
		lat: 48.4658,
		lon: 35.0552,
		name: 'Olympic Field',
		sports: [{ code: 'soccer', label: 'Football' }],
		rating: { average: 4.6, count: 21 },
	},
	{
		id: 'h3',
		lat: 48.4596,
		lon: 35.0485,
		name: 'Center Court',
		sports: [{ code: 'tennis', label: 'Tennis' }],
	},
	{
		id: 'h4',
		lat: 48.4728,
		lon: 35.0598,
		name: 'Workout Zone',
		sports: [{ code: 'fitness', label: 'Fitness' }],
	},
	{
		id: 'h5',
		lat: 48.4574,
		lon: 35.0398,
		name: 'Skate Plaza',
		sports: [{ code: 'skateboard', label: 'Skate' }],
	},
	{
		id: 'h6',
		lat: 48.4694,
		lon: 35.0286,
		name: 'Bouldering Wall',
		sports: [{ code: 'climbing', label: 'Climbing' }],
	},
	{
		id: 'h7',
		lat: 48.4549,
		lon: 35.0612,
		name: 'Beach Volley',
		sports: [{ code: 'volleyball', label: 'Volleyball' }],
	},
	{
		id: 'h8',
		lat: 48.4754,
		lon: 35.0456,
		name: 'Aqua Center',
		sports: [{ code: 'swimming', label: 'Swimming' }],
	},
	{
		id: 'h9',
		lat: 48.4621,
		lon: 35.0758,
		name: 'Running Track',
		sports: [{ code: 'running', label: 'Running' }],
		rating: { average: 4.9, count: 14 },
	},
	{
		id: 'h10',
		lat: 48.4641,
		lon: 35.0152,
		name: 'Chess Tables',
		sports: [{ code: 'chess', label: 'Chess' }],
	},
	{
		id: 'h11',
		lat: 48.4682,
		lon: 35.0682,
		name: 'Yoga Park',
		sports: [{ code: 'yoga', label: 'Yoga' }],
	},
	{
		id: 'h12',
		lat: 48.4538,
		lon: 35.0511,
		name: 'Karting Track',
		sports: [{ code: 'karting', label: 'Karting' }],
	},
]

const SHOWCASE_POINTS: MapPoint[] = [
	...HERO_POINTS,
	{
		id: 's1',
		lat: 48.4810,
		lon: 35.0720,
		name: 'Climbing Gym',
		sports: [{ code: 'climbing', label: 'Climbing' }],
		rating: { average: 4.7, count: 18 },
	},
	{
		id: 's2',
		lat: 48.4820,
		lon: 35.0280,
		name: 'Tennis Academy',
		sports: [{ code: 'tennis', label: 'Tennis' }],
	},
	{
		id: 's3',
		lat: 48.4475,
		lon: 35.0820,
		name: 'BMX Park',
		sports: [{ code: 'cycling', label: 'Cycling' }],
	},
	{
		id: 's4',
		lat: 48.4470,
		lon: 35.0290,
		name: 'Outdoor Gym',
		sports: [{ code: 'fitness', label: 'Fitness' }],
	},
	{
		id: 's5',
		lat: 48.4530,
		lon: 35.0150,
		name: 'Boxing Club',
		sports: [{ code: 'gymnastics', label: 'Gymnastics' }],
	},
	{
		id: 's6',
		lat: 48.4795,
		lon: 35.0540,
		name: 'Ice Rink',
		sports: [{ code: 'ice_skating', label: 'Ice skating' }],
	},
	{
		id: 's7',
		lat: 48.4575,
		lon: 35.0750,
		name: 'Padel Court',
		sports: [{ code: 'pickleball', label: 'Padel' }],
	},
	{
		id: 's8',
		lat: 48.4860,
		lon: 35.0400,
		name: 'Athletics Track',
		sports: [{ code: 'athletics', label: 'Athletics' }],
	},
]

type Variant = 'hero' | 'showcase'

type Props = {
	variant?: Variant
	openLabel: string
	liveLabel: string
	countLabel: string
}

const POINTS_BY_VARIANT: Record<Variant, MapPoint[]> = {
	hero: HERO_POINTS,
	showcase: SHOWCASE_POINTS,
}

const ZOOM_BY_VARIANT: Record<Variant, number> = {
	hero: DEFAULT_ZOOM,
	showcase: 12,
}

const ASPECT_BY_VARIANT: Record<Variant, string> = {
	hero: 'aspect-[5/4]',
	showcase: 'aspect-[4/3] lg:aspect-[16/11]',
}

export function HeroMapPreview({
	variant = 'hero',
	openLabel,
	liveLabel,
	countLabel,
}: Props) {
	const router = useRouter()
	const goToFullMap = () => router.push('/sports-map')

	return (
		<div className="border-foreground/15 bg-background/40 relative w-full overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md">
			<div
				className={`relative w-full overflow-hidden ${ASPECT_BY_VARIANT[variant]}`}
			>
				<div className="absolute inset-0 dark:filter-[brightness(0.72)_contrast(1.05)_saturate(0.92)]">
					<SportsMap
						points={POINTS_BY_VARIANT[variant]}
						center={DEFAULT_CENTER}
						zoom={ZOOM_BY_VARIANT[variant]}
						className="h-full w-full"
						onMapClick={goToFullMap}
						compact
					/>
				</div>

				<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

				<div className="border-foreground/20 bg-background/70 pointer-events-none absolute top-3 left-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur">
					<span className="relative flex h-1.5 w-1.5">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
						<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
					</span>
					<span className="font-mono text-[10px] tracking-widest uppercase">
						{liveLabel}
					</span>
				</div>

				<div className="border-foreground/20 bg-background/70 pointer-events-none absolute right-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 backdrop-blur">
					<span className="text-foreground text-xs font-medium">
						{countLabel}
					</span>
				</div>

				<Link
					href="/sports-map"
					className="group border-foreground/20 bg-background/80 hover:bg-foreground hover:text-background absolute right-3 bottom-3 z-[1000] inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur transition-all"
				>
					{openLabel}
					<ArrowUpRight className="h-3.5 w-3.5" />
				</Link>
			</div>
		</div>
	)
}
