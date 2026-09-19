import {EntityId} from './entities';

export type Weekday =
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'
	| 'sunday';

export interface DayPeriodDefinition {
	id: string;
	label: string;
	startMinute: number;
	endMinute: number;
}

export type RecurrencePattern =
	| {type: 'everyDay'}
	| {type: 'weekly'; weekdays: Weekday[]}
	| {type: 'everyNDays'; every: number; anchorDay: number}
	| {type: 'explicitDays'; days: number[]};

export interface DayRange {
	fromDay: number;
	toDay?: number;
}

export interface BehaviorProfile {
	id: EntityId;
	characterId: EntityId;
	name: string;
}

/**
 * New authored schedules should use timeWindow. `periodId` remains temporarily for
 * schema-v1 data created by the first prototype.
 *
 * `endDayOffset` makes cross-midnight authored windows explicit. Older schema-v1
 * exact windows may omit it and are interpreted as ending on the same day.
 */
export type RoutineTimeWindow =
	| {type: 'period'; periodId: string}
	| {
			type: 'exact';
			startMinute: number;
			endMinute: number;
			endDayOffset?: 0 | 1;
		};

export interface RoutineRule {
	id: EntityId;
	characterId: EntityId;
	behaviorProfileId: EntityId;
	activeRange: DayRange;
	recurrence: RecurrencePattern;
	timeWindow?: RoutineTimeWindow;
	/** Legacy schema-v1 period selector. */
	periodId?: string;
	targetLocationId?: EntityId;
	absent?: boolean;
}

export interface ScheduleException {
	id: EntityId;
	characterId: EntityId;
	activeRange: DayRange;
	timeWindow?: RoutineTimeWindow;
	/** Legacy schema-v1 period selector. */
	periodId?: string;
	targetLocationId?: EntityId;
	absent?: boolean;
	priority: number;
	reason?: string;
}

export type PresenceTransitionKind =
	| 'stay'
	| 'prepareToLeave'
	| 'leave'
	| 'arrive'
	| 'arriveDelayed'
	| 'stayTemporarily'
	| 'travelWithPlayer';

export interface PresenceTransitionPolicy {
	defaultTransitionWindowMinutes: number;
	allowFinishCurrentInteraction: boolean;
	allowTravelWithPlayer: boolean;
}
