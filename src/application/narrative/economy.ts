import {
	applyNarrativeCashSpend,
	evaluateNarrativeCashSpend,
	narrativeEconomyIsStructurallyValid,
	narrativePurchaseOfferIsStructurallyValid,
	NarrativeCashSpendTrace
} from '../../domain/narrative/economy';
import {effectiveItemPlacement} from '../../domain/narrative/carrying';
import {NarrativeProject} from '../../domain/narrative/project';
import {applyNarrativeItemRuntimePlacement} from './physical';

export type NarrativeProjectCashSpendResult =
	| {
			status: 'applied';
			project: NarrativeProject;
			trace: NarrativeCashSpendTrace;
	  }
	| {
			status: 'rejected';
			project: NarrativeProject;
			reason: 'unknown-character' | 'invalid-amount' | 'insufficient-funds';
			summary: string;
	  };

export type NarrativePurchaseRejectionReason =
	| 'economy-unavailable'
	| 'unknown-offer'
	| 'invalid-offer'
	| 'unknown-character'
	| 'wrong-location'
	| 'unknown-item'
	| 'item-unavailable'
	| 'insufficient-funds'
	| 'placement-blocked';

export type NarrativePurchaseExecutionResult =
	| {
			status: 'applied';
			project: NarrativeProject;
			offerId: string;
			itemInstanceId: string;
			priceMinorUnits: number;
			spendTrace: NarrativeCashSpendTrace;
	  }
	| {
			status: 'rejected';
			project: NarrativeProject;
			offerId: string;
			reason: NarrativePurchaseRejectionReason;
			summary: string;
	  };

export function executeNarrativeCashSpend(
	project: NarrativeProject,
	characterId: string,
	amountMinorUnits: number
): NarrativeProjectCashSpendResult {
	const characterExists = project.characters.some(
		character => character.id === characterId
	);
	const evaluated = evaluateNarrativeCashSpend(
		project.cashByCharacter,
		characterId,
		amountMinorUnits,
		characterExists
	);
	if (!evaluated.allowed) {
		return {
			status: 'rejected',
			project,
			reason:
				evaluated.reason === 'invalid-character'
					? 'unknown-character'
					: evaluated.reason,
			summary: evaluated.summary
		};
	}
	return {
		status: 'applied',
		project: {
			...project,
			cashByCharacter: applyNarrativeCashSpend(
				project.cashByCharacter,
				evaluated
			)
		},
		trace: evaluated.trace
	};
}

/**
 * Minimal A58 purchase boundary.
 *
 * Ordering is deliberate:
 * authored/identity/location/item/funds validation -> runtime placement -> cash.
 * Every rejected path returns the original project object unchanged.
 */
export function executeNarrativePurchase(
	project: NarrativeProject,
	offerId: string,
	buyerCharacterId: string
): NarrativePurchaseExecutionResult {
	if (!project.economy || !narrativeEconomyIsStructurallyValid(project.economy)) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'economy-unavailable',
			summary: 'Экономика для этого Narrative Project не настроена.'
		};
	}
	const offer = project.economy.purchaseOffers.find(
		candidate => candidate.id === offerId
	);
	if (!offer) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'unknown-offer',
			summary: 'Предложение покупки не найдено.'
		};
	}
	if (!narrativePurchaseOfferIsStructurallyValid(offer)) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'invalid-offer',
			summary: 'Authored предложение покупки содержит недействительные данные.'
		};
	}
	if (
		!project.characters.some(character => character.id === buyerCharacterId)
	) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'unknown-character',
			summary: 'Покупатель не найден.'
		};
	}
	if (
		project.simulation.actualLocationByCharacter[buyerCharacterId] !==
		offer.locationId
	) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'wrong-location',
			summary: 'Покупка недоступна из текущей локации.'
		};
	}
	const item = project.itemInstances.find(
		instance => instance.id === offer.itemInstanceId
	);
	if (!item) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'unknown-item',
			summary: 'Предмет покупки не найден.'
		};
	}
	const placement = effectiveItemPlacement(item, project.itemPlacementOverrides);
	if (
		placement.type !== 'location' ||
		placement.locationId !== offer.locationId
	) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'item-unavailable',
			summary: 'Этот конкретный предмет уже недоступен для покупки.'
		};
	}
	const spendEvaluation = evaluateNarrativeCashSpend(
		project.cashByCharacter,
		buyerCharacterId,
		offer.priceMinorUnits,
		true
	);
	if (!spendEvaluation.allowed) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason:
				spendEvaluation.reason === 'insufficient-funds'
					? 'insufficient-funds'
					: 'invalid-offer',
			summary: spendEvaluation.summary
		};
	}
	const moved = applyNarrativeItemRuntimePlacement(
		project,
		offer.itemInstanceId,
		{type: 'character', characterId: buyerCharacterId}
	);
	if (!moved.applied) {
		return {
			status: 'rejected',
			project,
			offerId,
			reason: 'placement-blocked',
			summary: moved.blockers.join(' ')
		};
	}
	return {
		status: 'applied',
		project: {
			...moved.project,
			cashByCharacter: applyNarrativeCashSpend(
				project.cashByCharacter,
				spendEvaluation
			)
		},
		offerId,
		itemInstanceId: offer.itemInstanceId,
		priceMinorUnits: offer.priceMinorUnits,
		spendTrace: spendEvaluation.trace
	};
}
