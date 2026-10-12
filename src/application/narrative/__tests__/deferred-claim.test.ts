import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {narrativeMoveIsStructurallyValid} from '../../../domain/narrative/interaction';
import {
	resolveAndApplyNarrativeProjectMove
} from '../living-simulation';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {advanceNarrativePlayerTimeSegmented} from '../player-time';
import {pendingDeferredClaims} from '../deferred-claim';
import {
	serializeNarrativeRuntimeSnapshot,
	restoreNarrativeRuntimeSnapshotJson
} from '../../../store/narrative-project/runtime-snapshot';

function fixture(delayDays = 2) {
	const project = createNarrativeProject('a84-claim-host', 'A84 delayed knowledge', ninetyThreeDaysTemplate);
	project.characters = [{
		id: 'ira', name: 'Ира', cognitionTier: 'full', defaultBehaviorProfileId: 'ira-profile'
	}, {
		id: 'misha', name: 'Миша', cognitionTier: 'full', defaultBehaviorProfileId: 'misha-profile'
	}];
	project.claims = [{
		id: 'rumor',
		text: 'У клуба есть секрет',
		stance: 'unresolved',
		tags: []
	}];
	project.storyNodes = [{
		id: 'meeting', kind: 'dialogue', title: 'Узнали слух', participantIds: ['ira', 'misha'],
		activationState: 'available'
	}];
	project.narrativeMoves = [{
		id: 'talk', storyNodeId: 'meeting', kind: 'inform', label: 'Рассказать',
		actorCharacterId: 'ira', targetCharacterIds: ['misha'],
		guards: [], communicatedClaimId: 'rumor',
		resolution: {type: 'automatic', outcomeId: 'told'},
		outcomes: [{
			id: 'told', key: 'continue', label: 'Слух разойдётся',
			effectStoryNodeIds: [],
			effects: [{
				id: 'late-rumor',
				type: 'character-learns-claim',
				recipient: {type: 'move-target', targetIndex: 0},
				claim: {type: 'communicated-claim'},
				attitude: 'believes', confidence: 0.6,
				source: {type: 'move-actor'},
				delayDays
			}]
		}]
	}];
	return project;
}

