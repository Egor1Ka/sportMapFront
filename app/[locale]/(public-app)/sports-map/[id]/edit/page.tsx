'use client'

import { use, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
	ArrowLeft,
	Info,
	Trash2,
	Upload,
	Loader2,
	ImagePlus,
} from 'lucide-react'

import {
	playgroundApi,
	playgroundEditRequestApi,
	sportApi,
	ApiError,
	type EditRequestDiff,
	type Playground,
	type Sport,
	type UpdatePlaygroundBody,
} from '@/services'
import { useUserOptional } from '@/lib/auth/user-provider'
import {
	computeModeratedDiff,
	isDiffEmpty,
	sportsChanged,
	type ModeratedFields,
} from '@/lib/diff/playground-diff'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type RouteParams = { id: string }
type Props = { params: Promise<RouteParams> }

const PHOTO_MAX_BYTES = 15 * 1024 * 1024
const PHOTO_ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const formatMb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`

const extractServerErrorMessage = (err: ApiError): string => {
	const data = err.data
	if (data && typeof data === 'object' && 'error' in data) {
		const message = (data as { error: unknown }).error
		if (typeof message === 'string' && message.length > 0) return message
	}
	return err.message || ''
}

const buildSchema = (t: ReturnType<typeof useTranslations>) =>
	z.object({
		name: z.string().max(200),
		description: z.string().max(2000),
		city: z.string().max(120),
		district: z.string().max(120),
		street: z.string().max(200),
		fullAddress: z.string().max(400),
		lat: z
			.number({ message: t('edit.latMustBeNumber') })
			.min(-90, t('edit.latRange'))
			.max(90, t('edit.latRange')),
		lng: z
			.number({ message: t('edit.lngMustBeNumber') })
			.min(-180, t('edit.lngRange'))
			.max(180, t('edit.lngRange')),
		sportIds: z.array(z.string()),
	})

type FormData = z.infer<ReturnType<typeof buildSchema>>

const sortByOrder = (a: Sport, b: Sport) => {
	if (a.order !== b.order) return a.order - b.order
	return a.label.localeCompare(b.label)
}

const emptyToNull = (value: string): string | null => {
	const trimmed = value.trim()
	return trimmed.length === 0 ? null : trimmed
}

const buildDefaults = (playground: Playground): FormData => ({
	name: playground.name ?? '',
	description: playground.description ?? '',
	city: playground.address.city ?? '',
	district: playground.address.district ?? '',
	street: playground.address.street ?? '',
	fullAddress: playground.address.fullAddress ?? '',
	lat: playground.lat ?? 0,
	lng: playground.lng ?? 0,
	sportIds: playground.sports.map((sport) => sport.id),
})

const buildPatch = (data: FormData): UpdatePlaygroundBody => ({
	name: emptyToNull(data.name),
	description: emptyToNull(data.description),
	address: {
		city: emptyToNull(data.city),
		district: emptyToNull(data.district),
		street: emptyToNull(data.street),
		fullAddress: emptyToNull(data.fullAddress),
	},
	lat: data.lat,
	lng: data.lng,
	sports: data.sportIds,
})

const buildModerated = (data: FormData): ModeratedFields => ({
	name: emptyToNull(data.name),
	description: emptyToNull(data.description),
	address: {
		city: emptyToNull(data.city),
		district: emptyToNull(data.district),
		street: emptyToNull(data.street),
		fullAddress: emptyToNull(data.fullAddress),
	},
	lat: data.lat,
	lng: data.lng,
})

const EditLoading = () => (
	<div className="mx-auto w-full max-w-3xl space-y-6 p-6">
		<Skeleton className="h-8 w-40" />
		<Skeleton className="h-64 w-full" />
		<Skeleton className="h-48 w-full" />
		<Skeleton className="h-72 w-full" />
	</div>
)

const PlaygroundEditPage = ({ params }: Props) => {
	const { id } = use(params)
	const t = useTranslations('sportsMapPages')
	const tMod = useTranslations()
	const viewer = useUserOptional()

	const [playground, setPlayground] = useState<Playground | null>(null)
	const [sports, setSports] = useState<Sport[]>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)
	const [removingUrl, setRemovingUrl] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const isOwner = playground?.viewer?.isOwner ?? false
	const isAdmin = viewer?.isAdmin ?? false
	const isEffective = isOwner || isAdmin
	const canDeletePhotos = isEffective

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
			lat: 0,
			lng: 0,
			sportIds: [],
		},
	})

	const {
		register,
		control,
		handleSubmit,
		reset,
		watch,
		formState: { errors, isDirty, dirtyFields },
	} = form

	const selectedSportsCount = watch('sportIds').length

	const isModeratedDirty = Object.keys(dirtyFields).some(
		(key) => key !== 'sportIds',
	)
	const proposeMode = !isEffective && isModeratedDirty

	useEffect(() => {
		let cancelled = false
		const load = async () => {
			setLoading(true)
			try {
				const [playgroundResult, sportsResult] = await Promise.all([
					playgroundApi.getById({ pathParams: { id }, silent: true }),
					sportApi.list({ silent: true }),
				])
				if (cancelled) return
				setPlayground(playgroundResult)
				setSports([...sportsResult.items].sort(sortByOrder))
				reset(buildDefaults(playgroundResult))
			} catch (err) {
				if (cancelled) return
				const message =
					err instanceof ApiError
						? err.displayMessage
						: t('edit.loadError')
				toast.error(message)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		load()
		return () => {
			cancelled = true
		}
	}, [id, reset, t])

	const submitAsEffective = async (data: FormData) => {
		const result = await playgroundApi.update({
			pathParams: { id },
			body: buildPatch(data),
		})
		setPlayground(result)
		reset(buildDefaults(result))
		toast.success(tMod('moderation.toast.saved'))
	}

	const submitAsModerated = async (data: FormData, current: Playground) => {
		const moderatedDiff = computeModeratedDiff(current, buildModerated(data))
		const sportsDirty = sportsChanged(current, data.sportIds)
		const hasModerated = !isDiffEmpty(moderatedDiff)

		if (!hasModerated && !sportsDirty) {
			toast.info(tMod('moderation.toast.nothingToChange'))
			return
		}

		const tasks: Array<Promise<unknown>> = []
		if (hasModerated) {
			tasks.push(
				playgroundEditRequestApi.submit({
					pathParams: { id },
					body: { diff: moderatedDiff as EditRequestDiff },
				}),
			)
		}
		if (sportsDirty) {
			tasks.push(
				playgroundApi.update({
					pathParams: { id },
					body: { sports: data.sportIds },
				}),
			)
		}

		await Promise.all(tasks)

		if (sportsDirty) {
			const refreshed = await playgroundApi.getById({
				pathParams: { id },
				silent: true,
			})
			setPlayground(refreshed)
			reset(buildDefaults(refreshed))
		} else {
			reset(buildDefaults(current))
		}

		if (hasModerated) {
			toast.success(tMod('moderation.toast.submitted'), {
				description: tMod('moderation.toast.submittedDesc'),
			})
		} else {
			toast.success(tMod('moderation.toast.saved'))
		}
	}

	const onSubmit = async (data: FormData) => {
		if (!playground) return
		setSaving(true)
		try {
			if (isEffective) {
				await submitAsEffective(data)
			} else {
				await submitAsModerated(data, playground)
			}
		} catch (err) {
			if (!(err instanceof ApiError)) {
				toast.error(tMod('moderation.toast.saveFailed'))
			}
		} finally {
			setSaving(false)
		}
	}

	const handleFilePick = () => fileInputRef.current?.click()

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		event.target.value = ''
		if (!file) return

		if (!PHOTO_ALLOWED_MIMES.includes(file.type)) {
			toast.error(t('edit.photoUnsupportedFormat'), {
				description: t('edit.photoAllowedFormats'),
			})
			return
		}
		if (file.size > PHOTO_MAX_BYTES) {
			toast.error(t('edit.photoTooLarge'), {
				description: t('edit.photoTooLargeDesc', {
					size: formatMb(file.size),
					max: formatMb(PHOTO_MAX_BYTES),
				}),
			})
			return
		}

		setUploadingPhoto(true)
		try {
			const formData = new FormData()
			formData.append('file', file)
			const result = await playgroundApi.uploadPhoto({
				pathParams: { id },
				body: formData,
				silent: true,
			})
			setPlayground(result)
			toast.success(t('edit.photoAdded'))
		} catch (err) {
			if (err instanceof ApiError) {
				toast.error(t('edit.photoUploadError'), {
					description: extractServerErrorMessage(err),
				})
			} else {
				toast.error(t('edit.photoUploadError'))
			}
		} finally {
			setUploadingPhoto(false)
		}
	}

	const handleRemovePhoto = (url: string) => async () => {
		setRemovingUrl(url)
		try {
			const result = await playgroundApi.removePhoto({
				pathParams: { id },
				queryParams: { url },
			})
			setPlayground(result)
			toast.success(t('edit.photoRemoved'))
		} catch (err) {
			if (!(err instanceof ApiError)) toast.error(t('edit.photoRemoveError'))
		} finally {
			setRemovingUrl(null)
		}
	}

	if (loading) return <EditLoading />
	if (!playground) {
		return (
			<div className="mx-auto w-full max-w-2xl p-6">
				<p className="text-muted-foreground">{t('edit.notFound')}</p>
				<Link
					href="/sports-map"
					className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4')}
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					{t('edit.backToMap')}
				</Link>
			</div>
		)
	}

	return (
		<div className="bg-background min-h-screen pb-16">
			<div className="mx-auto w-full max-w-3xl space-y-6 p-6">
				<div className="flex items-center justify-between gap-4">
					<Link
						href={`/sports-map/${id}`}
						className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
					>
						<ArrowLeft className="h-4 w-4" />
						{t('edit.backToPlayground')}
					</Link>
					<Badge variant="secondary">{t('edit.editingBadge')}</Badge>
				</div>

				<h1 className="text-3xl font-semibold tracking-tight">
					{playground.name ?? t('edit.noName')}
				</h1>

				{!isEffective ? (
					<div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
						<Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
						<div className="space-y-0.5">
							<p className="font-medium">{tMod('moderation.banner.title')}</p>
							<p className="text-muted-foreground">
								{tMod('moderation.banner.description')}
							</p>
						</div>
					</div>
				) : null}

				<form
					id="playground-edit-form"
					onSubmit={handleSubmit(onSubmit)}
					className="space-y-6"
				>
					<Card>
						<CardHeader>
							<CardTitle>{t('edit.sectionBasic')}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Field data-invalid={!!errors.name || undefined}>
								<FieldLabel htmlFor="name">{t('edit.fieldName')}</FieldLabel>
								<Input id="name" {...register('name')} placeholder={t('edit.namePlaceholder')} />
								<FieldError errors={[errors.name]} />
							</Field>

							<Field data-invalid={!!errors.description || undefined}>
								<FieldLabel htmlFor="description">{t('edit.fieldDescription')}</FieldLabel>
								<Textarea
									id="description"
									{...register('description')}
									rows={5}
									placeholder={t('edit.descriptionPlaceholder')}
								/>
								<FieldDescription>{t('edit.descriptionHint')}</FieldDescription>
								<FieldError errors={[errors.description]} />
							</Field>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t('edit.sectionAddress')}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Field>
								<FieldLabel htmlFor="fullAddress">{t('edit.fieldFullAddress')}</FieldLabel>
								<Input
									id="fullAddress"
									{...register('fullAddress')}
									placeholder={t('edit.fullAddressPlaceholder')}
								/>
							</Field>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel htmlFor="city">{t('edit.fieldCity')}</FieldLabel>
									<Input id="city" {...register('city')} />
								</Field>
								<Field>
									<FieldLabel htmlFor="district">{t('edit.fieldDistrict')}</FieldLabel>
									<Input id="district" {...register('district')} />
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="street">{t('edit.fieldStreet')}</FieldLabel>
								<Input id="street" {...register('street')} />
							</Field>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t('edit.sectionCoords')}</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<Field data-invalid={!!errors.lat || undefined}>
									<FieldLabel htmlFor="lat">{t('edit.fieldLat')}</FieldLabel>
									<Input
										id="lat"
										type="number"
										step="any"
										{...register('lat', { valueAsNumber: true })}
									/>
									<FieldError errors={[errors.lat]} />
								</Field>
								<Field data-invalid={!!errors.lng || undefined}>
									<FieldLabel htmlFor="lng">{t('edit.fieldLng')}</FieldLabel>
									<Input
										id="lng"
										type="number"
										step="any"
										{...register('lng', { valueAsNumber: true })}
									/>
									<FieldError errors={[errors.lng]} />
								</Field>
							</div>
						</CardContent>
					</Card>

					<CollapsibleCard
						title={t('edit.sectionSports')}
						meta={
							selectedSportsCount > 0
								? t('edit.sportsSelected', { count: selectedSportsCount })
								: t('edit.sportsNone')
						}
					>
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
					</CollapsibleCard>
				</form>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between gap-4">
							<span>
								{t('edit.sectionPhotos')}
								<span className="text-muted-foreground ml-1 text-sm font-normal">
									({playground.photos.length})
								</span>
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleFilePick}
								disabled={uploadingPhoto}
							>
								{uploadingPhoto ? (
									<Loader2 className="mr-1 h-4 w-4 animate-spin" />
								) : (
									<Upload className="mr-1 h-4 w-4" />
								)}
								{t('edit.addPhoto')}
							</Button>
						</CardTitle>
						<p className="text-muted-foreground text-xs">
							{t('edit.photoAutoSaveHint')}
						</p>
					</CardHeader>
					<CardContent>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							className="hidden"
							onChange={handleFileChange}
						/>

						{playground.photos.length === 0 ? (
							<button
								type="button"
								onClick={handleFilePick}
								disabled={uploadingPhoto}
								className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 transition disabled:cursor-not-allowed disabled:opacity-50"
							>
								<ImagePlus className="h-8 w-8" />
								<span className="text-sm">{t('edit.addFirstPhoto')}</span>
								<span className="text-xs">
									{t('edit.photoFormats', { max: formatMb(PHOTO_MAX_BYTES) })}
								</span>
							</button>
						) : (
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{playground.photos.map((url, index) => (
									<PhotoTile
										key={`${url}-${index}`}
										url={url}
										index={index}
										removing={removingUrl === url}
										canDelete={canDeletePhotos}
										onRemove={handleRemovePhoto(url)}
										deleteAriaLabel={t('edit.deletePhotoAria')}
										altFn={(n) => t('edit.photoAlt', { n })}
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Separator />

				<div className="flex flex-wrap items-center justify-end gap-3">
					{!isDirty && !saving ? (
						<span className="text-muted-foreground mr-auto text-xs">
							{t('edit.noChangesHint')}
						</span>
					) : null}
					{proposeMode && !saving ? (
						<span className="text-muted-foreground mr-auto text-xs">
							{tMod('moderation.submit.hint')}
						</span>
					) : null}
					<Link
						href={`/sports-map/${id}`}
						className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}
					>
						{t('edit.cancel')}
					</Link>
					<Button
						type="submit"
						form="playground-edit-form"
						disabled={saving || !isDirty}
					>
						{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
						{proposeMode
							? tMod('moderation.submit.propose')
							: tMod('moderation.submit.save')}
					</Button>
				</div>
			</div>
		</div>
	)
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
	url: string
	index: number
	removing: boolean
	canDelete: boolean
	onRemove: () => void
	deleteAriaLabel: string
	altFn: (n: number) => string
}

const PhotoTile = ({ url, index, removing, canDelete, onRemove, deleteAriaLabel, altFn }: PhotoTileProps) => (
	<div className="bg-muted group relative aspect-video w-full overflow-hidden rounded-lg">
		{/* eslint-disable-next-line @next/next/no-img-element */}
		<img
			src={url}
			alt={altFn(index + 1)}
			className="absolute inset-0 h-full w-full object-cover"
		/>
		{canDelete ? (
			<button
				type="button"
				onClick={onRemove}
				disabled={removing}
				className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100 hover:bg-red-600 disabled:opacity-100"
				aria-label={deleteAriaLabel}
			>
				{removing ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Trash2 className="h-4 w-4" />
				)}
			</button>
		) : null}
	</div>
)

export default PlaygroundEditPage
