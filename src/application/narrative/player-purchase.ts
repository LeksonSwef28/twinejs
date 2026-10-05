import {executeNarrativePurchase, NarrativePurchaseRejectionReason} from './economy';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerPurchaseResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			offerId: string;
			itemInstanceId: string;
			priceMinorUnits: number;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			offerId: string;
			reason: NarrativePurchaseRejectionReason | 'session-replacement';
			summary: string;
	  };

/** Thin Player bridge over the canonical A58 purchase transaction. */
export function executeNarrativePlayerPurchase(
	session: NarrativePlayerSession,
	offerId: string,
	playerCharacterId: string
): NarrativePlayerPurchaseResult {
	const purchased = executeNarrativePurchase(
		session.currentProject,
		offerId,
		playerCharacterId
	);
	if (purchased.status === 'rejected') {
		return {
			status: 'rejected',
			session,
			offerId,
			reason: purchased.reason,
			summary: purchased.summary
		};
	}
	const replacement = replaceNarrativePlayerSessionProject(
		session,
		purchased.project
	);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			offerId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical purchase result.'
		};
	}
	return {
		status: 'applied',
		session: replacement.session,
		offerId,
		itemInstanceId: purchased.itemInstanceId,
		priceMinorUnits: purchased.priceMinorUnits
	};
}
