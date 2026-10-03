import {EntityId} from './entities';

export interface NarrativeSleepOptionDefinition {
	id: EntityId;
	label: string;
	locationId: EntityId;
	/** Earliest minute-of-day at which this overnight choice can start. */
	earliestStartMinuteOfDay: number;
	/** Exact local minute on the following day when sleep ends. */
	wakeMinuteOfDay: number;
}

function minuteOfDayIsValid(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 0 &&
		value < 24 * 60
	);
}

export function narrativeSleepOptionIsStructurallyValid(
	value: unknown
): value is NarrativeSleepOptionDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const option = value as Partial<NarrativeSleepOptionDefinition>;
	return (
		typeof option.id === 'string' &&
		Boolean(option.id) &&
		typeof option.label === 'string' &&
		Boolean(option.label.trim()) &&
		typeof option.locationId === 'string' &&
		Boolean(option.locationId) &&
		minuteOfDayIsValid(option.earliestStartMinuteOfDay) &&
		minuteOfDayIsValid(option.wakeMinuteOfDay)
	);
}
