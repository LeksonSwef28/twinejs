import {createNarrativeProject} from '../project-factory';
import {validateNarrativeProjectReferences} from '../project-reference-validation';
import {NarrativeProjectTemplate} from '../template';

const template: NarrativeProjectTemplate = {
	id: 'test-template',
	displayName: 'Test',
	dayCount: 93,
	day1Weekday: 'monday',
	periods: [{id: 'day', label: 'День', startMinute: 480, endMinute: 1200}],
	presenceTransition: {
		defaultTransitionWindowMinutes: 15,
		allowFinishCurrentInteraction: true,
		allowTravelWithPlayer: true
	},
	enabledModules: []
};

function project() {
	return createNarrativeProject('story-1', 'Reference validation', template);
}

describe('validateNarrativeProjectReferences', () => {
	it('returns no findings for an empty valid project', () => {
		expect(validateNarrativeProjectReferences(project()).findings).toEqual([]);
	});

	it('reports a missing Character default behavior profile', () => {
		const value = project();
		value.characters = [
			{
				id: 'character-1',
				name: 'Лена',
				cognitionTier: 'full',
				defaultBehaviorProfileId: 'missing-profile'
			}
		];

		expect(validateNarrativeProjectReferences(value).findings).toEqual([
			expect.objectContaining({
				ownerKind: 'character',
				ownerId: 'character-1',
				targetKind: 'behavior-profile',
				targetId: 'missing-profile'
			})
		]);
	});

	it('reports broken canonical references across authored project data', () => {
		const value = project();
		value.characters = [
			{
				id: 'character-1',
				name: 'Лена',
				cognitionTier: 'full',
				defaultBehaviorProfileId: 'profile-1'
			}
		];
		value.behaviorProfiles = [
			{id: 'profile-1', characterId: 'missing-character', name: 'Обычный день'}
		];
		value.locations = [{id: 'location-1', name: 'Дом'}];
		value.claims = [
			{
				id: 'claim-1',
				text: 'Старый дом закрыт',
				aboutFactId: 'missing-fact',
				stance: 'unresolved',
				tags: []
			}
		];
		value.initialKnowledge = [
			{
				id: 'knowledge-1',
				characterId: 'character-1',
				claimId: 'missing-claim',
				attitude: 'believes',
				confidence: 0.7,
				source: {type: 'authored'}
			}
		];
		value.itemInstances = [
			{
				id: 'item-1',
				definitionId: 'missing-definition',
				placement: {type: 'location', locationId: 'missing-location'}
			}
		];
		value.routineRules = [
			{
				id: 'routine-1',
				characterId: 'character-1',
				behaviorProfileId: 'missing-profile',
				activeRange: {fromDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'period', periodId: 'missing-period'},
				targetLocationId: 'missing-location'
			}
		];
		value.storyNodes = [
			{
				id: 'story-node-1',
				kind: 'beat',
				title: 'Возвращение',
				primaryCharacterId: 'missing-character',
				participantIds: ['character-1', 'missing-participant'],
				placement: {day: 1, minuteOfDay: 600, locationId: 'missing-location'},
				activationState: 'draft'
			}
		];

		const findings = validateNarrativeProjectReferences(value).findings;
		const targets = findings.map(finding => `${finding.targetKind}:${finding.targetId}`);

		expect(targets).toEqual(
			expect.arrayContaining([
				'character:missing-character',
				'objective-fact:missing-fact',
				'claim:missing-claim',
				'item-definition:missing-definition',
				'behavior-profile:missing-profile',
				'period:missing-period',
				'location:missing-location',
				'character:missing-participant'
			])
		);
		expect(findings.every(finding => finding.severity === 'warning')).toBe(true);
	});

	it('finds nested broken references inside Narrative Moves', () => {
		const value = project();
		value.storyNodes = [
			{
				id: 'story-node-1',
				kind: 'dialogue',
				title: 'Разговор',
				participantIds: [],
				activationState: 'draft'
			}
		];
		value.narrativeMoves = [
			{
				id: 'move-1',
				storyNodeId: 'story-node-1',
				kind: 'inform',
				label: 'Рассказать новость',
				actorCharacterId: 'missing-actor',
				targetCharacterIds: ['missing-target'],
				communicatedClaimId: 'missing-claim',
				guards: [
					{
						id: 'guard-1',
						condition: {
							type: 'character-has-item',
							characterId: 'missing-guard-character',
							itemInstanceId: 'missing-item'
						}
					}
				],
				resolution: {type: 'automatic', outcomeId: 'missing-outcome'},
				outcomes: [
					{
						id: 'outcome-1',
						key: 'continue',
						label: 'Продолжить',
						effectStoryNodeIds: ['missing-story-node'],
						effects: [
							{
								id: 'effect-1',
								type: 'story-node-set-state',
								storyNodeId: 'missing-effect-node',
								state: 'available'
							}
						]
					}
				]
			}
		];

		const findings = validateNarrativeProjectReferences(value).findings;
		const targets = findings.map(finding => `${finding.targetKind}:${finding.targetId}`);

		expect(targets).toEqual(
			expect.arrayContaining([
				'character:missing-actor',
				'character:missing-target',
				'claim:missing-claim',
				'character:missing-guard-character',
				'item-instance:missing-item',
				'outcome:missing-outcome',
				'story-node:missing-story-node',
				'story-node:missing-effect-node'
			])
		);
		expect(findings.filter(finding => finding.moveId === 'move-1').length).toBe(
			findings.length
		);
	});
});
