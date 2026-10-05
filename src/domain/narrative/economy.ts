import {EntityId} from './entities';

export interface NarrativeCurrencyDefinition {
	code: string;
	label: string;
	/** Number of integer minor units in one displayed major unit. */
	minorUnitsPerMajor: number;
}

export interface NarrativePurchaseOfferDefinition {
	id: EntityId;
	label: string;
	locationId: EntityId;
	itemInstanceId: EntityId;
	priceMinorUnits: number;
	/** Optional authored provenance/presentation reference. */
	sellerCharacterId?: EntityId;
}

export interface NarrativeEconomyDefinition {
	currency: NarrativeCurrencyDefinition;
	initialCashByCharacter: Record<string, number>;
	purchaseOffers: NarrativePurchaseOfferDefinition[];
}

export interface NarrativeCashSpendTrace {
	characterId: EntityId;
	amountMinorUnits: number;
	balanceBeforeMinorUnits: number;
	balanceAfterMinorUnits: number;
}

export type NarrativeCashSpendEvaluation =
	| {
			allowed: true;
			trace: NarrativeCashSpendTrace;
	  }
	| {
			allowed: false;
			reason: 'invalid-character' | 'invalid-amount' | 'insufficient-funds';
			summary: string;
	  };

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function narrativeMoneyAmountIsValid(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 0
	);
}

export function narrativeCurrencyIsStructurallyValid(
	value: unknown
): value is NarrativeCurrencyDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const currency = value as Partial<NarrativeCurrencyDefinition>;
	return (
		typeof currency.code === 'string' &&
		Boolean(currency.code.trim()) &&
		typeof currency.label === 'string' &&
		Boolean(currency.label.trim()) &&
		Number.isInteger(currency.minorUnitsPerMajor) &&
		(currency.minorUnitsPerMajor ?? 0) > 0
	);
}

export function narrativePurchaseOfferIsStructurallyValid(
	value: unknown
): value is NarrativePurchaseOfferDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const offer = value as Partial<NarrativePurchaseOfferDefinition>;
	return (
		typeof offer.id === 'string' &&
		Boolean(offer.id) &&
		typeof offer.label === 'string' &&
		Boolean(offer.label.trim()) &&
		typeof offer.locationId === 'string' &&
		Boolean(offer.locationId) &&
		typeof offer.itemInstanceId === 'string' &&
		Boolean(offer.itemInstanceId) &&
		Number.isInteger(offer.priceMinorUnits) &&
		(offer.priceMinorUnits ?? 0) > 0 &&
		(offer.sellerCharacterId === undefined ||
			(typeof offer.sellerCharacterId === 'string' &&
				Boolean(offer.sellerCharacterId)))
	);
}

export function narrativeEconomyIsStructurallyValid(
	value: unknown
): value is NarrativeEconomyDefinition {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const economy = value as Partial<NarrativeEconomyDefinition>;
	return (
		narrativeCurrencyIsStructurallyValid(economy.currency) &&
		isRecord(economy.initialCashByCharacter) &&
		Object.values(economy.initialCashByCharacter).every(
			narrativeMoneyAmountIsValid
		) &&
		Array.isArray(economy.purchaseOffers) &&
		economy.purchaseOffers.every(narrativePurchaseOfferIsStructurallyValid)
	);
}

export function cashBalanceForCharacter(
	cashByCharacter: Record<string, number>,
	characterId: EntityId
) {
	const value = cashByCharacter[characterId];
	return narrativeMoneyAmountIsValid(value) ? value : 0;
}

export function evaluateNarrativeCashSpend(
	cashByCharacter: Record<string, number>,
	characterId: EntityId,
	amountMinorUnits: number,
	characterExists = true
): NarrativeCashSpendEvaluation {
	if (!characterExists || !characterId) {
		return {
			allowed: false,
			reason: 'invalid-character',
			summary: 'Персонаж для оплаты не найден.'
		};
	}
	if (!Number.isInteger(amountMinorUnits) || amountMinorUnits <= 0) {
		return {
			allowed: false,
			reason: 'invalid-amount',
			summary: 'Сумма оплаты должна быть целым положительным числом minor units.'
		};
	}
	const balanceBeforeMinorUnits = cashBalanceForCharacter(
		cashByCharacter,
		characterId
	);
	if (balanceBeforeMinorUnits < amountMinorUnits) {
		return {
			allowed: false,
			reason: 'insufficient-funds',
			summary: 'Недостаточно денег.'
		};
	}
	return {
		allowed: true,
		trace: {
			characterId,
			amountMinorUnits,
			balanceBeforeMinorUnits,
			balanceAfterMinorUnits: balanceBeforeMinorUnits - amountMinorUnits
		}
	};
}

export function applyNarrativeCashSpend(
	cashByCharacter: Record<string, number>,
	evaluation: Extract<NarrativeCashSpendEvaluation, {allowed: true}>
) {
	return {
		...cashByCharacter,
		[evaluation.trace.characterId]: evaluation.trace.balanceAfterMinorUnits
	};
}
