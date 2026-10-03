import {NarrativeProject} from '../../domain/narrative/project';
import {
	create93DaysPlayerNpcSocialDeliveryProject,
	playerNpcSocialDeliveryProjectId
} from '../../domain/narrative/content/93-days-player-npc-social-delivery';

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
		project.projectId !== playerNpcSocialDeliveryProjectId &&
		project.playerStart === undefined &&
		project.economy === undefined &&
		authoredCollections.every(collection => collection.length === 0)
	);
}

/**
 * Rebind the verified A63 production content to the currently edited Twine
 * host Story without changing the A63 project identity that opts into its
 * Player-time orchestration.
 */
export function create93DaysProductionProjectForCurrentHost(
	currentProject: NarrativeProject
): NarrativeProject {
	const production = create93DaysPlayerNpcSocialDeliveryProject();
	return {
		...production,
		hostStoryId: currentProject.hostStoryId,
		name: currentProject.name,
		createdAt: currentProject.createdAt,
		updatedAt: new Date().toISOString()
	};
}
