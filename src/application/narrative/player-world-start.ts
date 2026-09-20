import {setNarrativeCharacterActualLocation} from './living-simulation';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export type NarrativePlayerWorldStartResult =
	| {
			status: 'applied' | 'skipped';
			session: NarrativePlayerSession;
	  }
	| {
			status: 'rejected';
			session: NarrativePlayerSession;
		summary: string;
	  };

function authoredStartPlacements(session: NarrativePlayerSession) {
	const start = session.currentProject.playerStart;
	if (!start) {
		return [];
	}
	const byCharacter = new Map<string, string>(
		Object.entries(start.initialActualPresenceByCharacter ?? {})
	);
	byCharacter.set(start.characterId, start.locationId);
	return [...byCharacter.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Explicit post-materialization world-start boundary.
 *
 * A52 still compiles a fresh empty Actual Presence map. Only explicit authored
 * placements are applied. Existing runtime presence always wins, so loading or
 * restoring a progressed session never teleports any character back to start.
 */
export function bootstrapNarrativePlayerWorldStart(
	session: NarrativePlayerSession
): NarrativePlayerWorldStartResult {
	const placements = authoredStartPlacements(session);
	if (placements.length === 0) {
		return {status: 'skipped', session};
	}

	const characterIds = new Set(
		session.currentProject.characters.map(character => character.id)
	);
	const locationIds = new Set(
		session.currentProject.locations.map(location => location.id)
	);
	if (
		placements.some(
			([characterId, locationId]) =>
				!characterIds.has(characterId) || !locationIds.has(locationId)
		)
	) {
		return {
			status: 'rejected',
			session,
			summary:
				'Authored world start points to an unknown character or location.'
		};
	}

	let next = session.currentProject;
	let changed = false;
	for (const [characterId, locationId] of placements) {
		if (next.simulation.actualLocationByCharacter[characterId]) {
			continue;
		}
		next = setNarrativeCharacterActualLocation(next, characterId, locationId);
		changed = true;
	}
	if (!changed) {
		return {status: 'skipped', session};
	}

	const replacement = replaceNarrativePlayerSessionProject(session, next);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			summary: 'Player session rejected the authored world-start state.'
		};
	}
	return {status: 'applied', session: replacement.session};
}
