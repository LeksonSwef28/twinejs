import {minutesPerDay} from '../../domain/narrative/calendar';
import {CanvasEntityReference} from '../../domain/narrative/editor';
import {NarrativeProject, NarrativeWorkspaceMode} from '../../domain/narrative/project';
import {RoutineRule, ScheduleException} from '../../domain/narrative/schedule';
import {StoryBrainEntityRef} from '../../domain/narrative/story-brain';
import {routineWindowForDay} from '../../domain/narrative/world-time';
import {StoryBrainFinding} from './story-brain-query';

export interface StoryBrainDiagnosticNavigation {
	focus: StoryBrainEntityRef;
	workspace: NarrativeWorkspaceMode;
	canvasEntityRef?: CanvasEntityReference;
	worldTimeCenterAbsoluteMinute?: number;
}

function focusExists(project: NarrativeProject, focus: StoryBrainEntityRef) {
	switch (focus.kind) {
		case 'story-node':
			return project.storyNodes.some(node => node.id === focus.id);
		case 'move':
			return project.narrativeMoves.some(move => move.id === focus.id);
		case 'claim':
			return project.claims.some(claim => claim.id === focus.id);
		case 'character':
			return project.characters.some(character => character.id === focus.id);
		case 'item':
			return project.itemInstances.some(item => item.id === focus.id);
	}
}

function canvasEntityRefForFocus(
	project: NarrativeProject,
	focus: StoryBrainEntityRef
): CanvasEntityReference | undefined {
	switch (focus.kind) {
		case 'story-node':
			return {type: 'storyNode', id: focus.id};
		case 'move': {
			const move = project.narrativeMoves.find(candidate => candidate.id === focus.id);
			return move ? {type: 'storyNode', id: move.storyNodeId} : undefined;
		}
		case 'character':
			return {type: 'character', id: focus.id};
		case 'item':
			return {type: 'item', id: focus.id};
		case 'claim':
			return undefined;
	}
}

function navigationForFocus(
	project: NarrativeProject,
	focus: StoryBrainEntityRef | undefined
): StoryBrainDiagnosticNavigation | undefined {
	if (!focus || !focusExists(project, focus)) {
		return undefined;
	}
	return {
		focus,
		workspace: 'story',
		canvasEntityRef: canvasEntityRefForFocus(project, focus)
	};
}

function worldTimeFocus(
	project: NarrativeProject,
	focus: StoryBrainEntityRef,
	centerAbsoluteMinute: number
): StoryBrainDiagnosticNavigation | undefined {
	if (!focusExists(project, focus)) {
		return undefined;
	}
	return {
		focus,
		workspace: 'world-time',
		worldTimeCenterAbsoluteMinute: centerAbsoluteMinute
	};
}

function firstRoutineCenter(project: NarrativeProject, rule: RoutineRule) {
	const lastDay = Math.min(rule.activeRange.toDay ?? project.template.dayCount, project.template.dayCount);
	for (let day = Math.max(1, rule.activeRange.fromDay); day <= lastDay; day += 1) {
		const window = routineWindowForDay(
			rule,
			day,
			project.template.periods,
			project.template.day1Weekday
		);
		if (window) {
			return Math.floor((window.start + window.end) / 2);
		}
	}
	return (Math.max(1, rule.activeRange.fromDay) - 1) * minutesPerDay;
}

function firstExceptionCenter(project: NarrativeProject, exception: ScheduleException) {
	const day = Math.max(1, Math.min(project.template.dayCount, exception.activeRange.fromDay));
	const dayStart = (day - 1) * minutesPerDay;
	const window = exception.timeWindow;
	if (window?.type === 'exact') {
		const endOffset = window.endDayOffset ?? (window.endMinute < window.startMinute ? 1 : 0);
		return Math.floor(
			(dayStart + window.startMinute + dayStart + endOffset * minutesPerDay + window.endMinute) /
				2
		);
	}
	const periodId = window?.type === 'period' ? window.periodId : exception.periodId;
	const period = project.template.periods.find(candidate => candidate.id === periodId);
	if (!period) {
		return dayStart;
	}
	const endOffset = period.endMinute <= period.startMinute ? 1 : 0;
	return Math.floor(
		(dayStart + period.startMinute + dayStart + endOffset * minutesPerDay + period.endMinute) /
			2
	);
}

/**
 * Maps a read-only diagnostic to an existing authoring source. Time-specific
 * findings jump to WORLD/TIME; Story semantics stay in STORY. Navigation changes
 * only the editor View Cursor and never advances the Simulation Playhead.
 */
export function storyBrainNavigationForFinding(
	project: NarrativeProject,
	finding: StoryBrainFinding
): StoryBrainDiagnosticNavigation | undefined {
	if (finding.kind === 'routine-overlap') {
		return worldTimeFocus(
			project,
			{kind: 'character', id: finding.characterId},
			Math.floor((finding.overlap.start + finding.overlap.end) / 2)
		);
	}

	if (
		finding.kind === 'story-schedule-location-conflict' ||
		finding.kind === 'story-participant-schedule-gap'
	) {
		const focus: StoryBrainEntityRef = finding.storyNodeId
			? {kind: 'story-node', id: finding.storyNodeId}
			: {kind: 'character', id: finding.characterId ?? ''};
		return finding.centerAbsoluteMinute === undefined
			? undefined
			: worldTimeFocus(project, focus, finding.centerAbsoluteMinute);
	}

	if (finding.kind !== 'broken-authored-reference') {
		if ('moveId' in finding && finding.moveId) {
			return navigationForFocus(project, {kind: 'move', id: finding.moveId});
		}
		if ('storyNodeId' in finding && finding.storyNodeId) {
			return navigationForFocus(project, {
				kind: 'story-node',
				id: finding.storyNodeId
			});
		}
		if ('characterId' in finding && finding.characterId) {
			return navigationForFocus(project, {
				kind: 'character',
				id: finding.characterId
			});
		}
		return undefined;
	}

	switch (finding.ownerKind) {
		case 'story-node':
			return navigationForFocus(project, {kind: 'story-node', id: finding.ownerId});
		case 'narrative-move':
			return navigationForFocus(project, {kind: 'move', id: finding.ownerId});
		case 'claim':
			return navigationForFocus(project, {kind: 'claim', id: finding.ownerId});
		case 'character':
			return navigationForFocus(project, {kind: 'character', id: finding.ownerId});
		case 'item-instance':
			return navigationForFocus(project, {kind: 'item', id: finding.ownerId});
		case 'routine-rule': {
			const rule = project.routineRules.find(candidate => candidate.id === finding.ownerId);
			return rule
				? worldTimeFocus(
						project,
						{kind: 'character', id: rule.characterId},
						firstRoutineCenter(project, rule)
					)
				: undefined;
		}
		case 'schedule-exception': {
			const exception = project.scheduleExceptions.find(
				candidate => candidate.id === finding.ownerId
			);
			return exception
				? worldTimeFocus(
						project,
						{kind: 'character', id: exception.characterId},
						firstExceptionCenter(project, exception)
					)
				: undefined;
		}
		default:
			return undefined;
	}
}
