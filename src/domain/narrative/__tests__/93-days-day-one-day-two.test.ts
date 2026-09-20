import {compileNarrativeRuntimeArtifact, serializeNarrativeRuntimeArtifact} from '../../../application/narrative/export-compiler';
import {
	resolveAndApplyNarrativeProjectMove,
	setNarrativeCharacterActualLocation
} from '../../../application/narrative/living-simulation';
import {analyzeNarrativeScheduleConflicts} from '../schedule-analysis';
import {validateNarrativeProjectReferences} from '../project-reference-validation';
import {arrivalCorridorIds} from '../content/93-days-arrival-corridor';
import {
	create93DaysDayOneDayTwoProject,
	dayOneNarrativeIds
} from '../content/93-days-day-one-day-two';

function locateOpeningCharacters() {
	let project = create93DaysDayOneDayTwoProject();
	project = setNarrativeCharacterActualLocation(
		project,
		arrivalCorridorIds.characters.player,
		arrivalCorridorIds.locations.busStation
	);
	project = setNarrativeCharacterActualLocation(
		project,
		arrivalCorridorIds.characters.stationClerk,
		arrivalCorridorIds.locations.busStation
	);
	return project;
}

function goodwill(project: ReturnType<typeof create93DaysDayOneDayTwoProject>) {
	return project.relationships.find(
		relationship =>
			relationship.fromCharacterId ===
				arrivalCorridorIds.characters.stationClerk &&
			relationship.toCharacterId === arrivalCorridorIds.characters.player
	)?.values.goodwill;
}

