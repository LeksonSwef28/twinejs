import {resolveAndApplyNarrativeProjectMove} from './living-simulation';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerActionExecutionResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			moveId: string;
			moveLabel: string;
			outcomeId: string;
			outcomeLabel: string;
			resolutionSummary: string;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			moveId: string;
			reason:
				| 'unknown-move'
				| 'actor-mismatch'
				| 'blocked'
				| 'unknown'
				| 'input-required'
				| 'invalid-runtime-result'
				| 'session-replacement';
			summary: string;
	  };

/**
 * A55 action boundary. Player UI supplies only a canonical authored Move id and
 * the already-resolved presentation character. Resolution/effects stay in the
 * Living Simulation runtime; successful projects enter the session through the
 * A53 replacement boundary.
 */
export function executeNarrativePlayerAction(
	session: NarrativePlayerSession,
	moveId: string,
	playerCharacterId: string
): NarrativePlayerActionExecutionResult {
	const move = session.currentProject.narrativeMoves.find(
		candidate => candidate.id === moveId
	);
	if (!move) {
		return {
			status: 'rejected',
			session,
			moveId,
			reason: 'unknown-move',
			summary: 'Действие не найдено в текущем Narrative Project.'
		};
	}
	if (move.actorCharacterId !== playerCharacterId) {
		return {
			status: 'rejected',
			session,
			moveId,
			reason: 'actor-mismatch',
			summary: 'Это действие не принадлежит текущему игровому персонажу.'
		};
	}

	const applied = resolveAndApplyNarrativeProjectMove(
		session.currentProject,
		moveId
	);
	if (applied.resolution.status !== 'resolved') {
		return {
			status: 'rejected',
			session,
			moveId,
			reason: applied.resolution.status,
			summary: applied.resolution.resolutionSummary
		};
	}
	if (!applied.resolution.outcomeId) {
		return {
			status: 'rejected',
			session,
			moveId,
			reason: 'invalid-runtime-result',
			summary: 'Canonical Move resolved without an outcome id.'
		};
	}

	const replacement = replaceNarrativePlayerSessionProject(
		session,
		applied.project
	);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			moveId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical runtime result.'
		};
	}

	const outcome = move.outcomes.find(
		candidate => candidate.id === applied.resolution.outcomeId
	);
	return {
		status: 'applied',
		session: replacement.session,
		moveId,
		moveLabel: move.label,
		outcomeId: applied.resolution.outcomeId,
		outcomeLabel: outcome?.label ?? applied.resolution.outcomeId,
		resolutionSummary: applied.resolution.resolutionSummary
	};
}
