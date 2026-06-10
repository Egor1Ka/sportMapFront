'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ImagePlus, Loader2, MapPin, Trash2 } from 'lucide-react'

import {
	playgroundApi,
	sportApi,
	ApiError,
	type Sport,
	type CreatePlaygroundBody,
} from '@/services'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { NominatimAddressHint } from '@/lib/nominatim'

const PlaygroundLocationPicker = dynamic(
	() => import('@/components/sports-map/PlaygroundLocationPicker'),
	{
		ssr: false,
		loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
	},
)

const PHOTO_MAX_BYTES = 15 * 1024 * 1024
const PHOTO_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const formatMb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const buildSchema = (t: ReturnType<typeof useTranslations>) =>
	z.object({
		name: z.string().max(200),
		description: z.string().max(2000),
		city: z.string().max(120),
		district: z.string().max(120),
		street: z.string().max(200),
		fullAddress: z.string().max(400),
		lat: z
			.number({ message: t('new.latRequired') })
			.min(-90, t('new.latRange'))
			.max(90, t('new.latRange')),
		lng: z
			.number({ message: t('new.lngRequired') })
			.min(-180, t('new.lngRange'))
			.max(180, t('new.lngRange')),
		sportIds: z.array(z.string()),
	})

type FormData = z.infer<ReturnType<typeof buildSchema>>

const sortByOrder = (a: Sport, b: Sport) => {
	if (a.order !== b.order) return a.order - b.order
	return a.label.localeCompare(b.label)
}

const emptyToUndefined = (value: string): string | undefined => {
	const trimmed = value.trim()
	return trimmed.length === 0 ? undefined : trimmed
}

const buildAddressPayload = (data: FormData) => {
	const city = emptyToUndefined(data.city)
	const district = emptyToUndefined(data.district)
	const street = emptyToUndefined(data.street)
	const fullAddress = emptyToUndefined(data.fullAddress)
	if (!city && !district && !street && !fullAddress) return undefined
	return { city, district, street, fullAddress }
}

const buildCreatePayload = (data: FormData): CreatePlaygroundBody => ({
	name: emptyToUndefined(data.name),
	description: emptyToUndefined(data.description),
	lat: data.lat,
	lng: data.lng,
	address: buildAddressPayload(data),
	sports: data.sportIds.length > 0 ? data.sportIds : undefined,
})

const isAllowedFile = (file: File): boolean => {
	if (!PHOTO_ALLOWED_MIMES.includes(file.type)) return false
	if (file.size > PHOTO_MAX_BYTES) return false
	return true
}

type SportsPickerProps = {
	sports: Sport[]
	value: string[]
	onChange: (next: string[]) => void
}

const SportsPicker = ({ sports, value, onChange }: SportsPickerProps) => {
	const toggle = (sportId: string) => () => {
		const next = value.includes(sportId)
			? value.filter((item) => item !== sportId)
			: [...value, sportId]
		onChange(next)
	}
	const renderRow = (sport: Sport) => {
		const checked = value.includes(sport.id)
		return (
			<label
				key={sport.id}
				className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm"
			>
				<Checkbox checked={checked} onCheckedChange={toggle(sport.id)} />
				{sport.icon ? <span aria-hidden>{sport.icon}</span> : null}
				<span className="flex-1">{sport.label}</span>
			</label>
		)
	}
	return <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{sports.map(renderRow)}</div>
}

type PhotoTileProps = {
	file: File
	onRemove: () => void
	deleteAriaLabel: string
}

const PhotoTile = ({ file, onRemove, deleteAriaLabel }: PhotoTileProps) => {
	const url = useMemo(() => URL.createObjectURL(file), [file])
	useEffect(() => {
		return () => URL.revokeObjectURL(url)
	}, [url])
	return (
		<div className="bg-muted group relative aspect-video w-full overflow-hidden rounded-lg">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={url}
				alt={file.name}
				className="absolute inset-0 h-full w-full object-cover"
			/>
			<button
				type="button"
				onClick={onRemove}
				className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100 hover:bg-red-600"
				aria-label={deleteAriaLabel}
			>
				<Trash2 className="h-4 w-4" />
			</button>
			<div className="absolute right-0 bottom-0 left-0 truncate bg-black/50 px-2 py-1 text-xs text-white">
				{file.name} · {formatMb(file.size)}
			</div>
		</div>
	)
}

