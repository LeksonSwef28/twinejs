import type {NarrativeProject} from '../../domain/narrative/project';
import type {
	NarrativeDeferredClaimOccurrence,
	NarrativeRuntimeMoment
} from '../../domain/narrative/runtime-story';
import {deferredEffectSignature} from './deferred-claim';

export type DeferredClaimDefinitionState = 'current' | 'changed-or-missing' | 'legacy-unverifiable';

export interface DeferredClaimInspectorEntry {
	id: string;
	status: NarrativeDeferredClaimOccurrence['result'];
	reason?: NarrativeDeferredClaimOccurrence['reason'];
	causeOccurrenceId: string;
	storyNodeId: string;
	moveId: string;
	outcomeId: string;
	effectId: string;
	dueMoment: NarrativeRuntimeMoment;
	scheduledAt?: NarrativeRuntimeMoment;
	completedAt?: NarrativeRuntimeMoment;
	definitionState: DeferredClaimDefinitionState;
	overdue: boolean;
	storyTitle?: string;
	moveLabel?: string;
	outcomeLabel?: string;
	claimText?: string;
	recipientName?: string;
	sourceLabel?: string;
}

export interface DeferredClaimInspectorSnapshot {
	pending: DeferredClaimInspectorEntry[];
	completed: DeferredClaimInspectorEntry[];
	pendingTotal: number;
	appliedTotal: number;
	expiredTotal: number;
}

const absoluteMinute = (moment: NarrativeRuntimeMoment) =>
	(moment.day - 1) * 1440 + moment.minuteOfDay;

/** Read-only projection of the canonical occurrence journal; never schedules or settles effects. */
export function createDeferredClaimInspectorSnapshot(
	project: NarrativeProject,
	limit = 25
): DeferredClaimInspectorSnapshot {
	// Reduce the whole journal, not its recent-history slice: old pending events must stay visible.
	const latestByCauseAndEffect = new Map<string, NarrativeDeferredClaimOccurrence>();
	const causes = new Map<string, NarrativeRuntimeMoment>();
	for (const occurrence of project.runtimeOccurrences) {
		if (occurrence.type === 'move-outcome') {
			causes.set(occurrence.id, occurrence.moment);
		} else if (occurrence.type === 'deferred-claim') {
			const key = JSON.stringify([occurrence.causeOccurrenceId, occurrence.effectId]);
			const previous = latestByCauseAndEffect.get(key);
			if (!previous || occurrence.result !== 'scheduled') {
				latestByCauseAndEffect.set(key, occurrence);
			}
		}
	}

	const moves = new Map(project.narrativeMoves.map(move => [move.id, move]));
	const stories = new Map(project.storyNodes.map(story => [story.id, story]));
	const characters = new Map(project.characters.map(character => [character.id, character.name]));
	const claims = new Map(project.claims.map(claim => [claim.id, claim]));
	const currentMinute = absoluteMinute(project.simulation);
	const all: DeferredClaimInspectorEntry[] = [];

	for (const event of latestByCauseAndEffect.values()) {
		const move = moves.get(event.moveId);
		const outcome = move?.outcomes.find(candidate => candidate.id === event.outcomeId);
		const effect = outcome?.effects.find(candidate => candidate.id === event.effectId);
		const recipientId = effect?.type === 'character-learns-claim'
			? (effect.recipient.type === 'character'
				? effect.recipient.characterId
				: move?.targetCharacterIds[effect.recipient.targetIndex])
			: undefined;
		const claimId = effect?.type === 'character-learns-claim'
			? (effect.claim.type === 'claim' ? effect.claim.claimId : move?.communicatedClaimId)
			: undefined;
		const sourceId = effect?.type === 'character-learns-claim'
			? (effect.source.type === 'move-actor'
				? move?.actorCharacterId
				: effect.source.type === 'move-target'
					? move?.targetCharacterIds[effect.source.targetIndex]
					: undefined)
			: undefined;
		const requiresSourceCharacter = effect?.type === 'character-learns-claim' &&
			(effect.source.type === 'move-actor' || effect.source.type === 'move-target');
		const validReferences = Boolean(
			stories.has(event.storyNodeId) && recipientId && characters.has(recipientId) &&
			claimId && claims.has(claimId) &&
			(!requiresSourceCharacter || (sourceId && characters.has(sourceId)))
		);
		const currentDefinition = move?.storyNodeId === event.storyNodeId &&
			effect?.type === 'character-learns-claim' && validReferences &&
			event.definitionSignature !== undefined &&
			event.definitionSignature === deferredEffectSignature(project, move, effect);
		const definitionState: DeferredClaimDefinitionState = !event.definitionSignature
			? 'legacy-unverifiable'
			: currentDefinition ? 'current' : 'changed-or-missing';
		const entry: DeferredClaimInspectorEntry = {
			id: event.id,
			status: event.result,
			reason: event.reason,
			causeOccurrenceId: event.causeOccurrenceId,
			storyNodeId: event.storyNodeId,
			moveId: event.moveId,
			outcomeId: event.outcomeId,
			effectId: event.effectId,
			dueMoment: event.dueMoment,
			scheduledAt: causes.get(event.causeOccurrenceId) ??
				(event.result === 'scheduled' || event.reason === 'past-project-end' ? event.moment : undefined),
			completedAt: event.result === 'scheduled' ? undefined : event.moment,
			definitionState,
			overdue: event.result === 'scheduled' && absoluteMinute(event.dueMoment) < currentMinute
		};
		// After an edit, the *current* author definition may not describe the scheduled one.
		if (currentDefinition && move && outcome && effect?.type === 'character-learns-claim') {
			const source = effect.source;
			entry.storyTitle = stories.get(event.storyNodeId)?.title;
			entry.moveLabel = move.label;
			entry.outcomeLabel = outcome.label;
			entry.recipientName = recipientId ? characters.get(recipientId) : undefined;
			entry.claimText = claimId ? claims.get(claimId)?.text : undefined;
			entry.sourceLabel = sourceId
				? `Со слов: ${characters.get(sourceId) ?? sourceId}`
				: source.type === 'mediated'
					? `Через ${source.medium}${source.attribution ? ` · ${source.attribution}` : ''}`
					: source.type === 'authored' ? 'Авторская настройка'
						: source.type === 'observed' ? 'Личное наблюдение'
							: source.type === 'inferred' ? 'Собственный вывод' : undefined;
		}
		all.push(entry);
	}

	const pending = all.filter(event => event.status === 'scheduled')
		.sort((a, b) => absoluteMinute(a.dueMoment) - absoluteMinute(b.dueMoment) ||
			a.id.localeCompare(b.id));
	const completed = all.filter(event => event.status !== 'scheduled')
		.sort((a, b) => absoluteMinute(b.completedAt ?? b.dueMoment) -
			absoluteMinute(a.completedAt ?? a.dueMoment) || a.id.localeCompare(b.id));
	const appliedTotal = completed.filter(event => event.status === 'applied').length;
	return {
		pending: pending.slice(0, Math.max(0, limit)),
		completed: completed.slice(0, Math.max(0, limit)),
		pendingTotal: pending.length,
		appliedTotal,
		expiredTotal: completed.length - appliedTotal
	};
}
