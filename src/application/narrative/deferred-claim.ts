import {NarrativeProject} from '../../domain/narrative/project';
import {
	NarrativeKnowledgeEffectDefinition,
	NarrativeMoveDefinition,
	NarrativeOutcomeDefinition
} from '../../domain/narrative/interaction';
import {
	NarrativeDeferredClaimOccurrence,
	NarrativeMoveOutcomeOccurrence
} from '../../domain/narrative/runtime-story';
import {simulationKernelAbsoluteMinute} from '../../domain/narrative/simulation-kernel';
import {applyNarrativeOutcomeKnowledgeEffects} from '../../domain/narrative/interaction-runtime';

function deferredRecordId(
	causeOccurrenceId: string,
	effectId: string
) {
	return `${causeOccurrenceId}:deferred-claim:${effectId}`;
}

/** A real resolved Outcome schedules a Claim; authoring and Preview navigation never do. */
export function recordDeferredOutcomeClaims(
	project: NarrativeProject,
	move: NarrativeMoveDefinition,
	outcome: NarrativeOutcomeDefinition,
	cause: NarrativeMoveOutcomeOccurrence
): NarrativeProject {
	const delayed = outcome.effects.filter(
		(effect): effect is NarrativeKnowledgeEffectDefinition =>
			effect.type === 'character-learns-claim' &&
			effect.delayDays !== undefined
	);
	if (delayed.length === 0) {
		return project;
	}
	const additions: NarrativeDeferredClaimOccurrence[] = delayed.map(effect => {
		const dueMoment = {
			day: cause.moment.day + effect.delayDays!,
			minuteOfDay: cause.moment.minuteOfDay
		};
		const outside = dueMoment.day > project.template.dayCount;
		return {
			id: `${deferredRecordId(cause.id, effect.id)}:${outside ? 'expired' : 'scheduled'}`,
			type: 'deferred-claim',
			result: outside ? 'expired' : 'scheduled',
			storyNodeId: move.storyNodeId,
			moveId: move.id,
			outcomeId: outcome.id,
			effectId: effect.id,
			causeOccurrenceId: cause.id,
			dueMoment,
			moment: {...cause.moment},
			...(outside ? {reason: 'past-project-end' as const} : {})
		};
	});
	return {...project, runtimeOccurrences: [...project.runtimeOccurrences, ...additions]};
}

/** A journal is the pending queue: save/load restores it with no second state owner. */
export function pendingDeferredClaims(
	project: Pick<NarrativeProject, 'runtimeOccurrences'>
): NarrativeDeferredClaimOccurrence[] {
	const journal = project.runtimeOccurrences.filter(
		(event): event is NarrativeDeferredClaimOccurrence =>
			event.type === 'deferred-claim'
	);
	const closed = new Set(
		journal
			.filter(event => event.result !== 'scheduled')
			.map(event => deferredRecordId(event.causeOccurrenceId, event.effectId))
	);
	return journal
		.filter(event => event.result === 'scheduled' &&
			!closed.has(deferredRecordId(event.causeOccurrenceId, event.effectId)))
		.sort((a, b) =>
			simulationKernelAbsoluteMinute(a.dueMoment) -
				simulationKernelAbsoluteMinute(b.dueMoment) ||
			a.id.localeCompare(b.id)
		);
}

export function nextPendingDeferredClaimMinute(
	project: NarrativeProject,
	fromAbsolute: number,
	throughAbsolute: number
): number | undefined {
	return pendingDeferredClaims(project)
		.map(event => simulationKernelAbsoluteMinute(event.dueMoment))
		.find(minute => minute > fromAbsolute && minute <= throughAbsolute);
}

/**
 * Completes due Claim effects in the EXISTING canonical Simulation step.
 * Expired or removed definitions fail closed, and the ledger ensures exactly
 * once even if a long wait crosses several due moments or a save is restored.
 */
export function settleDueDeferredClaims(
	project: NarrativeProject,
	to: {day: number; minuteOfDay: number}
): NarrativeProject {
	const maximum = simulationKernelAbsoluteMinute(to);
	let state = project.simulation.characterKnowledge;
	const finished: NarrativeDeferredClaimOccurrence[] = [];
	for (const pending of pendingDeferredClaims(project)) {
		if (simulationKernelAbsoluteMinute(pending.dueMoment) > maximum) {
			break;
		}
		const move = project.narrativeMoves.find(item => item.id === pending.moveId);
		const outcome = move?.outcomes.find(item => item.id === pending.outcomeId);
		const effect = outcome?.effects.find(item => item.id === pending.effectId);
		const applicable = move?.storyNodeId === pending.storyNodeId &&
			effect?.type === 'character-learns-claim' &&
			effect.delayDays !== undefined;
		if (applicable && move && outcome && effect) {
			const applied = applyNarrativeOutcomeKnowledgeEffects(
				move,
				{...outcome, effects: [{...effect, delayDays: undefined}]},
				state,
				{
					moment: pending.dueMoment,
					sourceEventId: move.storyNodeId
				}
			);
			state = applied.characterKnowledge;
		}
		const result = applicable ? 'applied' : 'expired';
		finished.push({
			...pending,
			id: `${deferredRecordId(pending.causeOccurrenceId, pending.effectId)}:${result}`,
			result,
			moment: {...pending.dueMoment},
			...(applicable ? {reason: undefined} : {reason: 'missing-definition' as const})
		});
	}
	if (finished.length === 0) {
		return project;
	}
	return {
		...project,
		simulation: {...project.simulation, characterKnowledge: state},
		runtimeOccurrences: [...project.runtimeOccurrences, ...finished]
	};
}
