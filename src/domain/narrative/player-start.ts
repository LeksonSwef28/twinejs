import {EntityId} from './entities';

export interface NarrativePlayerStartDefinition {
	characterId: EntityId;
	locationId: EntityId;
}

export function narrativePlayerStartIsStructurallyValid(
	value: unknown
): value is NarrativePlayerStartDefinition {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const start = value as Partial<NarrativePlayerStartDefinition>;
	return (
		typeof start.characterId === 'string' &&
		Boolean(start.characterId) &&
		typeof start.locationId === 'string' &&
		Boolean(start.locationId)
	);
}
