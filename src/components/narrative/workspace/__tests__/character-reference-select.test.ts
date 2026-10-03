import {characterReferenceValueToDefinition} from '../character-reference-select';

describe('characterReferenceValueToDefinition', () => {
	const move = {
		actorCharacterId: 'speaker',
		targetCharacterIds: ['listener', 'witness']
	};

	it('creates a fixed canonical Character reference', () => {
		expect(characterReferenceValueToDefinition('character:friend', move)).toEqual({
			type: 'character',
			characterId: 'friend'
		});
	});

	it('creates Move-relative actor and target references', () => {
		expect(characterReferenceValueToDefinition('move-actor', move)).toEqual({
			type: 'move-actor'
		});
		expect(characterReferenceValueToDefinition('move-target:1', move)).toEqual({
			type: 'move-target',
			targetIndex: 1
		});
	});

	it('rejects unresolved Move-relative references', () => {
		expect(
			characterReferenceValueToDefinition('move-actor', {
				targetCharacterIds: ['listener']
			})
		).toBeUndefined();
		expect(characterReferenceValueToDefinition('move-target:4', move)).toBeUndefined();
		expect(characterReferenceValueToDefinition('move-target:not-a-number', move)).toBeUndefined();
	});
});
