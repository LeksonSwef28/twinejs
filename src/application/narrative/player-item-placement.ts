import {ItemRuntimePlacement} from '../../domain/narrative/items';
import {applyNarrativeItemRuntimePlacement} from './physical';
import {narrativeRuntimeItemInstances} from './living-simulation';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerItemPlacementTarget =
	| {type: 'character'}
	| {type: 'pockets'}
	| {type: 'container'; containerInstanceId: string};

export type NarrativePlayerItemPlacementResult =
	| {
			status: 'applied';
			session: NarrativePlayerSession;
			itemInstanceId: string;
			placement: ItemRuntimePlacement;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
			itemInstanceId: string;
			reason:
				| 'unknown-character'
				| 'unknown-item'
				| 'not-owned'
				| 'invalid-target'
				| 'placement-blocked'
				| 'session-replacement';
			summary: string;
	  };

function runtimeOwnedBy(
	session: NarrativePlayerSession,
	itemInstanceId: string,
	characterId: string
) {
	const item = narrativeRuntimeItemInstances(session.currentProject).find(
		instance => instance.id === itemInstanceId
	);
	return Boolean(
		item &&
			item.placement.type === 'character' &&
			item.placement.characterId === characterId
	);
}

/**
 * Player packing/unpacking bridge.
 *
 * It never acquires remote items: the source item and any target container must
 * already resolve to the same player. Capacity/cycle/weight rules remain owned
 * by applyNarrativeItemRuntimePlacement -> carrying.ts.
 */
export function executeNarrativePlayerItemPlacement(
	session: NarrativePlayerSession,
	itemInstanceId: string,
	target: NarrativePlayerItemPlacementTarget,
	playerCharacterId: string
): NarrativePlayerItemPlacementResult {
	if (
		!session.currentProject.characters.some(
			character => character.id === playerCharacterId
		)
	) {
		return {
			status: 'rejected',
			session,
			itemInstanceId,
			reason: 'unknown-character',
			summary: 'Игровой персонаж не найден.'
		};
	}
	if (
		!session.currentProject.itemInstances.some(
			instance => instance.id === itemInstanceId
		)
	) {
		return {
			status: 'rejected',
			session,
			itemInstanceId,
			reason: 'unknown-item',
			summary: 'Предмет не найден.'
		};
	}
	if (!runtimeOwnedBy(session, itemInstanceId, playerCharacterId)) {
		return {
			status: 'rejected',
			session,
			itemInstanceId,
			reason: 'not-owned',
			summary: 'Перекладывать можно только предмет, который уже у персонажа.'
		};
	}
	if (
		target.type === 'container' &&
		(!target.containerInstanceId ||
			!runtimeOwnedBy(
				session,
				target.containerInstanceId,
				playerCharacterId
			))
	) {
		return {
			status: 'rejected',
			session,
			itemInstanceId,
			reason: 'invalid-target',
			summary: 'Контейнер должен находиться у игрового персонажа.'
		};
	}

	const placement: ItemRuntimePlacement =
		target.type === 'character'
			? {type: 'character', characterId: playerCharacterId}
			: target.type === 'pockets'
				? {type: 'pockets', characterId: playerCharacterId}
				: {
						type: 'container',
						containerInstanceId: target.containerInstanceId
					};
	const applied = applyNarrativeItemRuntimePlacement(
		session.currentProject,
		itemInstanceId,
		placement
	);
	if (!applied.applied) {
		return {
			status: 'rejected',
			session,
			itemInstanceId,
			reason: 'placement-blocked',
			summary: applied.blockers.join(' ')
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
			itemInstanceId,
			reason: 'session-replacement',
			summary: 'Player session rejected the canonical item-placement result.'
		};
	}
	return {
		status: 'applied',
		session: replacement.session,
		itemInstanceId,
		placement
	};
}
