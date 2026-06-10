interface CheckInViewer {
	isCheckedIn: boolean
	expiresAt: string | null
}

interface CheckInResponse {
	playgroundId: string
	activeCount: number
	viewer: CheckInViewer
}

export type { CheckInViewer, CheckInResponse }
