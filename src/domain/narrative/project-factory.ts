import {NarrativeProject, narrativeProjectSchemaVersion} from './project';
import {NarrativeProjectTemplate} from './template';

function fallbackId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createNarrativeId(prefix: string) {
	const uuid =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID()
			: fallbackId();

	return `${prefix}-${uuid}`;
}

export function createNarrativeProject(
	hostStoryId: string,
	name: string,
	template: NarrativeProjectTemplate
): NarrativeProject {
	const now = new Date().toISOString();
	const firstPeriod = template.periods[0];

	if (!firstPeriod) {
		throw new Error('Narrative project template must define at least one period');
	}

	return {
		schemaVersion: narrativeProjectSchemaVersion,
		projectId: createNarrativeId('project'),
		hostStoryId,
		name,
		createdAt: now,
		updatedAt: now,
		template,
		locations: [],
		scenes: [],
		characters: [],
		itemDefinitions: [],
		itemInstances: [],
		behaviorProfiles: [],
		routineRules: [],
		scheduleExceptions: [],
		storyNodes: [],
		storyConnections: [],
		memories: [],
		relationships: [],
		pendingReactions: [],
		mindStates: [],
		editor: {
			selectedDay: 1,
			selectedPeriodId: firstPeriod.id,
			selectedMinuteOfDay: firstPeriod.startMinute,
			workspaceMode: 'story',
			storyCanvas: {
				activeCanvasId: 'story-root',
				viewport: {x: 0, y: 0, zoom: 1},
				nodes: []
			},
			worldTimeViewport: {
				centerAbsoluteMinute: firstPeriod.startMinute,
				pixelsPerHour: 0.4,
				scrollY: 0
			}
		},
		simulation: {
			day: 1,
			minuteOfDay: firstPeriod.startMinute,
			activeBehaviorProfileByCharacter: {},
			actualLocationByCharacter: {}
		}
	};
}
