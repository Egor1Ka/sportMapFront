'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { userApi, setServerErrors } from '@/services'
import type { User } from '@/services'

const schema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
})

type FormData = z.infer<typeof schema>

interface EditProfileDialogProps {
	user: User
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: (user: User) => void
}

export function EditProfileDialog({
	user,
	open,
	onOpenChange,
	onSuccess,
}: EditProfileDialogProps) {
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		values: { name: user.name },
	})

	const onSubmit = async (data: FormData) => {
		try {
			const res = await userApi.update({
				pathParams: { id: user.id },
				body: data,
			})
			toast.success('Profile updated')
			onSuccess(res.data)
		} catch (err) {
			setServerErrors(err, setError)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit name</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<Field data-invalid={!!errors.name || undefined}>
						<FieldLabel htmlFor="name">Name</FieldLabel>
						<Input id="name" {...register('name')} />
						<FieldError errors={[errors.name]} />
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
