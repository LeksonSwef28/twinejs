import {NarrativeProject} from '../../domain/narrative/project';
import {
	StoryParticipantWorldContext,
	storyWorldNavigationContext
} from '../../domain/narrative/workspace-navigation';
import {PreviewScenario, createPreviewScenario} from './preview-laboratory';

export type PreviewFromHereFocus =
	| {type: 'story-node'; storyNodeId: string}
	| {type: 'view-moment'; day: number; minuteOfDay: number};

export type PreviewFromHereAlignment =
	| 'aligned'
	| 'different-moment'
	| 'unscheduled';

export interface PreviewFromHereMoment {
	day: number;
	minuteOfDay: number;
}

export interface PreviewFromHereStoryContext {
	type: 'story-node';
	storyNodeId: string;
	title: string;
	alignment: PreviewFromHereAlignment;
	authoredDay?: number;
	authoredMinuteOfDay?: number;
	authoredLocationId?: string;
	participantIds: string[];
	moveIds: string[];
	simulationMoment: PreviewFromHereMoment;
	actualPresenceComparableToStoryMoment: boolean;
	participants: StoryParticipantWorldContext[];
}

export interface PreviewFromHereViewContext {
	type: 'view-moment';
	alignment: Exclude<PreviewFromHereAlignment, 'unscheduled'>;
	viewMoment: PreviewFromHereMoment;
	simulationMoment: PreviewFromHereMoment;
}

export type PreviewFromHereContext =
	| PreviewFromHereStoryContext
	| PreviewFromHereViewContext;

export interface PreviewFromHereRequest {
	requestId: number;
	focus: PreviewFromHereFocus;
	context: PreviewFromHereContext;
}

export interface PreviewFromHereResult {
	scenario: PreviewScenario;
	context: PreviewFromHereContext;
	preferredMoveId?: string;
}

function assertViewMoment(project: NarrativeProject, day: number, minuteOfDay: number) {
	if (!Number.isInteger(day) || day < 1 || day > project.template.dayCount) {
		throw new RangeError('Preview-from-here day is outside the project template.');
	}
	if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= 24 * 60) {
		throw new RangeError('Preview-from-here minuteOfDay must be between 0 and 1439.');
	}
}

/**
 * Builds read-only authoring context for Preview from here. This function never
 * writes the requested focus into runtime state: View Cursor, authored Story
 * placement and live Simulation Playhead remain distinct concepts.
 */
export function inspectPreviewFromHereFocus(
	project: NarrativeProject,
	focus: PreviewFromHereFocus
): PreviewFromHereContext {
	const simulationMoment = {
		day: project.simulation.day,
		minuteOfDay: project.simulation.minuteOfDay
	};

	if (focus.type === 'view-moment') {
		assertViewMoment(project, focus.day, focus.minuteOfDay);
		return {
			type: 'view-moment',
			alignment:
				focus.day === simulationMoment.day &&
				focus.minuteOfDay === simulationMoment.minuteOfDay
					? 'aligned'
					: 'different-moment',
			viewMoment: {day: focus.day, minuteOfDay: focus.minuteOfDay},
			simulationMoment
		};
	}

	const node = project.storyNodes.find(candidate => candidate.id === focus.storyNodeId);
	if (!node) {
		throw new Error(`Unknown Preview-from-here Story node: ${focus.storyNodeId}`);
	}
	const navigation = storyWorldNavigationContext(
		node,
		project.narrativeMoves,
		project.simulation.actualLocationByCharacter,
		simulationMoment
	);
	const exactAuthoredMoment =
		node.placement?.day !== undefined && node.placement.minuteOfDay !== undefined;
	const alignment: PreviewFromHereAlignment = !exactAuthoredMoment
		? 'unscheduled'
		: navigation.actualPresenceComparableToStoryMoment
			? 'aligned'
			: 'different-moment';

	return {
		type: 'story-node',
		storyNodeId: node.id,
		title: node.title,
		alignment,
		authoredDay: node.placement?.day,
		authoredMinuteOfDay: node.placement?.minuteOfDay,
		authoredLocationId: navigation.authoredLocationId,
		participantIds: navigation.participantIds,
		moveIds: navigation.moveIds,
		simulationMoment,
		actualPresenceComparableToStoryMoment:
			navigation.actualPresenceComparableToStoryMoment,
		participants: navigation.participants
	};
}

export function createPreviewFromHereRequest(
	project: NarrativeProject,
	requestId: number,
	focus: PreviewFromHereFocus
): PreviewFromHereRequest {
	return {
		requestId,
		focus,
		context: inspectPreviewFromHereFocus(project, focus)
	};
}

/**
 * Creates the same fresh live-sourced sandbox as the normal Preview entry path,
 * plus a separate read-only authoring focus descriptor. No focus field is
 * written into the Narrative Project or runtime projection.
 */
export function createPreviewFromHereScenario(
	source: NarrativeProject,
	focus: PreviewFromHereFocus,
	id = 'preview-main',
	name = 'From here'
): PreviewFromHereResult {
	const context = inspectPreviewFromHereFocus(source, focus);
	const scenario = createPreviewScenario(source, id, name);
	return {
		scenario,
		context,
		preferredMoveId:
			context.type === 'story-node' ? context.moveIds[0] : undefined
	};
}
