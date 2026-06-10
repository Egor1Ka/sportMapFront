import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './api-error'

function setServerErrors<T extends FieldValues>(
	error: unknown,
	setError: UseFormSetError<T>,
): boolean {
	if (!(error instanceof ApiError)) return false

	const fieldErrors = error.fieldErrors
	if (!fieldErrors) return false

	for (const [field, message] of Object.entries(fieldErrors)) {
		setError(field as Path<T>, { message })
	}

	return true
}

export { setServerErrors }
