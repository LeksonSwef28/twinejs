import {advanceNarrativePlayerTimeSegmented} from './player-time';
import {deliverA63NpcSocialDueWork} from './player-npc-social-delivery';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerWaitResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			durationMinutes: number;
			dueWorkIds: string[];
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			reason: 'invalid-duration' | 'project-end' | 'session-replacement';
			summary: string;
	  };

/**
 * A56 generic wait command. It owns no clock/body/story mechanics: all elapsed
 * time is delegated to the canonical simulation orchestrator.
 */
export function executeNarrativePlayerWait(
	session: NarrativePlayerSession,
	durationMinutes: number
): NarrativePlayerWaitResult {
	if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
		return {
			status: 'rejected',
			session,
			reason: 'invalid-duration',
			summary: 'Ожидание должно занимать целое положительное число минут.'
		};
	}

	const advanced = advanceNarrativePlayerTimeSegmented(
		session.currentProject,
		durationMinutes,
		deliverA63NpcSocialDueWork
	);
	if (advanced.appliedMinutes !== durationMinutes) {
		return {
			status: 'rejected',
			session,
			reason: 'project-end',
			summary: 'До конца проекта недостаточно времени для полного ожидания.'
		};
	}
	const replacement = replaceNarrativePlayerSessionProject(
		session,
		advanced.project
	);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical wait result.'
		};
	}
	return {
		status: 'applied',
		session: replacement.session,
		durationMinutes,
		dueWorkIds: advanced.dueWork.map(work => work.id)
	};
}
