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

export interface RoutineRule {
	id: EntityId;
	characterId: EntityId;
	behaviorProfileId: EntityId;
	activeRange: DayRange;
	recurrence: RecurrencePattern;
	periodId: string;
	targetLocationId?: EntityId;
	absent?: boolean;
}

export interface ScheduleException {
	id: EntityId;
	characterId: EntityId;
	activeRange: DayRange;
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
