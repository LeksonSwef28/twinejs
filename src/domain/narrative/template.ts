import {DayPeriodDefinition, PresenceTransitionPolicy, Weekday} from './schedule';

export interface NarrativeProjectTemplate {
	id: string;
	displayName: string;
	dayCount: number;
	day1Weekday: Weekday;
	periods: DayPeriodDefinition[];
	presenceTransition: PresenceTransitionPolicy;
	enabledModules: string[];
}
