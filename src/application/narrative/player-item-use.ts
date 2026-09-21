import {consumeNarrativeFoodItem} from './consumables';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerFoodUseResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			itemInstanceId: string;
			satietyGain: number;
			digestionMinutes: number;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			itemInstanceId: string;
			reason:
				| 'unknown-character'
				| 'unknown-item'
				| 'not-food'
				| 'not-carried'
				| 'placement-blocked'
				| 'session-replacement';
			summary: string;
	  };

/** Thin Player bridge over canonical A58 concrete-food application. */
export function executeNarrativePlayerFoodUse(
	session: NarrativePlayerSession,
	itemInstanceId: string,
	playerCharacterId: string
): NarrativePlayerFoodUseResult {
	const consumed = consumeNarrativeFoodItem(
		session.currentProject,
		itemInstanceId,
		playerCharacterId
	);
	if (consumed.status === 'rejected') {
		return {
			status: 'rejected',
			session,
			itemInstanceId,
			reason: consumed.reason,
			summary: consumed.summary
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
			itemInstanceId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical food-use result.'
		};
	}
	return {
		status: 'applied',
		session: replacement.session,
		itemInstanceId,
		satietyGain: consumed.satietyGain,
		digestionMinutes: consumed.digestionMinutes
	};
}