const PlaygroundCreatePage = () => {
	const t = useTranslations('sportsMapPages')
	const router = useRouter()
	const [sports, setSports] = useState<Sport[]>([])
	const [sportsLoading, setSportsLoading] = useState(true)
	const [photos, setPhotos] = useState<File[]>([])
	const [saving, setSaving] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const schema = useMemo(() => buildSchema(t), [t])

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '',
			description: '',
			city: '',
			district: '',
			street: '',
			fullAddress: '',
			sportIds: [],
		} as Partial<FormData> as FormData,
	})

	const {
		register,
		control,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form

	const lat = watch('lat')
	const lng = watch('lng')
	const selectedSportsCount = watch('sportIds').length

	useEffect(() => {
		let cancelled = false
		const load = async () => {
			try {
				const result = await sportApi.list({ silent: true })
				if (cancelled) return
				setSports([...result.items].sort(sortByOrder))
			} catch {
				if (cancelled) return
				toast.error(t('new.loadSportsError'))
			} finally {
				if (!cancelled) setSportsLoading(false)
			}
		}
		load()
		return () => {
			cancelled = true
		}
	}, [t])

	const applyAddressHint = (hint: NominatimAddressHint | undefined) => {
		if (!hint) return
		if (hint.city) setValue('city', hint.city, { shouldDirty: true })
		if (hint.district) setValue('district', hint.district, { shouldDirty: true })
		if (hint.street) setValue('street', hint.street, { shouldDirty: true })
		if (hint.fullAddress) setValue('fullAddress', hint.fullAddress, { shouldDirty: true })
	}

	const handleLocationChange = (next: {
		lat: number
		lng: number
		addressHint?: NominatimAddressHint
	}) => {
		setValue('lat', next.lat, { shouldValidate: true, shouldDirty: true })
		setValue('lng', next.lng, { shouldValidate: true, shouldDirty: true })
		applyAddressHint(next.addressHint)
	}

	const handleFilePick = () => fileInputRef.current?.click()

	const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const list = event.target.files
		event.target.value = ''
		if (!list || list.length === 0) return
		const fresh: File[] = []
		const rejected: string[] = []
		Array.from(list).forEach((file) => {
			if (isAllowedFile(file)) fresh.push(file)
			else rejected.push(file.name)
		})
		if (rejected.length > 0) {
			toast.error(t('new.someFilesRejected'), {
				description: `${t('new.allowedFormatsHint', { max: formatMb(PHOTO_MAX_BYTES) })}: ${rejected.join(', ')}`,
			})
		}
		if (fresh.length > 0) setPhotos((prev) => [...prev, ...fresh])
	}

	const handleRemovePhoto = (index: number) => () => {
		setPhotos((prev) => prev.filter((_, i) => i !== index))
	}

	const uploadPhotos = async (id: string) => {
		if (photos.length === 0) return
		const total = photos.length
		const toastId = toast.loading(t('new.uploadingPhoto', { uploaded: 0, total }))
		let uploaded = 0
		try {
			for (const file of photos) {
				const formData = new FormData()
				formData.append('file', file)
				await playgroundApi.uploadPhoto({
					pathParams: { id },
					body: formData,
					silent: true,
				})
				uploaded += 1
				toast.loading(t('new.uploadingPhoto', { uploaded, total }), { id: toastId })
			}
			toast.success(t('new.uploadDone', { uploaded, total }), { id: toastId })
		} catch {
			toast.error(t('new.uploadPartial', { uploaded, total }), {
				id: toastId,
			})
			throw new Error('photo-upload-failed')
		}
	}

	const onSubmit = async (data: FormData) => {
		setSaving(true)
		try {
			const playground = await playgroundApi.create({ body: buildCreatePayload(data) })
			try {
				await uploadPhotos(playground.id)
				toast.success(t('new.createSuccess'))
				router.push(`/sports-map/${playground.id}`)
			} catch {
				router.push(`/sports-map/${playground.id}/edit`)
			}
		} catch (err) {
			if (!(err instanceof ApiError)) toast.error(t('new.createError'))
		} finally {
			setSaving(false)
		}
	}

	const hasLocation = typeof lat === 'number' && typeof lng === 'number'

	return (
		<div className="bg-background min-h-screen pb-32">
			<div className="mx-auto w-full max-w-3xl space-y-6 p-6">
				<div className="flex items-center justify-between gap-4">
					<Link
						href="/sports-map"
						className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
					>
						<ArrowLeft className="h-4 w-4" />
						{t('new.backToMap')}
					</Link>
				</div>

				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<Link href="/sports-map" className="hover:text-foreground transition-colors">
								{t('new.mapBreadcrumb')}
							</Link>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{t('new.breadcrumbNew')}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div className="space-y-2">
					<h1 className="text-3xl font-semibold tracking-tight">{t('new.pageTitle')}</h1>
					<p className="text-muted-foreground text-sm">
						{t('new.pageSubtitle')}
					</p>
				</div>

				<form
					id="playground-create-form"
					onSubmit={handleSubmit(onSubmit)}
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>{t('new.sectionBasic')}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Field data-invalid={!!errors.name || undefined}>
								<FieldLabel htmlFor="name">{t('new.fieldName')}</FieldLabel>
								<Input id="name" {...register('name')} placeholder={t('new.namePlaceholder')} />
								<FieldError errors={[errors.name]} />
							</Field>

							<Field data-invalid={!!errors.description || undefined}>
								<FieldLabel htmlFor="description">{t('new.fieldDescription')}</FieldLabel>
								<Textarea
									id="description"
									{...register('description')}
									rows={5}
									placeholder={t('new.descriptionPlaceholder')}
								/>
								<FieldDescription>{t('new.descriptionHint')}</FieldDescription>
								<FieldError errors={[errors.description]} />
							</Field>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MapPin className="h-5 w-5" />
								{t('new.sectionLocation')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Controller
								control={control}
								name="lat"
								render={() => (
									<PlaygroundLocationPicker
										value={{ lat, lng }}
										onChange={handleLocationChange}
										errors={{
											lat: errors.lat?.message,
											lng: errors.lng?.message,
										}}
									/>
								)}
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t('new.sectionAddress')}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Field>
								<FieldLabel htmlFor="fullAddress">{t('new.fieldFullAddress')}</FieldLabel>
								<Input
									id="fullAddress"
									{...register('fullAddress')}
									placeholder={t('new.fullAddressPlaceholder')}
								/>
								<FieldDescription>
									{t('new.fullAddressAutoHint')}
								</FieldDescription>
							</Field>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel htmlFor="city">{t('new.fieldCity')}</FieldLabel>
									<Input id="city" {...register('city')} />
								</Field>
								<Field>
									<FieldLabel htmlFor="district">{t('new.fieldDistrict')}</FieldLabel>
									<Input id="district" {...register('district')} />
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="street">{t('new.fieldStreet')}</FieldLabel>
								<Input id="street" {...register('street')} />
							</Field>
						</CardContent>
					</Card>

					<CollapsibleCard
						title={t('new.sectionSports')}
						meta={
							selectedSportsCount > 0
								? t('new.sportsSelected', { count: selectedSportsCount })
								: t('new.sportsNone')
						}
					>
						{sportsLoading ? (
							<Skeleton className="h-40 w-full" />
						) : (
							<Controller
								control={control}
								name="sportIds"
								render={({ field }) => (
									<SportsPicker
										sports={sports}
										value={field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						)}
					</CollapsibleCard>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between gap-4">
								<span>
									{t('new.sectionPhotos')}
									{photos.length > 0 ? (
										<span className="text-muted-foreground ml-1 text-sm font-normal">
											({photos.length})
										</span>
									) : null}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleFilePick}
								>
									<ImagePlus className="mr-1 h-4 w-4" />
									{t('new.addPhoto')}
								</Button>
							</CardTitle>
							<p className="text-muted-foreground text-xs">
								{t('new.photoAutoUploadHint')}
							</p>
						</CardHeader>
						<CardContent>
							<input
								ref={fileInputRef}
								type="file"
								multiple
								accept="image/jpeg,image/png,image/webp,image/gif"
								className="hidden"
								onChange={handleFilesChange}
							/>
							{photos.length === 0 ? (
								<button
									type="button"
									onClick={handleFilePick}
									className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 transition"
								>
									<ImagePlus className="h-8 w-8" />
									<span className="text-sm">{t('new.dropzoneLabel')}</span>
									<span className="text-xs">
										{t('new.photoFormats', { max: formatMb(PHOTO_MAX_BYTES) })}
									</span>
								</button>
							) : (
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									{photos.map((file, index) => (
										<PhotoTile
											key={`${file.name}-${index}`}
											file={file}
											onRemove={handleRemovePhoto(index)}
											deleteAriaLabel={t('new.deletePhotoAria')}
										/>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</form>
			</div>

			<div className="bg-background/80 fixed right-0 bottom-0 left-0 z-40 border-t backdrop-blur-md">
				<div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 p-4">
					<span className="text-muted-foreground text-xs">
						{hasLocation
							? t('new.readyToCreate')
							: t('new.pickLocationHint')}
					</span>
					<div className="flex items-center gap-3">
						<Link
							href="/sports-map"
							className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}
						>
							{t('new.cancel')}
						</Link>
						<Button
							type="submit"
							form="playground-create-form"
							disabled={saving || !hasLocation}
						>
							{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
							{t('new.submitButton')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default PlaygroundCreatePage