describe('A57-S1 Day One -> Day Two authored narrative', () => {
	test('has valid authored references, schedules and deterministic compilation', () => {
		const project = create93DaysDayOneDayTwoProject();
		expect(validateNarrativeProjectReferences(project).findings).toEqual([]);
		expect(analyzeNarrativeScheduleConflicts(project).findings).toEqual([]);

		const first = compileNarrativeRuntimeArtifact(project);
		const second = compileNarrativeRuntimeArtifact(
			create93DaysDayOneDayTwoProject()
		);
		expect(first.status).toBe('compiled');
		expect(second.status).toBe('compiled');
		if (first.status !== 'compiled' || second.status !== 'compiled') {
			throw new Error('Expected A57 authored project to compile.');
		}
		expect(serializeNarrativeRuntimeArtifact(first.artifact)).toBe(
			serializeNarrativeRuntimeArtifact(second.artifact)
		);
		expect(first.artifact.initialRuntime.simulation.actualLocationByCharacter).toEqual(
			{}
		);
	});

	test('unanswered first call requires the authored phone and writes knowledge plus memory', () => {
		const project = create93DaysDayOneDayTwoProject();
		const result = resolveAndApplyNarrativeProjectMove(
			project,
			dayOneNarrativeIds.moves.callContact
		);

		expect(result.resolution.status).toBe('resolved');
		expect(result.project.simulation.characterKnowledge).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					characterId: arrivalCorridorIds.characters.player,
					claimId: dayOneNarrativeIds.claims.contactUnavailable,
					attitude: 'believes'
				})
			])
		);
		expect(result.project.memories).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					characterId: arrivalCorridorIds.characters.player,
					tags: expect.arrayContaining(['phone', 'alone'])
				})
			])
		);
		expect(
			result.project.storyNodeStateOverrides[
				dayOneNarrativeIds.story.callContact
			]
		).toBe('completed');
	});

	test('clerk conversation is genuinely sequential and the first turn opens the follow-up', () => {
		const project = locateOpeningCharacters();
		const opening = resolveAndApplyNarrativeProjectMove(
			project,
			dayOneNarrativeIds.moves.askTowerPolitely
		);
		expect(opening.resolution.status).toBe('resolved');
		expect(
			opening.project.storyNodeStateOverrides[
				dayOneNarrativeIds.story.clerkOpening
			]
		).toBe('completed');
		expect(
			opening.project.storyNodeStateOverrides[
				dayOneNarrativeIds.story.clerkFollowup
			]
		).toBe('available');

		const followup = resolveAndApplyNarrativeProjectMove(
			opening.project,
			dayOneNarrativeIds.moves.clarifyTransfer
		);
		expect(followup.resolution.status).toBe('resolved');
		expect(
			followup.project.storyNodeStateOverrides[
				dayOneNarrativeIds.story.clerkFollowup
			]
		).toBe('completed');
		expect(followup.project.simulation.characterKnowledge).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					claimId: dayOneNarrativeIds.claims.towerTransferRoute,
					characterId: arrivalCorridorIds.characters.player
				})
			])
		);
	});

	test('two legitimate conversation paths create different knowledge/relationship histories', () => {
		const start = locateOpeningCharacters();

		const constructiveOpening = resolveAndApplyNarrativeProjectMove(
			start,
			dayOneNarrativeIds.moves.askTowerPolitely
		).project;
		const constructive = resolveAndApplyNarrativeProjectMove(
			constructiveOpening,
			dayOneNarrativeIds.moves.clarifyTransfer
		).project;

		const abruptOpening = resolveAndApplyNarrativeProjectMove(
			start,
			dayOneNarrativeIds.moves.askAbruptly
		).project;
		const abrupt = resolveAndApplyNarrativeProjectMove(
			abruptOpening,
			dayOneNarrativeIds.moves.thankAndLeave
		).project;

		expect(goodwill(constructive)).toBeCloseTo(0.2);
		expect(goodwill(abrupt)).toBeCloseTo(-0.05);
		expect(
			constructive.simulation.characterKnowledge.some(
				state =>
					state.claimId === dayOneNarrativeIds.claims.towerTransferRoute
			)
		).toBe(true);
		expect(
			abrupt.simulation.characterKnowledge.some(
				state =>
					state.claimId === dayOneNarrativeIds.claims.towerTransferRoute
			)
		).toBe(false);
	});

	test('authors one missable player opportunity and one protagonist-absent NPC occurrence', () => {
		const project = create93DaysDayOneDayTwoProject();
		const optional = project.storyNodes.find(
			node => node.id === dayOneNarrativeIds.story.stationOpportunity
		);
		const npcOnly = project.storyNodes.find(
			node => node.id === dayOneNarrativeIds.story.dormNpcOccurrence
		);

		expect(optional).toMatchObject({
			placement: {day: 1, minuteOfDay: 370},
			runtimePolicy: {
				durationMinutes: 0,
				missAfterMinutes: 10,
				occurrenceMode: 'one-shot'
			}
		});
		expect(optional?.participantIds).toContain(
			arrivalCorridorIds.characters.player
		);

		expect(npcOnly?.participantIds).toEqual([
			arrivalCorridorIds.characters.dormDuty,
			dayOneNarrativeIds.characters.dormResident
		]);
		expect(npcOnly?.participantIds).not.toContain(
			arrivalCorridorIds.characters.player
		);
	});

	test('Day Two reflection is authored against canonical Day One state', () => {
		const project = create93DaysDayOneDayTwoProject();
		const dayTwo = project.storyNodes.find(
			node => node.id === dayOneNarrativeIds.story.dayTwoMorning
		);
		expect(dayTwo?.placement).toEqual({
			day: 2,
			locationId: arrivalCorridorIds.locations.studentDormitory
		});

		const known = project.narrativeMoves.find(
			move => move.id === dayOneNarrativeIds.moves.dayTwoKnownRoute
		);
		const missed = project.narrativeMoves.find(
			move => move.id === dayOneNarrativeIds.moves.dayTwoMissedOpportunity
		);
		expect(known?.guards).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					condition: expect.objectContaining({
						type: 'character-knows-claim',
						claimId: dayOneNarrativeIds.claims.towerTransferRoute
					})
				})
			])
		);
		expect(missed?.guards).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					condition: {
						type: 'story-node-state',
						storyNodeId: dayOneNarrativeIds.story.stationOpportunity,
						state: 'blocked'
					}
				})
			])
		);
	});
});
