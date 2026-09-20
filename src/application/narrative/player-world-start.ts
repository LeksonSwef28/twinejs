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

/**
 * A56 explicit post-materialization world-start boundary.
 *
 * A52 still compiles a fresh empty Actual Presence map. Only projects that
 * author playerStart opt into this one-time placement. Existing runtime
 * presence always wins, so loading/restoring a progressed session never
 * teleports the player back to the authored start.
 */
export function bootstrapNarrativePlayerWorldStart(
	session: NarrativePlayerSession
): NarrativePlayerWorldStartResult {
	const start = session.currentProject.playerStart;
	if (!start) {
		return {status: 'skipped', session};
	}
	if (
		!session.currentProject.characters.some(
			character => character.id === start.characterId
		) ||
		!session.currentProject.locations.some(
			location => location.id === start.locationId
		)
	) {
		return {
			status: 'rejected',
			session,
			summary: 'Authored player start points to an unknown character or location.'
		};
	}
	if (
		session.currentProject.simulation.actualLocationByCharacter[start.characterId]
	) {
		return {status: 'skipped', session};
	}

	const located = setNarrativeCharacterActualLocation(
		session.currentProject,
		start.characterId,
		start.locationId
	);
	const replacement = replaceNarrativePlayerSessionProject(session, located);
	if (replacement.status !== 'updated') {
		return {
			status: 'rejected',
			session,
			summary: 'Player session rejected the authored world-start state.'
		};
	}
	return {status: 'applied', session: replacement.session};
}
