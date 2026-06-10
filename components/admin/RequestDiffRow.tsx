import { ArrowRight } from 'lucide-react'

type Props = {
	label: string
	before: string
	after: string
}

function RequestDiffRow({ label, before, after }: Props) {
	return (
		<div
			data-slot="request-diff-row"
			className="grid grid-cols-[7rem_1fr_auto_1fr] items-start gap-2 py-1 text-sm"
		>
			<span className="text-muted-foreground pt-0.5">{label}</span>
			<span className="text-muted-foreground line-through decoration-rose-500/60 break-words">
				{before}
			</span>
			<ArrowRight className="text-muted-foreground mt-1 size-3.5 shrink-0" />
			<span className="text-foreground break-words font-medium">{after}</span>
		</div>
	)
}

export { RequestDiffRow }
