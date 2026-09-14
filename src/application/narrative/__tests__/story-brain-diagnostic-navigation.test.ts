import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {StoryBrainFinding} from '../story-brain-query';
import {storyBrainNavigationForFinding} from '../story-brain-diagnostic-navigation';

function projectForNavigation() {
	const project = createNarrativeProject('diagnostic-nav', 'Diagnostic Nav', ninetyThreeDaysTemplate);
	return {
		...project,
		characters: [
			{
				id: 'hero',
				name: 'Герой',
				cognitionTier: 'full' as const,
				defaultBehaviorProfileId: 'hero-profile'
			}
		],
		claims: [{id: 'claim-a', text: 'Слух', stance: 'unresolved' as const, tags: []}],
		storyNodes: [
			{
				id: 'story-a',
				kind: 'beat' as const,
				title: 'Начало',
				participantIds: ['hero'],
				activationState: 'available' as const
			}
		],
		narrativeMoves: [
			{
				id: 'move-a',
				storyNodeId: 'story-a',
				kind: 'ask' as const,
				label: 'Спросить',
				actorCharacterId: 'hero',
				targetCharacterIds: [],
				guards: [],
				resolution: {type: 'automatic' as const, outcomeId: 'continue'},
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
		]
	};
}

describe('storyBrainNavigationForFinding', () => {
	it('navigates Move coverage findings to the Move and owning Story canvas node', () => {
		const finding: StoryBrainFinding = {
			id: 'coverage:move-a',
			kind: 'outcome-without-consequence',
			severity: 'warning',
			summary: 'Нет последствия',
			storyNodeId: 'story-a',
			moveId: 'move-a',
			outcomeId: 'continue'
		};

		expect(storyBrainNavigationForFinding(projectForNavigation(), finding)).toEqual({
			focus: {kind: 'move', id: 'move-a'},
			canvasEntityRef: {type: 'storyNode', id: 'story-a'}
		});
	});

	it('navigates a broken Claim reference to the existing Claim owner', () => {
		const finding: StoryBrainFinding = {
			id: 'reference:claim:claim-a:objective-fact:missing',
			kind: 'broken-authored-reference',
			severity: 'warning',
			summary: 'Claim ссылается на отсутствующий факт',
			ownerKind: 'claim',
			ownerId: 'claim-a',
			targetKind: 'objective-fact',
			targetId: 'missing'
		};

		expect(storyBrainNavigationForFinding(projectForNavigation(), finding)).toEqual({
			focus: {kind: 'claim', id: 'claim-a'},
			canvasEntityRef: undefined
		});
	});

	it('does not invent a source target for unsupported owner kinds', () => {
		const finding: StoryBrainFinding = {
			id: 'reference:routine-rule:routine-a:location:missing',
			kind: 'broken-authored-reference',
			severity: 'warning',
			summary: 'Routine ссылается на отсутствующую локацию',
			ownerKind: 'routine-rule',
			ownerId: 'routine-a',
			targetKind: 'location',
			targetId: 'missing'
		};

		expect(storyBrainNavigationForFinding(projectForNavigation(), finding)).toBeUndefined();
	});
});
