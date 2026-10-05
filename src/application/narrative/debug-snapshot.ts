import {effectiveItemPlacement} from '../../domain/narrative/carrying';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	scheduledStoryWork,
	simulationKernelAbsoluteMinute
} from '../../domain/narrative/simulation-kernel';
import {
	narrativeRuntimeItemInstances,
	narrativeRuntimeStoryNodes
} from './living-simulation';

export interface NarrativeDebugItemSnapshot {
	id: string;
	name: string;
	placement: string;
}

export interface NarrativeDebugCharacterSnapshot {
	id: string;
	name: string;
	actualLocationId?: string;
	actualLocationName?: string;
	behaviorProfileId?: string;
	body?: NarrativeProject['simulation']['bodyByCharacter'][string];
	injuries: NarrativeProject['injuriesByCharacter'][string];
	items: NarrativeDebugItemSnapshot[];
	knowledgeCount: number;
	memoryCount: number;
	pendingReactionCount: number;
	mood?: string;
}

export interface NarrativeDebugStorySnapshot {
	id: string;
	title: string;
	authoredState: NarrativeProject['storyNodes'][number]['activationState'];
	runtimeState: NarrativeProject['storyNodes'][number]['activationState'];
	day?: number;
	minuteOfDay?: number;
	locationId?: string;
}

export interface NarrativeSimulationDebugSnapshot {
	playhead: {day: number; minuteOfDay: number};
	characters: NarrativeDebugCharacterSnapshot[];
	story: NarrativeDebugStorySnapshot[];
	activeExecutions: NarrativeProject['activeStoryExecutions'];
	recentOccurrences: NarrativeProject['runtimeOccurrences'];
	upcomingWork: ReturnType<typeof scheduledStoryWork>;
}

function itemName(project: NarrativeProject, itemId: string) {
	const item = project.itemInstances.find(candidate => candidate.id === itemId);
	if (!item) {
		return itemId;
	}
	const definition = project.itemDefinitions.find(
		candidate => candidate.id === item.definitionId
	);
	return item.nameOverride ?? definition?.name ?? item.id;
}

function runtimePlacementLabel(project: NarrativeProject, itemId: string) {
	const item = project.itemInstances.find(candidate => candidate.id === itemId);
	if (!item) {
		return 'unknown';
	}
	const placement = effectiveItemPlacement(item, project.itemPlacementOverrides);
	switch (placement.type) {
		case 'unplaced':
			return 'не размещён';
		case 'location': {
			const location = project.locations.find(candidate => candidate.id === placement.locationId);
			return `локация: ${location?.name ?? placement.locationId}`;
		}
		case 'character': {
			const character = project.characters.find(
				candidate => candidate.id === placement.characterId
			);
			return `у персонажа: ${character?.name ?? placement.characterId}`;
		}
		case 'pockets': {
			const character = project.characters.find(
				candidate => candidate.id === placement.characterId
			);
			return `в карманах: ${character?.name ?? placement.characterId}`;
		}
		case 'container':
			return `в контейнере: ${itemName(project, placement.containerInstanceId)}`;
	}
}

export function createNarrativeSimulationDebugSnapshot(
	project: NarrativeProject,
	occurrenceLimit = 30,
	upcomingLimit = 30
): NarrativeSimulationDebugSnapshot {
	const runtimeItems = narrativeRuntimeItemInstances(project);
	const runtimeStory = narrativeRuntimeStoryNodes(project);
	const currentAbsolute = simulationKernelAbsoluteMinute({
		day: project.simulation.day,
		minuteOfDay: project.simulation.minuteOfDay
	});
	const upcomingWork = scheduledStoryWork(project.storyNodes)
		.filter(
			work => simulationKernelAbsoluteMinute(work.moment) >= currentAbsolute
		)
		.sort(
			(a, b) =>
				simulationKernelAbsoluteMinute(a.moment) -
					simulationKernelAbsoluteMinute(b.moment) || a.id.localeCompare(b.id)
		)
		.slice(0, Math.max(0, upcomingLimit));

	const characters = [...project.characters]
		.sort((a, b) => a.id.localeCompare(b.id))
		.map(character => {
			const actualLocationId =
				project.simulation.actualLocationByCharacter[character.id];
			const actualLocation = project.locations.find(
				location => location.id === actualLocationId
			);
			const mind = project.mindStates.find(
				candidate => candidate.characterId === character.id
			);
			const items = runtimeItems
				.filter(
					item =>
						item.placement.type === 'character' &&
						item.placement.characterId === character.id
				)
				.map(item => ({
					id: item.id,
					name: itemName(project, item.id),
					placement: runtimePlacementLabel(project, item.id)
				}))
				.sort((a, b) => a.id.localeCompare(b.id));
			return {
				id: character.id,
				name: character.name,
				actualLocationId,
				actualLocationName: actualLocation?.name,
				behaviorProfileId:
					project.simulation.activeBehaviorProfileByCharacter[character.id],
				body: project.simulation.bodyByCharacter[character.id],
				injuries: project.injuriesByCharacter[character.id] ?? [],
				items,
				knowledgeCount: project.simulation.characterKnowledge.filter(
					state => state.characterId === character.id
				).length,
				memoryCount: project.memories.filter(
					memory => memory.characterId === character.id
				).length,
				pendingReactionCount: project.pendingReactions.filter(
					reaction => reaction.characterId === character.id
				).length,
				mood: mind?.mood
			};
		});

	const story = runtimeStory
		.map(runtimeNode => {
			const authored = project.storyNodes.find(node => node.id === runtimeNode.id)!;
			return {
				id: runtimeNode.id,
				title: runtimeNode.title,
				authoredState: authored.activationState,
				runtimeState: runtimeNode.activationState,
				day: runtimeNode.placement?.day,
				minuteOfDay: runtimeNode.placement?.minuteOfDay,
				locationId: runtimeNode.placement?.locationId
			};
		})
		.sort((a, b) => a.id.localeCompare(b.id));

	return {
		playhead: {
			day: project.simulation.day,
			minuteOfDay: project.simulation.minuteOfDay
		},
		characters,
		story,
		activeExecutions: [...project.activeStoryExecutions].sort((a, b) =>
			a.id.localeCompare(b.id)
		),
		recentOccurrences: project.runtimeOccurrences.slice(
			-Math.max(0, occurrenceLimit)
		),
		upcomingWork
	};
}
