import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';
import {executeNarrativeTravel, NarrativeTravelRejectionReason} from './travel';
import {deliverA63NpcSocialDueWork} from './player-npc-social-delivery';
import {playerNpcSocialDeliveryProjectId} from '../../domain/narrative/content/93-days-player-npc-social-delivery';

export type NarrativePlayerTravelExecutionResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			routeId: string;
			routeLabel: string;
			destinationLocationId: string;
			destinationName: string;
			durationMinutes: number;
			fareMinorUnits?: number;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			routeId: string;
			reason: NarrativeTravelRejectionReason | 'session-replacement';
			summary: string;
	  };

/**
 * Player-owned travel bridge. Route/time/location semantics stay in the
 * canonical A56 project-level travel executor; this layer only replaces A53
 * session state after a successful result.
 */
export function executeNarrativePlayerTravel(
	session: NarrativePlayerSession,
	routeId: string,
	playerCharacterId: string
): NarrativePlayerTravelExecutionResult {
	const travelled = executeNarrativeTravel(
		session.currentProject,
		routeId,
		playerCharacterId,
		session.currentProject.projectId === playerNpcSocialDeliveryProjectId
			? deliverA63NpcSocialDueWork
			: undefined
	);
	if (travelled.status === 'rejected') {
		return {
			status: 'rejected',
			session,
			routeId,
			reason: travelled.reason,
			summary: travelled.summary
		};
	}

	const replacement = replaceNarrativePlayerSessionProject(
		session,
		travelled.project
	);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			routeId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical travel result.'
		};
	}
	const destination = travelled.project.locations.find(
		location => location.id === travelled.route.destinationLocationId
	);
	return {
		status: 'applied',
		session: replacement.session,
		routeId,
		routeLabel: travelled.route.label,
		destinationLocationId: travelled.route.destinationLocationId,
		destinationName: destination?.name ?? travelled.route.destinationLocationId,
		durationMinutes: travelled.route.durationMinutes,
		fareMinorUnits: travelled.fareMinorUnits
	};
}
