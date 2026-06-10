const SKELETON_ROW_COUNT = 3

const SkeletonRow = ({ id }: { id: number }) => (
	<div
		key={id}
		className="bg-card flex items-center gap-3 rounded-lg border-l-4 border-muted p-3 shadow-sm"
	>
		<div className="bg-muted h-9 w-9 animate-pulse rounded-lg" />
		<div className="flex-1 space-y-2">
			<div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
			<div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
		</div>
	</div>
)

const SKELETON_IDS = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i + 1)

const renderSkeletonRow = (id: number) => <SkeletonRow key={id} id={id} />

const ActivityFeedSkeleton = () => (
	<div className="flex flex-col gap-2 p-4">{SKELETON_IDS.map(renderSkeletonRow)}</div>
)

export { ActivityFeedSkeleton }
