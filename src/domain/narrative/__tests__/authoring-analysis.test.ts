import {
	analyzeNarrativeAuthoring,
	analyzeUnknownNarrativeGuards
} from '../authoring-analysis';
import {createNarrativeProject} from '../project-factory';
import {analyzeStoryCoverage} from '../story-analysis';
import {ninetyThreeDaysTemplate} from '../templates/93-days';

function project() {
	const value = createNarrativeProject(
		'a48-authoring-analysis',
		'A48 authoring analysis',
		ninetyThreeDaysTemplate
	);
	value.characters = [
		{
			id: 'hero',
			name: 'Герой',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'hero-profile'
		},
		{
			id: 'friend',
			name: 'Друг',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'friend-profile'
		}
	];
	value.behaviorProfiles = [
		{id: 'hero-profile', characterId: 'hero', name: 'Герой'},
		{id: 'friend-profile', characterId: 'friend', name: 'Друг'}
	];
	value.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'school', name: 'Школа'}
	];
	value.storyNodes = [
		{
			id: 'meeting',
			kind: 'dialogue',
			title: 'Встреча',
			participantIds: ['hero'],
			placement: {day: 1, minuteOfDay: 600, locationId: 'home'},
			activationState: 'available'
		}
	];
	return value;
}

describe('A48 authoring diagnostics', () => {
	it('reports contradictory guards and Move characters missing from Story participants', () => {
		const value = project();
		value.claims = [
			{id: 'claim-a', text: 'Секрет', stance: 'unresolved', tags: []}
		];
		value.narrativeMoves = [
			{
				id: 'ask',
				storyNodeId: 'meeting',
				kind: 'ask',
				label: 'Спросить',
				actorCharacterId: 'hero',
				targetCharacterIds: ['friend'],
				guards: [
					{
						id: 'knows',
						condition: {
							type: 'character-knows-claim',
							characterId: 'hero',
							claimId: 'claim-a'
						}
					},
					{
						id: 'does-not-know',
						negated: true,
						condition: {
							type: 'character-knows-claim',
							characterId: 'hero',
							claimId: 'claim-a'
						}
					}
				],
				resolution: {type: 'automatic', outcomeId: 'continue'},
				outcomes: [
					{
						id: 'continue',
						key: 'continue',
						label: 'Дальше',
						effectStoryNodeIds: [],
						effects: []
					}
				]
			}
		];

		const findings = analyzeNarrativeAuthoring(value).findings;
		expect(findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'impossible-guard-set',
					moveId: 'ask'
				}),
				expect.objectContaining({
					kind: 'missing-story-participant',
					moveId: 'ask',
					characterId: 'friend'
				})
			])
		);
	});

	it('keeps unknown preview guards separate from authored project diagnostics', () => {
		const value = project();
		value.narrativeMoves = [
			{
				id: 'trust-check',
				storyNodeId: 'meeting',
				kind: 'persuade',
				label: 'Убедить',
				actorCharacterId: 'hero',
				targetCharacterIds: [],
				guards: [
					{
						id: 'trust-known',
						condition: {
							type: 'relationship-at-least',
							fromCharacterId: 'hero',
							toCharacterId: 'friend',
							axis: 'trust',
							value: 1
						}
					}
				],
				resolution: {type: 'automatic', outcomeId: 'continue'},
				outcomes: [
					{
						id: 'continue',
						key: 'continue',
						label: 'Дальше',
						effectStoryNodeIds: [],
						effects: []
					}
				]
			}
		];

		expect(analyzeNarrativeAuthoring(value).findings).not.toEqual(
			expect.arrayContaining([expect.objectContaining({kind: 'unknown-guard'})])
		);
		expect(analyzeUnknownNarrativeGuards(value)).toEqual([
			expect.objectContaining({
				kind: 'unknown-guard',
				moveId: 'trust-check',
				guardId: 'trust-known'
			})
		]);
	});

	it('reports partial placement and runtime policy without valid exact time', () => {
		const value = project();
		value.storyNodes[0] = {
			...value.storyNodes[0],
			placement: {day: 1, locationId: 'home'},
			runtimePolicy: {occurrenceMode: 'one-shot'}
		};

		expect(analyzeNarrativeAuthoring(value).findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({kind: 'partial-story-placement'}),
				expect.objectContaining({kind: 'runtime-policy-without-exact-placement'})
			])
		);
	});

	it('reports Story versus schedule conflicts and suspicious authored gaps', () => {
		const value = project();
		value.storyNodes[0] = {
			...value.storyNodes[0],
			participantIds: ['hero', 'friend']
		};
		value.routineRules = [
			{
				id: 'hero-school',
				characterId: 'hero',
				behaviorProfileId: 'hero-profile',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 660},
				targetLocationId: 'school'
			},
			{
				id: 'friend-later',
				characterId: 'friend',
				behaviorProfileId: 'friend-profile',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 700, endMinute: 800},
				targetLocationId: 'home'
			}
		];

		const findings = analyzeNarrativeAuthoring(value).findings;
		expect(findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'story-schedule-location-conflict',
					characterId: 'hero',
					centerAbsoluteMinute: 600
				}),
				expect.objectContaining({
					kind: 'story-participant-schedule-gap',
					characterId: 'friend',
					centerAbsoluteMinute: 600
				})
			])
		);
	});

	it('lets the highest-priority ScheduleException override an ordinary routine', () => {
		const value = project();
		value.routineRules = [
			{
				id: 'hero-school',
				characterId: 'hero',
				behaviorProfileId: 'hero-profile',
				activeRange: {fromDay: 1, toDay: 1},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 660},
				targetLocationId: 'school'
			}
		];
		value.scheduleExceptions = [
			{
				id: 'stay-home',
				characterId: 'hero',
				activeRange: {fromDay: 1, toDay: 1},
				timeWindow: {type: 'exact', startMinute: 590, endMinute: 610},
				targetLocationId: 'home',
				priority: 100
			}
		];

		expect(
			analyzeNarrativeAuthoring(value).findings.filter(
				finding => finding.kind === 'story-schedule-location-conflict'
			)
		).toEqual([]);
	});

	it('keeps skill-check failure outcomes in existing consequence coverage', () => {
		const value = project();
		value.narrativeMoves = [
			{
				id: 'skill-check',
				storyNodeId: 'meeting',
				kind: 'investigate',
				label: 'Проверка',
				targetCharacterIds: [],
				guards: [],
				resolution: {
					type: 'skill-check',
					check: {
						skillKey: 'attention',
						difficulty: 10,
						rollRule: {type: 'dice', diceCount: 1, dieSides: 20},
						modifiers: [],
						successOutcomeId: 'success',
						failureOutcomeId: 'failure'
					}
				},
				outcomes: [
					{
						id: 'success',
						key: 'success',
						label: 'Успех',
						effectStoryNodeIds: ['meeting'],
						effects: []
					},
					{
						id: 'failure',
						key: 'failure',
						label: 'Провал',
						effectStoryNodeIds: [],
						effects: []
					}
				]
			}
		];

		const result = analyzeStoryCoverage(
			value.storyNodes,
			value.storyConnections,
			value.narrativeMoves,
			value.template.dayCount
		);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'outcome-without-consequence',
					moveId: 'skill-check',
					outcomeId: 'failure'
				})
			])
		);
	});
});
