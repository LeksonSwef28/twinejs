import {EntityId} from './entities';

export interface NarrativePlayerStartDefinition {
	characterId: EntityId;
	locationId: EntityId;
	/**
	 * Explicit additional live placements applied only after player-session
	 * materialization. This is authored world-start data, never schedule output.
	 */
	initialActualPresenceByCharacter?: Record<EntityId, EntityId>;
}

function presenceRecordIsValid(value: unknown): value is Record<EntityId, EntityId> {
	return (
		Boolean(value) &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		Object.entries(value as Record<string, unknown>).every(
			([characterId, locationId]) =>
				Boolean(characterId) &&
				typeof locationId === 'string' &&
				Boolean(locationId)
		)
	);
}

export function narrativePlayerStartIsStructurallyValid(
	value: unknown
): value is NarrativePlayerStartDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const start = value as Partial<NarrativePlayerStartDefinition>;
	if (
		typeof start.characterId !== 'string' ||
		!start.characterId ||
		typeof start.locationId !== 'string' ||
		!start.locationId
	) {
		return false;
	}
	if (
		start.initialActualPresenceByCharacter !== undefined &&
		!presenceRecordIsValid(start.initialActualPresenceByCharacter)
	) {
		return false;
	}
	const duplicate =
		start.initialActualPresenceByCharacter?.[start.characterId];
	return duplicate === undefined || duplicate === start.locationId;
}
