import {EntityId} from './entities';
import {PhysicalActionKind} from './injury';

export type NarrativeTravelMode =
	| 'walk'
	| 'city-bus'
	| 'route-taxi'
	| 'taxi'
	| 'custom';

export interface NarrativeTravelRouteDefinition {
	id: EntityId;
	label: string;
	originLocationId: EntityId;
	destinationLocationId: EntityId;
	durationMinutes: number;
	mode: NarrativeTravelMode;
	/**
	 * Optional existing physical action gate. Transit normally omits this;
	 * walking routes can reuse body/injury/carrying eligibility.
	 */
	physicalAction?: PhysicalActionKind;
}

const travelModes = new Set<NarrativeTravelMode>([
	'walk',
	'city-bus',
	'route-taxi',
	'taxi',
	'custom'
]);

const physicalActions = new Set<PhysicalActionKind>([
	'normal',
	'walk',
	'run',
	'fast-run',
	'climb',
	'carry-heavy',
	'use-tool',
	'focus',
	'sleep'
]);

export function narrativeTravelRouteIsStructurallyValid(
	value: unknown
): value is NarrativeTravelRouteDefinition {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const route = value as Partial<NarrativeTravelRouteDefinition>;
	return (
		typeof route.id === 'string' &&
		Boolean(route.id) &&
		typeof route.label === 'string' &&
		Boolean(route.label.trim()) &&
		typeof route.originLocationId === 'string' &&
		Boolean(route.originLocationId) &&
		typeof route.destinationLocationId === 'string' &&
		Boolean(route.destinationLocationId) &&
		route.originLocationId !== route.destinationLocationId &&
		Number.isInteger(route.durationMinutes) &&
		(route.durationMinutes ?? 0) > 0 &&
		typeof route.mode === 'string' &&
		travelModes.has(route.mode as NarrativeTravelMode) &&
		(route.physicalAction === undefined ||
			(typeof route.physicalAction === 'string' &&
				physicalActions.has(route.physicalAction as PhysicalActionKind)))
	);
}
