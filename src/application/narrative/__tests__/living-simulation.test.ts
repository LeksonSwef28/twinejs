import {createHeavyMealBodyEffect} from '../../../domain/narrative/body';
import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {ItemDefinition, ItemInstance} from '../../../domain/narrative/items';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ReactionCandidateSetDefinition} from '../../../domain/narrative/reaction';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	applyNarrativeItemRuntimePlacement,
	evaluateNarrativePhysicalAction
} from '../physical';
import {
	advanceNarrativeProjectSimulation,
	applyNarrativeProjectBodyEffect,
	applyNarrativeProjectInjuryEffect
} from '../simulation';
import {
	evaluateNarrativeProjectReactionSet,
	resolveAndApplyNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from '../living-simulation';
import {
	restoreNarrativeRuntimeSnapshotJson,
	serializeNarrativeRuntimeSnapshot
} from '../../../store/narrative-project/runtime-snapshot';

function authoredVerticalSliceProject() {
	const project = createNarrativeProject(
		'a40-one-day-story',
		'A40 one-day slice',
		ninetyThreeDaysTemplate
	);
	const start = project.simulation.minuteOfDay;
	project.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'station', name: 'Станция'}
	];
	project.characters = [
		{
			id: 'player',
			name: 'Неизвестный',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		},
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-default'
		}
	];
	project.storyNodes = [
		{
			id: 'station-meeting',
			kind: 'event',
			title: 'Встреча на станции',
			participantIds: ['player', 'katya'],
			placement: {day: 1, minuteOfDay: start + 15, locationId: 'station'},
			activationState: 'available'
		}
	];
	project.claims = [
		{
			id: 'claim-summer-promise',
			text: 'Мы ещё встретимся до конца лета.',
			stance: 'unresolved',
			tags: ['promise', 'summer']
		}
	];
	const definitions: ItemDefinition[] = [
		{
			id: 'portfolio',
			name: 'Портфель',
			tags: ['bag'],
			carry: {weightKg: 1, volumeUnits: 5, sizeClass: 'medium'},
			container: {
				capacityVolumeUnits: 8,
				maxContentsWeightKg: 5,
				maxItemSize: 'medium',
				carryStyle: 'hand',
				handsRequired: 1,
				climbEffortMultiplier: 1.15
			}
		},
		{
			id: 'thermos',
			name: 'Термос',
			tags: ['drink'],
			carry: {
				weightKg: 0.8,
				volumeUnits: 3,
				sizeClass: 'medium',
				handsRequiredWhenLoose: 1
			}
		}
	];
	const instances: ItemInstance[] = [
		{
			id: 'portfolio-1',
			definitionId: 'portfolio',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'thermos-1',
			definitionId: 'thermos',
			placement: {type: 'location', locationId: 'home'}
		}
	];
	project.itemDefinitions = definitions;
	project.itemInstances = instances;
	const tellPromise: NarrativeMoveDefinition = {
		id: 'tell-promise',
		storyNodeId: 'station-meeting',
		kind: 'inform',
		label: 'Пообещать встретиться снова и отдать термос',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		communicatedClaimId: 'claim-summer-promise',
		communicationIntent: 'honest',
		guards: [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			},
			{
				id: 'has-thermos',
				condition: {
					type: 'character-has-item',
					characterId: 'player',
					itemInstanceId: 'thermos-1'
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'promise-accepted'},
		outcomes: [
			{
				id: 'promise-accepted',
				key: 'continue',
				label: 'Катя принимает обещание',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'learn-promise',
						type: 'character-learns-claim',
						recipient: {type: 'move-target', targetIndex: 0},
						claim: {type: 'communicated-claim'},
						attitude: 'believes',
						confidence: 0.85,
						source: {type: 'move-actor'}
					},
					{
						id: 'trust-promise',
						type: 'relationship-adjust',
						from: {type: 'move-target', targetIndex: 0},
						to: {type: 'move-actor'},
						axis: 'trust',
						delta: 2
					},
					{
						id: 'mood-promise',
						type: 'character-mood-set',
						character: {type: 'move-target', targetIndex: 0},
						mood: 'thoughtful'
					},
					{
						id: 'remember-promise',
						type: 'character-remembers',
						character: {type: 'move-target', targetIndex: 0},
						summary: 'Он пообещал, что они ещё встретятся этим летом.',
						importance: 0.95,
						baseStrength: 0.9,
						tags: ['promise', 'summer'],
						source: {type: 'current-move'}
					},
					{
						id: 'give-thermos',
						type: 'item-set-placement',
						itemInstanceId: 'thermos-1',
						placement: {
							type: 'character',
							character: {type: 'move-target', targetIndex: 0}
						}
					}
				]
			}
		]
	};
	project.narrativeMoves = [tellPromise];
	const reactions: ReactionCandidateSetDefinition = {
		id: 'katya-after-promise',
		storyNodeId: 'station-meeting',
		reactingCharacterId: 'katya',
		counterpartCharacterId: 'player',
		candidates: [
			{
				id: 'warm-reply',
				moveId: 'katya-warm-reply',
				valence: 'positive',
				baseScore: 1,
				guards: [],
				considerations: [
					{
						id: 'remembered-promise',
						type: 'memory-tag',
						tag: 'promise',
						minimumSalience: 0.5,
						weight: 3
					},
					{
						id: 'trusts-player',
						type: 'relationship-at-least',
						axis: 'trust',
						value: 1,
						weight: 1
					},
					{
						id: 'thoughtful-mood',
						type: 'mood-is',
						mood: 'thoughtful',
						weight: 0.5
					}
				]
			}
		]
	};
	project.reactionCandidateSets = [reactions];
	return project;
}

