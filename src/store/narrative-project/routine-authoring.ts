import {NarrativeProjectCommand} from '../../application/narrative/commands';
import {
	NarrativeConditionDefinition,
	NarrativeGuardDefinition,
	NarrativeOutcomeDefinition,
	narrativeMoveIsStructurallyValid
} from '../../domain/narrative/interaction';
import {NarrativeProject} from '../../domain/narrative/project';
import {RoutineRule} from '../../domain/narrative/schedule';
import {
	StoryCommunicationDefinition,
	storyCommunicationIsValid,
	StoryNodeKind,
	StoryRuntimePolicyDefinition
} from '../../domain/narrative/story';
import {
	NarrativeProjectHistoryState,
	narrativeProjectHistoryReducer
} from './reducer';

export type RoutineAuthoringCommand =
	| {type: 'routine/add'; rule: RoutineRule}
	| {type: 'routine/update'; rule: RoutineRule}
	| {type: 'routine/remove'; id: string};

export interface StoryMetadataAuthoringCommand {
	type: 'story/updateAuthoring';
	id: string;
	kind: StoryNodeKind;
	title: string;
	description?: string;
	primaryCharacterId?: string;
	participantIds: string[];
	communication?: StoryCommunicationDefinition;
	runtimePolicy?: StoryRuntimePolicyDefinition;
}

export type MoveConditionAuthoringCommand =
	| {
			type: 'move/addGuard';
			moveId: string;
			guard: NarrativeGuardDefinition;
	  }
	| {type: 'move/removeGuard'; moveId: string; guardId: string}
	| {
			type: 'move/setConditionResolution';
			moveId: string;
			condition: NarrativeConditionDefinition;
			trueOutcomeId: string;
			falseOutcomeId: string;
			newFalseOutcome?: NarrativeOutcomeDefinition;
	  }
	| {type: 'move/setAutomaticResolution'; moveId: string; outcomeId: string};

export type NarrativeAuthoringCommand =
	| NarrativeProjectCommand
	| RoutineAuthoringCommand
	| StoryMetadataAuthoringCommand
	| MoveConditionAuthoringCommand;

export type NarrativeProjectAuthoringAction =
	| {type: 'execute'; command: NarrativeAuthoringCommand}
	| {type: 'undo'}
	| {type: 'redo'};

function dayIsValid(project: NarrativeProject, day: number) {
	return (
		Number.isInteger(day) &&
		day >= 1 &&
		day <= project.template.dayCount
	);
}

function minuteIsValid(minute: number) {
	return Number.isInteger(minute) && minute >= 0 && minute < 24 * 60;
}

function recurrenceIsValid(project: NarrativeProject, rule: RoutineRule) {
	switch (rule.recurrence.type) {
		case 'everyDay':
			return true;
		case 'weekly':
			return rule.recurrence.weekdays.length > 0;
		case 'everyNDays':
			return (
				Number.isInteger(rule.recurrence.every) &&
				rule.recurrence.every >= 1 &&
				dayIsValid(project, rule.recurrence.anchorDay)
			);
		case 'explicitDays':
			return (
				rule.recurrence.days.length > 0 &&
				rule.recurrence.days.every(day => dayIsValid(project, day))
			);
	}
}

function timeWindowIsValid(project: NarrativeProject, rule: RoutineRule) {
	const window = rule.timeWindow;
	if (window?.type === 'period') {
		return project.template.periods.some(period => period.id === window.periodId);
	}
	if (window?.type === 'exact') {
		return (
			minuteIsValid(window.startMinute) &&
			minuteIsValid(window.endMinute) &&
			(window.endDayOffset === undefined ||
				window.endDayOffset === 0 ||
				window.endDayOffset === 1)
		);
	}
	if (rule.periodId) {
		return project.template.periods.some(period => period.id === rule.periodId);
	}
	return false;
}

export function routineRuleIsAuthoringValid(
	project: NarrativeProject,
	rule: RoutineRule
) {
	const character = project.characters.find(
		candidate => candidate.id === rule.characterId
	);
	const profile = project.behaviorProfiles.find(
		candidate => candidate.id === rule.behaviorProfileId
	);
	if (!character || !profile || profile.characterId !== character.id) {
		return false;
	}
	if (
		!dayIsValid(project, rule.activeRange.fromDay) ||
		(rule.activeRange.toDay !== undefined &&
			(!dayIsValid(project, rule.activeRange.toDay) ||
				rule.activeRange.toDay < rule.activeRange.fromDay))
	) {
		return false;
	}
	if (!recurrenceIsValid(project, rule) || !timeWindowIsValid(project, rule)) {
		return false;
	}
	if (rule.absent) {
		return true;
	}
	return Boolean(
		rule.targetLocationId &&
			project.locations.some(location => location.id === rule.targetLocationId)
	);
}

