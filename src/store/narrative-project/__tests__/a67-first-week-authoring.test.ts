import {compileNarrativeRuntimeArtifact} from '../../../application/narrative/export-compiler';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {
	create93DaysFirstWeekProject,
	firstWeekIds
} from '../../../domain/narrative/content/93-days-first-week';
import {editorAuthoringReducer} from '../editor-authoring';
import {NarrativeProjectHistoryState} from '../reducer';

function execute(
	state: NarrativeProjectHistoryState,
	command: Parameters<typeof editorAuthoringReducer>[1] & {type: 'execute'}
) {
	return editorAuthoringReducer(state, command);
}

describe('A67 first-week canonical authoring pass', () => {
	test('authors an ordinary first-week follow-up without direct fixture surgery', () => {
		const initial = create93DaysFirstWeekProject();
		let state: NarrativeProjectHistoryState = {
			past: [],
			present: initial,
			future: []
		};

		state = execute(state, {
			type: 'execute',
			command: {
				type: 'claim/update',
				id: firstWeekIds.claims.cinemaInvitation,
				text: 'Студентка с фотоаппаратом уточнила, что завтра вечером у старого кинотеатра снова будут обсуждать судьбу здания.',
				stance: 'supports',
				tags: ['day-five', 'old-city', 'cinema', 'invitation']
			}
		});

		const existingRoutine = state.present.routineRules.find(
			rule => rule.id === firstWeekIds.routines.cameraStudentMarket
		);
		if (!existingRoutine) {
			throw new Error('Expected A67 camera-student market routine.');
		}
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'routine/update',
				rule: {
					...existingRoutine,
					timeWindow: {
						type: 'exact',
						startMinute: 16 * 60 + 15,
						endMinute: 20 * 60
					}
				}
			}
		});

		const dayFiveNode = state.present.storyNodes.find(
			node => node.id === firstWeekIds.story.dayFiveMarketIntroduction
		);
		if (!dayFiveNode) {
			throw new Error('Expected A67 Day Five market Story node.');
		}
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'story/updateAuthoring',
				id: dayFiveNode.id,
				kind: dayFiveNode.kind,
				activationState: dayFiveNode.activationState,
				title: 'Пятый день: знакомство на старом рынке',
				description:
					'Игрок встречает новый городской узел и получает необязательный вход в линию Старого города.',
				primaryCharacterId: dayFiveNode.primaryCharacterId,
				participantIds: [...dayFiveNode.participantIds],
				runtimePolicy: dayFiveNode.runtimePolicy
			}
		});

		const followupStoryId = 'a67-authoring-proof-day7-followup';
		const followupClaimId = 'a67-authoring-proof-claim';
		const followupMoveId = 'a67-authoring-proof-move';

		state = execute(state, {
			type: 'execute',
			command: {
				type: 'claim/add',
				id: followupClaimId,
				text: 'На старом рынке уже обсуждают, что разговор у кинотеатра продолжится позже.',
				stance: 'supports'
			}
		});
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'story/addDraftNode',
				id: followupStoryId,
				canvasNodeId: 'canvas-' + followupStoryId,
				kind: 'dialogue',
				title: 'Новый follow-up',
				position: {x: 1200, y: 760}
			}
		});
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'story/setPlacement',
				id: followupStoryId,
				placement: {
					day: 7,
					minuteOfDay: 17 * 60,
					locationId: firstWeekIds.locations.oldMarket
				}
			}
		});
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'story/updateAuthoring',
				id: followupStoryId,
				kind: 'dialogue',
				activationState: 'available',
				title: 'Седьмой день: ещё один разговор на рынке',
				description:
					'Небольшой авторский follow-up, созданный только каноническими authoring-командами.',
				primaryCharacterId: firstWeekIds.characters.cameraStudent,
				participantIds: [
					arrivalCorridorIds.characters.player,
					firstWeekIds.characters.cameraStudent
				],
				runtimePolicy: {
					occurrenceMode: 'one-shot',
					durationMinutes: 15,
					missAfterMinutes: 90
				}
			}
		});
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'move/add',
				id: followupMoveId,
				storyNodeId: followupStoryId,
				kind: 'inform',
				label: 'Спросить, что теперь говорят на рынке',
				actorCharacterId: arrivalCorridorIds.characters.player,
				targetCharacterIds: [firstWeekIds.characters.cameraStudent],
				communicatedClaimId: followupClaimId
			}
		});
		const outcomeId = followupMoveId + ':outcome:continue';
		state = execute(state, {
			type: 'execute',
			command: {
				type: 'move/addEffect',
				moveId: followupMoveId,
				outcomeId,
				effect: {
					id: followupMoveId + ':memory',
					type: 'character-remembers',
					character: {type: 'move-actor'},
					summary:
						'На седьмой день я снова заглянул на старый рынок и услышал, что история кинотеатра продолжается.',
					importance: 0.45,
					baseStrength: 0.5,
					tags: ['day-seven', 'old-city', 'authoring-proof'],
					source: {type: 'current-move'}
				}
			}
		});

		expect(
			state.present.claims.find(claim => claim.id === followupClaimId)?.text
		).toContain('разговор у кинотеатра');
		expect(
			state.present.storyNodes.find(node => node.id === followupStoryId)
		).toEqual(
			expect.objectContaining({
				activationState: 'available',
				placement: {
					day: 7,
					minuteOfDay: 17 * 60,
					locationId: firstWeekIds.locations.oldMarket
				}
			})
		);
		expect(
			state.present.narrativeMoves.find(move => move.id === followupMoveId)
		).toEqual(
			expect.objectContaining({
				storyNodeId: followupStoryId,
				actorCharacterId: arrivalCorridorIds.characters.player,
				targetCharacterIds: [firstWeekIds.characters.cameraStudent]
			})
		);
		expect(
			state.present.narrativeMoves
				.find(move => move.id === followupMoveId)
				?.outcomes[0].effects
		).toEqual([
			expect.objectContaining({
				id: followupMoveId + ':memory',
				type: 'character-remembers'
			})
		]);

		expect(state.present.runtimeOccurrences).toEqual(initial.runtimeOccurrences);
		expect(state.present.storyNodeStateOverrides).toEqual(
			initial.storyNodeStateOverrides
		);
		expect(state.present.memories).toEqual(initial.memories);

		const compiled = compileNarrativeRuntimeArtifact(state.present);
		expect(compiled.status).toBe('compiled');

		const beforeUndo = state.present;
		const undone = editorAuthoringReducer(state, {type: 'undo'});
		expect(
			undone.present.narrativeMoves
				.find(move => move.id === followupMoveId)
				?.outcomes[0].effects
		).toEqual([]);
		const redone = editorAuthoringReducer(undone, {type: 'redo'});
		expect(redone.present).toEqual(beforeUndo);
	});
});
