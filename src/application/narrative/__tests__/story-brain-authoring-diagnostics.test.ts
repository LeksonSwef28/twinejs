import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {storyBrainNavigationForFinding} from '../story-brain-diagnostic-navigation';
import {
	queryStoryBrain,
	queryStoryBrainProjectDiagnostics
} from '../story-brain-query';

function project() {
	const value = createNarrativeProject('a48-story-brain', 'A48 Story Brain', ninetyThreeDaysTemplate);
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
	value.storyNodes = [
		{
			id: 'meeting',
			kind: 'dialogue',
			title: 'Встреча',
			participantIds: ['hero', 'friend'],
			placement: {day: 2, minuteOfDay: 600, locationId: 'home'},
			activationState: 'available'
		}
	];
	value.locations = [{id: 'home', name: 'Дом'}];
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
					id: 'unknown-trust',
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
	return value;
}

describe('Story Brain A48 closure diagnostics', () => {
	it('keeps preview-dependent unknown guards local to Focus', () => {
		const value = project();
		const global = queryStoryBrainProjectDiagnostics(value);
		const focused = queryStoryBrain(value, {kind: 'move', id: 'ask'});

		expect(global.findings.some(finding => finding.kind === 'unknown-guard')).toBe(false);
		expect(focused.coverage.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'unknown-guard',
					moveId: 'ask',
					guardId: 'unknown-trust'
				})
			])
		);
	});

	it('routes Story versus schedule consistency findings to WORLD/TIME', () => {
		const value = project();
		value.behaviorProfiles = [
			{id: 'hero-profile', characterId: 'hero', name: 'Герой'},
			{id: 'friend-profile', characterId: 'friend', name: 'Друг'}
		];
		value.locations.push({id: 'school', name: 'Школа'});
		value.routineRules = [
			{
				id: 'hero-school',
				characterId: 'hero',
				behaviorProfileId: 'hero-profile',
				activeRange: {fromDay: 2, toDay: 2},
				recurrence: {type: 'everyDay'},
				timeWindow: {type: 'exact', startMinute: 540, endMinute: 660},
				targetLocationId: 'school'
			}
		];
		const diagnostics = queryStoryBrainProjectDiagnostics(value);
		const finding = diagnostics.findings.find(
			candidate =>
				candidate.kind === 'story-schedule-location-conflict' &&
				candidate.characterId === 'hero'
		);

		expect(finding).toBeDefined();
		expect(finding && storyBrainNavigationForFinding(value, finding)).toEqual({
			focus: {kind: 'story-node', id: 'meeting'},
			workspace: 'world-time',
			worldTimeCenterAbsoluteMinute: 2040
		});
	});
});