function runtimePolicyIsAuthoringValid(
	policy: StoryRuntimePolicyDefinition | undefined
) {
	if (!policy) {
		return true;
	}
	const validOptionalMinutes = (value: number | undefined) =>
		value === undefined || (Number.isInteger(value) && value >= 0);
	return (
		validOptionalMinutes(policy.durationMinutes) &&
		validOptionalMinutes(policy.missAfterMinutes)
	);
}

function storyMetadataCommandIsAuthoringValid(
	project: NarrativeProject,
	command: StoryMetadataAuthoringCommand
) {
	if (
		!project.storyNodes.some(node => node.id === command.id) ||
		!command.title.trim() ||
		(command.communication !== undefined &&
			!storyCommunicationIsValid(command.communication)) ||
		!runtimePolicyIsAuthoringValid(command.runtimePolicy)
	) {
		return false;
	}
	if (
		command.primaryCharacterId &&
		!project.characters.some(character => character.id === command.primaryCharacterId)
	) {
		return false;
	}
	if (new Set(command.participantIds).size !== command.participantIds.length) {
		return false;
	}
	return command.participantIds.every(id =>
		project.characters.some(character => character.id === id)
	);
}

export function narrativeConditionReferencesExist(
	project: NarrativeProject,
	condition: NarrativeConditionDefinition
): boolean {
	switch (condition.type) {
		case 'character-knows-claim':
			return (
				project.characters.some(character => character.id === condition.characterId) &&
				project.claims.some(claim => claim.id === condition.claimId)
			);
		case 'character-has-item':
			return (
				project.characters.some(character => character.id === condition.characterId) &&
				project.itemInstances.some(item => item.id === condition.itemInstanceId)
			);
		case 'relationship-at-least':
			return (
				project.characters.some(character => character.id === condition.fromCharacterId) &&
				project.characters.some(character => character.id === condition.toCharacterId) &&
				Boolean(condition.axis.trim()) &&
				Number.isFinite(condition.value)
			);
		case 'story-node-state':
			return project.storyNodes.some(node => node.id === condition.storyNodeId);
		case 'characters-share-location':
			return (
				condition.characterIds.length >= 2 &&
				new Set(condition.characterIds).size === condition.characterIds.length &&
				condition.characterIds.every(id =>
					project.characters.some(character => character.id === id)
				)
			);
	}
}

function touched(project: NarrativeProject): NarrativeProject {
	return {...project, updatedAt: new Date().toISOString()};
}

function applyRoutineCommand(
	project: NarrativeProject,
	command: RoutineAuthoringCommand
): NarrativeProject {
	switch (command.type) {
		case 'routine/add':
			if (
				project.routineRules.some(rule => rule.id === command.rule.id) ||
				!routineRuleIsAuthoringValid(project, command.rule)
			) {
				return project;
			}
			return touched({
				...project,
				routineRules: [...project.routineRules, command.rule]
			});
		case 'routine/update':
			if (
				!project.routineRules.some(rule => rule.id === command.rule.id) ||
				!routineRuleIsAuthoringValid(project, command.rule)
			) {
				return project;
			}
			return touched({
				...project,
				routineRules: project.routineRules.map(rule =>
					rule.id === command.rule.id ? command.rule : rule
				)
			});
		case 'routine/remove':
			if (!project.routineRules.some(rule => rule.id === command.id)) {
				return project;
			}
			return touched({
				...project,
				routineRules: project.routineRules.filter(rule => rule.id !== command.id)
			});
	}
}

function applyStoryMetadataCommand(
	project: NarrativeProject,
	command: StoryMetadataAuthoringCommand
): NarrativeProject {
	if (!storyMetadataCommandIsAuthoringValid(project, command)) {
		return project;
	}
	return touched({
		...project,
		storyNodes: project.storyNodes.map(node =>
			node.id === command.id
				? {
						...node,
						kind: command.kind,
						title: command.title.trim(),
						description: command.description?.trim() || undefined,
						primaryCharacterId: command.primaryCharacterId || undefined,
						participantIds: [...command.participantIds],
						communication: command.communication,
						runtimePolicy: command.runtimePolicy
				  }
				: node
		)
	});
}

function newOutcomeIsValid(
	moveOutcomeIds: Set<string>,
	moveOutcomeKeys: Set<string>,
	outcome: NarrativeOutcomeDefinition
) {
	return (
		Boolean(outcome.id) &&
		Boolean(outcome.key.trim()) &&
		Boolean(outcome.label.trim()) &&
		!moveOutcomeIds.has(outcome.id) &&
		!moveOutcomeKeys.has(outcome.key) &&
		outcome.effects.length === 0 &&
		outcome.effectStoryNodeIds.length === 0
	);
}