describe('A40 Living Simulation vertical slice', () => {
	test('runs one deterministic in-game day across Story, cognition, body, injury, inventory and resume', () => {
		let project = authoredVerticalSliceProject();
		const startMinute = project.simulation.minuteOfDay;
		const authoredStoryBefore = JSON.stringify(project.storyNodes);
		const authoredItemsBefore = JSON.stringify(project.itemInstances);
		const editorBefore = JSON.stringify(project.editor);
		const cleanRuntimeTarget = project;

		project = setNarrativeCharacterActualLocation(project, 'player', 'home');
		project = setNarrativeCharacterActualLocation(project, 'katya', 'station');
		const packed = applyNarrativeItemRuntimePlacement(project, 'thermos-1', {
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});
		expect(packed.applied).toBe(true);
		project = packed.project;

		const scheduled = advanceNarrativeProjectSimulation(project, 15);
		project = scheduled.project;
		expect(scheduled.dueWork.map(work => work.id)).toContain(
			'story-node:station-meeting'
		);
		expect(project.simulation.actualLocationByCharacter.player).toBe('home');
		expect(project.simulation.actualLocationByCharacter.katya).toBe('station');

		project = setNarrativeCharacterActualLocation(project, 'player', 'station');
		const move = resolveAndApplyNarrativeProjectMove(project, 'tell-promise');
		expect(move.resolution.status).toBe('resolved');
		expect(move.resolution.outcomeId).toBe('promise-accepted');
		expect(move.outcomeTrace?.effectTraces).toHaveLength(5);
		project = move.project;

		expect(project.simulation.characterKnowledge[0]).toMatchObject({
			characterId: 'katya',
			claimId: 'claim-summer-promise',
			attitude: 'believes',
			confidence: 0.85
		});
		expect(project.relationships[0]).toMatchObject({
			fromCharacterId: 'katya',
			toCharacterId: 'player',
			values: {trust: 2}
		});
		expect(project.mindStates[0]).toMatchObject({
			characterId: 'katya',
			mood: 'thoughtful'
		});
		expect(project.memories[0].tags).toContain('promise');
		expect(project.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'character',
			characterId: 'katya'
		});
		expect(JSON.stringify(project.itemInstances)).toBe(authoredItemsBefore);

		project = applyNarrativeProjectBodyEffect(
			project,
			createHeavyMealBodyEffect('heavy-lunch', 'player')
		).project;
		project = applyNarrativeProjectInjuryEffect(project, {
			id: 'sprain-player',
			type: 'add',
			injury: {
				id: 'player-ankle',
				characterId: 'player',
				kind: 'ankle-sprain',
				region: 'ankle',
				pain: 'painful',
				recoveryRemainingMinutes: 3000,
				treatment: 'self-care'
			}
		}).project;
		const fastRunNow = evaluateNarrativePhysicalAction(project, 'player', 'fast-run');
		expect(fastRunNow.allowed).toBe(false);
		expect(fastRunNow.blockers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({source: 'body', code: 'digesting-heavy-meal'}),
				expect.objectContaining({source: 'injury', code: 'injury-blocks-action'})
			])
		);

		const afterDigestion = advanceNarrativeProjectSimulation(project, 30);
		project = afterDigestion.project;
		expect(
			project.simulation.bodyByCharacter.player.digestionRemainingMinutes
		).toBe(0);
		const fastRunAfterDigestion = evaluateNarrativePhysicalAction(
			project,
			'player',
			'fast-run'
		);
		expect(fastRunAfterDigestion.blockers.some(reason => reason.source === 'body')).toBe(
			false
		);
		expect(
			fastRunAfterDigestion.blockers.some(reason => reason.source === 'injury')
		).toBe(true);

		const snapshot = serializeNarrativeRuntimeSnapshot(project);
		const restored = restoreNarrativeRuntimeSnapshotJson(cleanRuntimeTarget, snapshot);
		expect(restored.status).toBe('restored');
		expect(restored.project.memories).toEqual(project.memories);
		expect(restored.project.relationships).toEqual(project.relationships);
		expect(restored.project.injuriesByCharacter).toEqual(project.injuriesByCharacter);
		expect(restored.project.itemPlacementOverrides).toEqual(
			project.itemPlacementOverrides
		);
		expect(restored.project.simulation.actualLocationByCharacter).toEqual(
			project.simulation.actualLocationByCharacter
		);
		project = restored.project;

		const elapsed = 15 + 30;
		const endOfDay = advanceNarrativeProjectSimulation(
			project,
			24 * 60 - elapsed
		);
		project = endOfDay.project;
		expect(project.simulation.day).toBe(2);
		expect(project.simulation.minuteOfDay).toBe(startMinute);
		expect(project.simulation.bodyByCharacter.player.fatigue).toBe(1);
		expect(project.simulation.bodyByCharacter.player.sleepDebtMinutes).toBeGreaterThan(0);
		expect(
			project.injuriesByCharacter.player[0].recoveryRemainingMinutes
		).toBeLessThan(3000);

		const reaction = evaluateNarrativeProjectReactionSet(
			project,
			'katya-after-promise'
		);
		const warmReply = reaction.candidates[0];
		expect(warmReply.availability).toBe('available');
		expect(warmReply.score).toBe(5.5);
		const memoryTrace = warmReply.considerationTraces.find(
			trace => trace.considerationId === 'remembered-promise'
		);
		expect(memoryTrace).toMatchObject({
			status: 'met',
			minimumSalience: 0.5,
			strongestMemoryId: 'remember-promise:katya'
		});
		expect(memoryTrace?.strongestMemorySalience).toBeGreaterThanOrEqual(0.5);

		expect(JSON.stringify(project.storyNodes)).toBe(authoredStoryBefore);
		expect(JSON.stringify(project.itemInstances)).toBe(authoredItemsBefore);
		expect(JSON.stringify(project.editor)).toBe(editorBefore);
	});

	test('does not hide resolution uncertainty or mutate authored Story-state effects', () => {
		const project = authoredVerticalSliceProject();
		project.narrativeMoves[0] = {
			...project.narrativeMoves[0],
			resolution: {
				type: 'skill-check',
				check: {
					skillKey: 'empathy',
					difficulty: 8,
					rollRule: {type: 'dice', diceCount: 1, dieSides: 6},
					modifiers: [],
					successOutcomeId: 'promise-accepted',
					failureOutcomeId: 'promise-accepted'
				}
			}
		};

		const result = resolveAndApplyNarrativeProjectMove(project, 'tell-promise');
		expect(result.resolution.status).toBe('blocked');
		expect(result.project).toBe(project);
	});
});
