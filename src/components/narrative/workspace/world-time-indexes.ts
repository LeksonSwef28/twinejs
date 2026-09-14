import {NarrativeCharacter} from '../../../domain/narrative/entities';
import {RoutineRule} from '../../../domain/narrative/schedule';
import {StoryNodeDefinition} from '../../../domain/narrative/story';

export interface WorldTimeLocationIndexes {
	routineRulesByLocation: Map<string, RoutineRule[]>;
	actualCharactersByLocation: Map<string, NarrativeCharacter[]>;
	storyNodesByLocation: Map<string, StoryNodeDefinition[]>;
}

function appendToIndex<T>(index: Map<string, T[]>, key: string, value: T) {
	const existing = index.get(key);
	if (existing) {
		existing.push(value);
	} else {
		index.set(key, [value]);
	}
}

/**
 * Builds the location-oriented projections needed by the WORLD/TIME rows in
 * one pass per collection. Rendering can then use O(1) lookups instead of
 * re-scanning every routine, character and visible Story node for each row.
 */
export function buildWorldTimeLocationIndexes(
	routineRules: RoutineRule[],
	characters: NarrativeCharacter[],
	actualLocationByCharacter: Record<string, string>,
	visibleStoryNodes: StoryNodeDefinition[]
): WorldTimeLocationIndexes {
	const routineRulesByLocation = new Map<string, RoutineRule[]>();
	const actualCharactersByLocation = new Map<string, NarrativeCharacter[]>();
	const storyNodesByLocation = new Map<string, StoryNodeDefinition[]>();

	for (const rule of routineRules) {
		if (!rule.absent && rule.targetLocationId) {
			appendToIndex(routineRulesByLocation, rule.targetLocationId, rule);
		}
	}
	for (const character of characters) {
		const locationId = actualLocationByCharacter[character.id];
		if (locationId) {
			appendToIndex(actualCharactersByLocation, locationId, character);
		}
	}
	for (const node of visibleStoryNodes) {
		const locationId = node.placement?.locationId;
		if (locationId) {
			appendToIndex(storyNodesByLocation, locationId, node);
		}
	}

	return {
		routineRulesByLocation,
		actualCharactersByLocation,
		storyNodesByLocation
	};
}