describe('A84 canonical deferred Claim Outcome', () => {
	test('schedules on actual resolution, not authoring; fires on due minute only, exactly once', () => {
		const authored = fixture();
		expect(narrativeMoveIsStructurallyValid(authored.narrativeMoves[0])).toBe(true);
		expect(authored.runtimeOccurrences).toHaveLength(0);
		const resolved = resolveAndApplyNarrativeProjectMove(authored, 'talk');
		expect(resolved.resolution.status).toBe('resolved');
		const scheduled = resolved.project;
		expect(scheduled.simulation.characterKnowledge).toHaveLength(0);
		expect(authored.simulation.characterKnowledge).toHaveLength(0);
		expect(scheduled.runtimeOccurrences.map(e => e.type)).toEqual([
			'move-outcome', 'deferred-claim'
		]);
		expect(pendingDeferredClaims(scheduled)).toHaveLength(1);
		expect(pendingDeferredClaims(scheduled)[0].dueMoment).toEqual({
			day: 3, minuteOfDay: 360
		});
		const early = advanceNarrativeProjectSimulation(scheduled, 2879).project;
		expect(early.simulation.characterKnowledge).toHaveLength(0);
		const due = advanceNarrativeProjectSimulation(early, 1).project;
		expect(due.simulation.characterKnowledge).toEqual([
			expect.objectContaining({
				characterId: 'misha', claimId: 'rumor', attitude: 'believes',
				timesHeard: 1, learnedAt: {day: 3, minuteOfDay: 360},
				source: {type: 'told', sourceCharacterId: 'ira', sourceEventId: 'meeting'}
			})
		]);
		expect(pendingDeferredClaims(due)).toHaveLength(0);
		expect(due.runtimeOccurrences.filter(e =>
			e.type === 'deferred-claim' && e.result === 'applied'
		)).toHaveLength(1);
		const later = advanceNarrativeProjectSimulation(due, 1440).project;
		expect(later.simulation.characterKnowledge[0].timesHeard).toBe(1);
		expect(later.runtimeOccurrences).toHaveLength(due.runtimeOccurrences.length);
	});

	test('large time jump segments at due; two real choices at same minute each deliver once', () => {
		let project = fixture();
		project = resolveAndApplyNarrativeProjectMove(project, 'talk').project;
		project = resolveAndApplyNarrativeProjectMove(project, 'talk').project;
		const starts = pendingDeferredClaims(project);
		expect(starts).toHaveLength(2);
		expect(starts[0].causeOccurrenceId).not.toEqual(starts[1].causeOccurrenceId);
		const advanced = advanceNarrativePlayerTimeSegmented(project, 3 * 1440);
		expect(advanced.segments[0].to).toEqual({day: 3, minuteOfDay: 360});
		expect(advanced.project.simulation.characterKnowledge[0].timesHeard).toBe(2);
		expect(pendingDeferredClaims(advanced.project)).toHaveLength(0);
		const rerun = advanceNarrativePlayerTimeSegmented(advanced.project, 1);
		expect(rerun.project.simulation.characterKnowledge[0].timesHeard).toBe(2);
	});

	test('save before and after due preserves pending/fulfilled provenance on restore', () => {
		const authored = fixture();
		const scheduled = resolveAndApplyNarrativeProjectMove(authored, 'talk').project;
		const beforeJson = serializeNarrativeRuntimeSnapshot(scheduled);
		const restoredBefore = restoreNarrativeRuntimeSnapshotJson(authored, beforeJson);
		expect(restoredBefore.status).toBe('restored');
		expect(pendingDeferredClaims(restoredBefore.project)).toHaveLength(1);
		const applied = advanceNarrativeProjectSimulation(restoredBefore.project, 2880).project;
		expect(applied.simulation.characterKnowledge).toHaveLength(1);
		const afterJson = serializeNarrativeRuntimeSnapshot(applied);
		const restoredAfter = restoreNarrativeRuntimeSnapshotJson(authored, afterJson);
		expect(restoredAfter.status).toBe('restored');
		expect(pendingDeferredClaims(restoredAfter.project)).toHaveLength(0);
		const later = advanceNarrativeProjectSimulation(restoredAfter.project, 1440).project;
		expect(later.simulation.characterKnowledge[0].timesHeard).toBe(1);
	});

	test('past day 93 explicitly expires rather than changing knowledge or hanging', () => {
		const late = fixture(2);
		late.simulation.day = 92;
		late.simulation.minuteOfDay = 600;
		const result = resolveAndApplyNarrativeProjectMove(late, 'talk').project;
		expect(result.simulation.characterKnowledge).toHaveLength(0);
		expect(pendingDeferredClaims(result)).toHaveLength(0);
		expect(result.runtimeOccurrences).toEqual(expect.arrayContaining([
			expect.objectContaining({
				type: 'deferred-claim', result: 'expired', reason: 'past-project-end'
			})
		]));
	});

	test('a forged or orphaned pending event cannot create character knowledge', () => {
		const authored = fixture();
		const resolved = resolveAndApplyNarrativeProjectMove(authored, 'talk').project;
		const forged = {
			...resolved,
			runtimeOccurrences: resolved.runtimeOccurrences.map(event =>
				event.type === 'deferred-claim'
					? {...event, causeOccurrenceId: 'nonexistent-outcome'}
					: event
			)
		};
		const advanced = advanceNarrativeProjectSimulation(forged, 2880).project;
		expect(advanced.simulation.characterKnowledge).toHaveLength(0);
		expect(pendingDeferredClaims(advanced)).toHaveLength(0);
		expect(advanced.runtimeOccurrences).toEqual(expect.arrayContaining([
			expect.objectContaining({
				type: 'deferred-claim', result: 'expired', reason: 'missing-definition'
			})
		]));
	});

	test('malformed day delays are rejected at authoring definition boundary', () => {
		for (const invalid of [0, -2, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			const project = fixture(invalid);
			expect(narrativeMoveIsStructurallyValid(project.narrativeMoves[0])).toBe(false);
		}
	});
});
