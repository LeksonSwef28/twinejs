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

/**
 * Snapshot the semantics of an effect at the real Outcome moment.
 * Sorted keys make the comparison stable across save/restore and object key order.
 * Only references relevant to delayed knowledge are included from the Move.
 */
function stableDefinitionValue(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableDefinitionValue).join(',')}]`;
	}
	if (value !== null && typeof value === 'object') {
		const parts = Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
			.map(([key, entry]) => `${JSON.stringify(key)}:${stableDefinitionValue(entry)}`);
		return `{${parts.join(',')}}`;
	}
	return JSON.stringify(value) ?? 'null';
}

function deferredClaimId(
	move: NarrativeMoveDefinition,
	effect: NarrativeKnowledgeEffectDefinition
): string | undefined {
	return effect.claim.type === 'claim'
		? effect.claim.claimId
		: move.communicatedClaimId;
}

export function deferredEffectSignature(
	project: NarrativeProject,
	move: NarrativeMoveDefinition,
	effect: NarrativeKnowledgeEffectDefinition
): string {
	const claimId = deferredClaimId(move, effect);
	return stableDefinitionValue({
		move: {
			storyNodeId: move.storyNodeId,
			actorCharacterId: move.actorCharacterId,
			targetCharacterIds: move.targetCharacterIds,
			communicatedClaimId: move.communicatedClaimId
		},
		effect,
		claimDefinition: project.claims.find(claim => claim.id === claimId) ?? null
	});
}

function deferredReferencesExist(
	project: NarrativeProject,
	move: NarrativeMoveDefinition,
	effect: NarrativeKnowledgeEffectDefinition
): boolean {
	const recipientId = effect.recipient.type === 'character'
		? effect.recipient.characterId
		: move.targetCharacterIds[effect.recipient.targetIndex];
	const claimId = deferredClaimId(move, effect);
	const sourceId = effect.source.type === 'move-actor'
		? move.actorCharacterId
		: effect.source.type === 'move-target'
			? move.targetCharacterIds[effect.source.targetIndex]
			: undefined;
	return Boolean(
		project.storyNodes.some(node => node.id === move.storyNodeId) &&
		recipientId && project.characters.some(character => character.id === recipientId) &&
		claimId && project.claims.some(claim => claim.id === claimId) &&
		((effect.source.type !== 'move-actor' && effect.source.type !== 'move-target') ||
			(sourceId && project.characters.some(character => character.id === sourceId)))
	);
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
			definitionSignature: deferredEffectSignature(project, move, effect),
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
		const cause = project.runtimeOccurrences.find(occurrence =>
			occurrence.type === 'move-outcome' &&
			occurrence.id === pending.causeOccurrenceId
		);
		const applicable =
			cause?.type === 'move-outcome' &&
			cause.storyNodeId === pending.storyNodeId &&
			cause.moveId === pending.moveId &&
			cause.outcomeId === pending.outcomeId &&
			cause.effectIds.includes(pending.effectId) &&
			move?.storyNodeId === pending.storyNodeId &&
			effect?.type === 'character-learns-claim' &&
			effect.delayDays !== undefined &&
			cause.moment.day + effect.delayDays === pending.dueMoment.day &&
			cause.moment.minuteOfDay === pending.dueMoment.minuteOfDay;
		const referencesPresent = Boolean(
			applicable && move && effect?.type === 'character-learns-claim' &&
			deferredReferencesExist(project, move, effect)
		);
		const contractMatches = Boolean(
			applicable && move && effect?.type === 'character-learns-claim' &&
			pending.definitionSignature &&
			pending.definitionSignature === deferredEffectSignature(project, move, effect)
		);
		let appliedSuccessfully = false;
		if (applicable && referencesPresent && contractMatches && move && outcome && effect) {
			try {
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
				appliedSuccessfully = true;
			} catch {
				// Stale/corrupt references cannot crash canonical time advancement
				// or produce a partial Claim update. The expired event is auditable.
			}
		}
		const result = appliedSuccessfully ? 'applied' : 'expired';
		const reason = !applicable
			? 'missing-definition' as const
			: !referencesPresent
				? 'missing-reference' as const
				: !pending.definitionSignature
					? 'unverifiable-definition' as const
					: !contractMatches
						? 'changed-definition' as const
						: 'missing-definition' as const;
		finished.push({
			...pending,
			id: `${deferredRecordId(pending.causeOccurrenceId, pending.effectId)}:${result}`,
			result,
			moment: {...pending.dueMoment},
			...(appliedSuccessfully ? {reason: undefined} : {reason})
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
