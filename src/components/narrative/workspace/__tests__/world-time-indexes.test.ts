import {NarrativeCharacter} from '../../../../domain/narrative/entities';
import {RoutineRule} from '../../../../domain/narrative/schedule';
import {StoryNodeDefinition} from '../../../../domain/narrative/story';
import {buildWorldTimeLocationIndexes} from '../world-time-indexes';

function character(id: string, name: string) {
	return {id, name} as NarrativeCharacter;
}

function routine(
	id: string,
	locationId: string | undefined,
	absent = false
) {
	return {
		id,
		targetLocationId: locationId,
		absent
	} as RoutineRule;
}

function storyNode(id: string, locationId?: string) {
	return {
		id,
		placement: locationId ? {locationId} : undefined
	} as StoryNodeDefinition;
}

describe('buildWorldTimeLocationIndexes', () => {
	test('indexes routines, actual presence and visible Story nodes by location', () => {
		const katya = character('katya', 'Катя');
		const sasha = character('sasha', 'Саша');
		const cafeRule = routine('cafe-rule', 'cafe');
		const homeRule = routine('home-rule', 'home');
		const cafeStory = storyNode('cafe-story', 'cafe');
		const floatingStory = storyNode('floating-story');

		const indexes = buildWorldTimeLocationIndexes(
			[cafeRule, homeRule],
			[katya, sasha],
			{katya: 'cafe', sasha: 'home'},
			[cafeStory, floatingStory]
		);

		expect(indexes.routineRulesByLocation.get('cafe')).toEqual([cafeRule]);
		expect(indexes.routineRulesByLocation.get('home')).toEqual([homeRule]);
		expect(indexes.actualCharactersByLocation.get('cafe')).toEqual([katya]);
		expect(indexes.actualCharactersByLocation.get('home')).toEqual([sasha]);
		expect(indexes.storyNodesByLocation.get('cafe')).toEqual([cafeStory]);
		expect(indexes.storyNodesByLocation.has('home')).toBe(false);
	});

	test('does not index absent routines or locationless authored data', () => {
		const indexes = buildWorldTimeLocationIndexes(
			[
				routine('absent', 'cafe', true),
				routine('locationless', undefined)
			],
			[character('unknown', 'Без позиции')],
			{},
			[storyNode('floating')]
		);

		expect(indexes.routineRulesByLocation.size).toBe(0);
		expect(indexes.actualCharactersByLocation.size).toBe(0);
		expect(indexes.storyNodesByLocation.size).toBe(0);
	});
});