function applyMoveConditionCommand(
	project: NarrativeProject,
	command: MoveConditionAuthoringCommand
): NarrativeProject {
	const move = project.narrativeMoves.find(candidate => candidate.id === command.moveId);
	if (!move) {
		return project;
	}

	if (command.type === 'move/addGuard') {
		if (
			!command.guard.id ||
			move.guards.some(guard => guard.id === command.guard.id) ||
			!narrativeConditionReferencesExist(project, command.guard.condition)
		) {
			return project;
		}
		const candidate = {...move, guards: [...move.guards, command.guard]};
		if (!narrativeMoveIsStructurallyValid(candidate)) {
			return project;
		}
		return touched({
			...project,
			narrativeMoves: project.narrativeMoves.map(item =>
				item.id === move.id ? candidate : item
			)
		});
	}

	if (command.type === 'move/removeGuard') {
		if (!move.guards.some(guard => guard.id === command.guardId)) {
			return project;
		}
		return touched({
			...project,
			narrativeMoves: project.narrativeMoves.map(item =>
				item.id === move.id
					? {...move, guards: move.guards.filter(guard => guard.id !== command.guardId)}
					: item
			)
		});
	}

	if (command.type === 'move/setAutomaticResolution') {
		if (!move.outcomes.some(outcome => outcome.id === command.outcomeId)) {
			return project;
		}
		return touched({
			...project,
			narrativeMoves: project.narrativeMoves.map(item =>
				item.id === move.id
					? {...move, resolution: {type: 'automatic', outcomeId: command.outcomeId}}
					: item
			)
		});
	}

	if (!narrativeConditionReferencesExist(project, command.condition)) {
		return project;
	}
	const outcomeIds = new Set(move.outcomes.map(outcome => outcome.id));
	const outcomeKeys = new Set(move.outcomes.map(outcome => outcome.key));
	let outcomes = move.outcomes;
	if (!outcomeIds.has(command.falseOutcomeId)) {
		const newFalseOutcome = command.newFalseOutcome;
		if (
			!newFalseOutcome ||
			newFalseOutcome.id !== command.falseOutcomeId ||
			!newOutcomeIsValid(outcomeIds, outcomeKeys, newFalseOutcome)
		) {
			return project;
		}
		outcomes = [...outcomes, newFalseOutcome];
	}
	if (
		command.trueOutcomeId === command.falseOutcomeId ||
		!outcomes.some(outcome => outcome.id === command.trueOutcomeId) ||
		!outcomes.some(outcome => outcome.id === command.falseOutcomeId)
	) {
		return project;
	}
	const candidate = {
		...move,
		outcomes,
		resolution: {
			type: 'condition' as const,
			condition: command.condition,
			trueOutcomeId: command.trueOutcomeId,
			falseOutcomeId: command.falseOutcomeId
		}
	};
	if (!narrativeMoveIsStructurallyValid(candidate)) {
		return project;
	}
	return touched({
		...project,
		narrativeMoves: project.narrativeMoves.map(item =>
			item.id === move.id ? candidate : item
		)
	});
}

function isRoutineCommand(
	command: NarrativeAuthoringCommand
): command is RoutineAuthoringCommand {
	return (
		command.type === 'routine/add' ||
		command.type === 'routine/update' ||
		command.type === 'routine/remove'
	);
}

function isStoryMetadataCommand(
	command: NarrativeAuthoringCommand
): command is StoryMetadataAuthoringCommand {
	return command.type === 'story/updateAuthoring';
}

function isMoveConditionCommand(
	command: NarrativeAuthoringCommand
): command is MoveConditionAuthoringCommand {
	return (
		command.type === 'move/addGuard' ||
		command.type === 'move/removeGuard' ||
		command.type === 'move/setConditionResolution' ||
		command.type === 'move/setAutomaticResolution'
	);
}

export function narrativeProjectAuthoringReducer(
	state: NarrativeProjectHistoryState,
	action: NarrativeProjectAuthoringAction
): NarrativeProjectHistoryState {
	if (action.type === 'undo' || action.type === 'redo') {
		return narrativeProjectHistoryReducer(state, action);
	}
	if (
		!isRoutineCommand(action.command) &&
		!isStoryMetadataCommand(action.command) &&
		!isMoveConditionCommand(action.command)
	) {
		return narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: action.command
		});
	}

	const nextProject = isRoutineCommand(action.command)
		? applyRoutineCommand(state.present, action.command)
		: isStoryMetadataCommand(action.command)
			? applyStoryMetadataCommand(state.present, action.command)
			: applyMoveConditionCommand(state.present, action.command);
	if (nextProject === state.present) {
		return state;
	}

	return {
		past: [...state.past, state.present],
		present: nextProject,
		future: []
	};
}
