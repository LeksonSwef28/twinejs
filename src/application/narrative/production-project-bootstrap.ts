import {NarrativeProject} from '../../domain/narrative/project';
import {
	computerClubCycleProjectId,
	create93DaysComputerClubCycleProject
} from '../../domain/narrative/content/93-days-computer-club-cycle';

/**
 * A64 production bootstrap is intentionally narrower than import/migration.
 * It may only replace a genuinely blank authored project so existing author
 * data is never overwritten as a side effect of choosing the current slice.
 */
export function narrativeProjectCanLoad93DaysProductionStarter(
	project: NarrativeProject
) {
	const authoredCollections = [
		project.locations,
		project.scenes,
		project.travelRoutes ?? [],
		project.sleepOptions ?? [],
		project.characters,
		project.itemDefinitions,
		project.itemInstances,
		project.objectiveFacts,
		project.claims,
		project.initialKnowledge,
		project.behaviorProfiles,
		project.routineRules,
		project.scheduleExceptions,
		project.storyNodes,
		project.storyConnections,
		project.narrativeMoves,
		project.interactionTemplates,
		project.reactionCandidateSets
	];

	return (
		project.projectId !== computerClubCycleProjectId &&
		project.playerStart === undefined &&
		project.economy === undefined &&
		authoredCollections.every(collection => collection.length === 0)
	);
}

/**
 * Rebind the current verified 93 Days production composition to the edited
 * Twine host Story. The Computer Club project composes the earlier A63/A67
 * slices and its identity opts into all matching Player-time orchestration.
 */
export function create93DaysProductionProjectForCurrentHost(
	currentProject: NarrativeProject
): NarrativeProject {
	const production = create93DaysComputerClubCycleProject();
	return {
		...production,
		hostStoryId: currentProject.hostStoryId,
		name: currentProject.name,
		createdAt: currentProject.createdAt,
		updatedAt: new Date().toISOString()
	};
}
