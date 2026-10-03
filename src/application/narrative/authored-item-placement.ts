import {
	NarrativeCharacter,
	NarrativeLocation
} from '../../domain/narrative/entities';
import {ItemPlacement} from '../../domain/narrative/items';
import {NarrativeProject} from '../../domain/narrative/project';

export type ResolvedAuthoredItemPlacement =
	| {type: 'unplaced'}
	| {
			type: 'location';
			status: 'resolved';
			locationId: string;
			location: NarrativeLocation;
	  }
	| {
			type: 'location';
			status: 'unresolved';
			locationId: string;
	  }
	| {
			type: 'character';
			status: 'resolved';
			characterId: string;
			character: NarrativeCharacter;
	  }
	| {
			type: 'character';
			status: 'unresolved';
			characterId: string;
	  };

export type AuthoredItemPlacementTargetValidation =
	| {status: 'valid'}
	| {status: 'missing-location'; locationId: string}
	| {status: 'missing-character'; characterId: string};

export function authoredItemPlacementEquals(
	left: ItemPlacement,
	right: ItemPlacement
): boolean {
	if (left.type !== right.type) {
		return false;
	}

	switch (left.type) {
		case 'unplaced':
			return true;
		case 'location':
			return right.type === 'location' && left.locationId === right.locationId;
		case 'character':
			return (
				right.type === 'character' && left.characterId === right.characterId
			);
	}
}

export function resolveAuthoredItemPlacement(
	project: NarrativeProject,
	placement: ItemPlacement
): ResolvedAuthoredItemPlacement {
	switch (placement.type) {
		case 'unplaced':
			return {type: 'unplaced'};
		case 'location': {
			const location = project.locations.find(
				candidate => candidate.id === placement.locationId
			);
			return location
				? {
						type: 'location',
						status: 'resolved',
						locationId: placement.locationId,
						location
					}
				: {
						type: 'location',
						status: 'unresolved',
						locationId: placement.locationId
					};
		}
		case 'character': {
			const character = project.characters.find(
				candidate => candidate.id === placement.characterId
			);
			return character
				? {
						type: 'character',
						status: 'resolved',
						characterId: placement.characterId,
						character
					}
				: {
						type: 'character',
						status: 'unresolved',
						characterId: placement.characterId
					};
		}
	}
}

export function validateAuthoredItemPlacementTarget(
	project: NarrativeProject,
	placement: ItemPlacement
): AuthoredItemPlacementTargetValidation {
	switch (placement.type) {
		case 'unplaced':
			return {status: 'valid'};
		case 'location':
			return project.locations.some(
				location => location.id === placement.locationId
			)
				? {status: 'valid'}
				: {
						status: 'missing-location',
						locationId: placement.locationId
					};
		case 'character':
			return project.characters.some(
				character => character.id === placement.characterId
			)
				? {status: 'valid'}
				: {
						status: 'missing-character',
						characterId: placement.characterId
					};
	}
}
