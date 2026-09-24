import {scheduledStoryWork} from '../../domain/narrative/simulation-kernel';
import {consumeNarrativeStoryWork, NarrativeStoryWorkDecision} from './story-execution';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerStoryWorkResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			workId: string;
			storyNodeId: string;
			result: 'started' | 'completed' | 'missed' | 'expired';
			summary: string;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			workId: string;
		reason:
				| 'unknown-work'
				| 'not-player-work'
				| 'wrong-location'
				| 'runtime-rejected'
				| 'session-replacement';
			summary: string;
	  };

export function executeNarrativePlayerStoryWork(
	session: NarrativePlayerSession,
	workId: string,
	decision: NarrativeStoryWorkDecision,
	playerCharacterId: string
): NarrativePlayerStoryWorkResult {
	const work = scheduledStoryWork(session.currentProject.storyNodes).find(
		candidate => candidate.id === workId
	);
	const node = work?.sourceEntityId
		? session.currentProject.storyNodes.find(
				candidate => candidate.id === work.sourceEntityId
			)
		: undefined;
	if (!work || !node) {
		return {
			status: 'rejected',
			session,
			workId,
			reason: 'unknown-work',
			summary: 'Scheduled Story work не найден.'
		};
	}
	if (!node.participantIds.includes(playerCharacterId)) {
		return {
			status: 'rejected',
			session,
			workId,
			reason: 'not-player-work',
			summary: 'Это Story work не является выбором игрового персонажа.'
		};
	}
	if (
		decision === 'execute' &&
		node.placement?.locationId &&
		session.currentProject.simulation.actualLocationByCharacter[
			playerCharacterId
		] !== node.placement.locationId
	) {
		return {
			status: 'rejected',
			session,
			workId,
			reason: 'wrong-location',
			summary: 'Для участия персонаж должен находиться в authored локации события.'
		};
	}

	const consumed = consumeNarrativeStoryWork(
		session.currentProject,
		workId,
		{decision}
	);
	if (
		consumed.trace.status !== 'started' &&
		consumed.trace.status !== 'completed' &&
		consumed.trace.status !== 'missed' &&
		consumed.trace.status !== 'expired'
	) {
		return {
			status: 'rejected',
			session,
			workId,
			reason: 'runtime-rejected',
			summary: consumed.trace.summary
		};
	}
	const replacement = replaceNarrativePlayerSessionProject(
		session,
		consumed.project
	);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			workId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical Story-work result.'
		};
	}
	return {
		status: 'applied',
		session: replacement.session,
		workId,
		storyNodeId: node.id,
		result: consumed.trace.status,
		summary: consumed.trace.summary
	};
}
