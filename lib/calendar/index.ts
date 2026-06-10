export type {
	ViewMode,
	CalendarBlock,
	ConfirmedBooking,
	CalendarStrategy,
} from './types'

export { CalendarProvider } from './CalendarContext'
export { CalendarCore } from './CalendarCore'

export {
	CalendarViewConfigProvider,
	useViewConfig,
} from './CalendarViewConfigContext'

export type { CalendarViewConfig } from './view-config'
export {
	ORG_PUBLIC_CONFIG,
	ORG_ADMIN_CONFIG,
	STAFF_PUBLIC_CONFIG,
	STAFF_SELF_CONFIG,
} from './view-config'

export { createClientStrategy } from './strategies/createClientStrategy'
export type { ClientStrategyParams } from './strategies/createClientStrategy'

export { createStaffStrategy } from './strategies/createStaffStrategy'
export type { StaffStrategyParams } from './strategies/createStaffStrategy'

export { createOrgStrategy } from './strategies/createOrgStrategy'
export type { OrgStrategyParams } from './strategies/createOrgStrategy'
