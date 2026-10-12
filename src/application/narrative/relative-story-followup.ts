import {NarrativeProject} from '../../domain/narrative/project';
import {StoryPlacement} from '../../domain/narrative/story';

export type RelativeStoryFollowupPlan =
	| {status: 'blocked'; reason: string}
	| {
		status: 'ready';
		placement: StoryPlacement;
		plannedDay: number;
		plannedMinuteOfDay: number;
		hasExplicitOutcomeUnlock: boolean;
	};

const minutesPerDay = 24 * 60;

/**
 * An authoring-time calculation ONLY. Reuses the existing exact Story placement
 * model and never runs the Simulation Playhead or schedules an Outcome effect.
 * This is not a delayed knowledge delivery system.
 */
export function planRelativeStoryFollowup(
	project: NarrativeProject,
	sourceStoryNodeId: string,
	followupStoryNodeId: string,
	delayDays: number
): RelativeStoryFollowupPlan {
	if (!sourceStoryNodeId || !followupStoryNodeId || sourceStoryNodeId === followupStoryNodeId) {
		return {status: 'blocked', reason: 'Выберите две разные существующие сцены.'};
	}
	const source = project.storyNodes.find(node => node.id === sourceStoryNodeId);
	const target = project.storyNodes.find(node => node.id === followupStoryNodeId);
	if (!source || !target) {
		return {status: 'blocked', reason: 'Исходная сцена или продолжение не найдены.'};
	}
	if (!Number.isInteger(delayDays) || delayDays < 1) {
		return {status: 'blocked', reason: 'Задержка должна быть целым числом дней от 1.'};
	}
	const day = source.placement?.day;
	const minuteOfDay = source.placement?.minuteOfDay;
	if (
		!Number.isInteger(day) || day === undefined || day < 1 ||
		day > project.template.dayCount ||
		!Number.isInteger(minuteOfDay) || minuteOfDay === undefined ||
		minuteOfDay < 0 || minuteOfDay >= minutesPerDay
	) {
		return {
			status: 'blocked',
			reason: 'Сначала назначьте исходной сцене точные день и время.'
		};
	}
	const plannedDay = day + delayDays;
	if (plannedDay > project.template.dayCount) {
		return {
			status: 'blocked',
			reason: `Продолжение попадёт на день ${plannedDay}, за границу проекта (${project.template.dayCount} дней).`
		};
	}
	if (target.placement?.day !== undefined || target.placement?.minuteOfDay !== undefined) {
		return {
			status: 'blocked',
			reason: 'У продолжения уже назначен день или время. Сначала измените его вручную; перезаписи не будет.'
		};
	}

	const hasExplicitOutcomeUnlock = project.narrativeMoves.some(move =>
		move.storyNodeId === sourceStoryNodeId &&
		move.outcomes.some(outcome =>
			(outcome.effects ?? []).some(effect =>
				effect.type === 'story-node-set-state' &&
				effect.storyNodeId === followupStoryNodeId &&
				effect.state === 'available'
			)
		)
	);
	return {
		status: 'ready',
		placement: {
			...target.placement,
			day: plannedDay,
			minuteOfDay
		},
		plannedDay,
		plannedMinuteOfDay: minuteOfDay,
		hasExplicitOutcomeUnlock
	};
}
