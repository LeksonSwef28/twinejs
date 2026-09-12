import {NarrativeProjectCommand} from '../../application/narrative/commands';
import {
	clampDay,
	clampMinuteOfDay,
	minutesPerDay,
	periodContainsMinute
} from '../../domain/narrative/calendar';
import {StoryCanvasEditorState} from '../../domain/narrative/editor';
import {
	createDefaultNarrativeOutcome,
	NarrativeConditionDefinition,
	NarrativeMoveDefinition,
	narrativeMoveIsStructurallyValid
} from '../../domain/narrative/interaction';
import {NarrativeProject} from '../../domain/narrative/project';
import {storyConnectionKindCanExecute} from '../../domain/narrative/story';

export interface NarrativeProjectHistoryState {
	past: NarrativeProject[];
	present: NarrativeProject;
	future: NarrativeProject[];
}

export type NarrativeProjectHistoryAction =
	| {type: 'execute'; command: NarrativeProjectCommand}
	| {type: 'undo'}
	| {type: 'redo'};

function touched(project: NarrativeProject): NarrativeProject {
	return {...project, updatedAt: new Date().toISOString()};
}

function storyCanvas(project: NarrativeProject): StoryCanvasEditorState {
	return (
		project.editor.storyCanvas ?? {
			activeCanvasId: 'story-root',
			viewport: {x: 0, y: 0, zoom: 1},
			nodes: []
		}
	);
}

function hasCharacter(project: NarrativeProject, id: string) {
	return project.characters.some(character => character.id === id);
}

function conditionReferencesExist(
	project: NarrativeProject,
	condition: NarrativeConditionDefinition
): boolean {
	switch (condition.type) {
		case 'character-knows-claim':
			return (
				hasCharacter(project, condition.characterId) &&
				project.claims.some(claim => claim.id === condition.claimId)
			);
		case 'character-has-item':
			return (
				hasCharacter(project, condition.characterId) &&
				project.itemInstances.some(item => item.id === condition.itemInstanceId)
			);
		case 'relationship-at-least':
			return (
				hasCharacter(project, condition.fromCharacterId) &&
				hasCharacter(project, condition.toCharacterId) &&
				Boolean(condition.axis.trim()) &&
				Number.isFinite(condition.value)
			);
		case 'story-node-state':
			return project.storyNodes.some(node => node.id === condition.storyNodeId);
		case 'characters-share-location':
			return (
				condition.characterIds.length >= 2 &&
				condition.characterIds.every(id => hasCharacter(project, id))
			);
	}
}

function narrativeMoveReferencesExist(
	project: NarrativeProject,
	move: NarrativeMoveDefinition
): boolean {
	if (!project.storyNodes.some(node => node.id === move.storyNodeId)) {
		return false;
	}
	if (move.actorCharacterId && !hasCharacter(project, move.actorCharacterId)) {
		return false;
	}
	if (!move.targetCharacterIds.every(id => hasCharacter(project, id))) {
		return false;
	}
	if (
		move.communicatedClaimId &&
		!project.claims.some(claim => claim.id === move.communicatedClaimId)
	) {
		return false;
	}
	if (!move.guards.every(guard => conditionReferencesExist(project, guard.condition))) {
		return false;
	}
	if (
		move.resolution.type === 'condition' &&
		!conditionReferencesExist(project, move.resolution.condition)
	) {
		return false;
	}
	return move.outcomes.every(outcome =>
		outcome.effectStoryNodeIds.every(id =>
			project.storyNodes.some(node => node.id === id)
		)
	);
}

function conditionReferencesStoryNode(
	condition: NarrativeConditionDefinition,
	storyNodeId: string
) {
	return (
		condition.type === 'story-node-state' &&
		condition.storyNodeId === storyNodeId
	);
}

function removeStoryNodeFromNarrativeMoves(
	moves: NarrativeMoveDefinition[],
	storyNodeId: string
): NarrativeMoveDefinition[] {
	return moves
		.filter(move => move.storyNodeId !== storyNodeId)
		.filter(
			move =>
				move.resolution.type !== 'condition' ||
				!conditionReferencesStoryNode(move.resolution.condition, storyNodeId)
		)
		.map(move => ({
			...move,
			guards: move.guards.filter(
				guard => !conditionReferencesStoryNode(guard.condition, storyNodeId)
			),
			outcomes: move.outcomes.map(outcome => ({
				...outcome,
				effectStoryNodeIds: outcome.effectStoryNodeIds.filter(
					id => id !== storyNodeId
				)
			}))
		}));
}

/**
 * Undo/redo restores authored data, including which visual node instances exist,
 * but keeps the current camera and the current positions of nodes that still
 * exist in the restored snapshot. This prevents Undo from throwing the author
 * to an old viewport while still allowing node creation/removal to undo cleanly.
 */
function restoreSnapshotKeepingEditorView(
	snapshot: NarrativeProject,
	current: NarrativeProject
): NarrativeProject {
	const snapshotCanvas = storyCanvas(snapshot);
	const currentCanvas = storyCanvas(current);
	const currentNodes = new Map(currentCanvas.nodes.map(node => [node.id, node]));

	return {
		...snapshot,
		editor: {
			...snapshot.editor,
			selectedDay: current.editor.selectedDay,
			selectedPeriodId: current.editor.selectedPeriodId,
			selectedMinuteOfDay: current.editor.selectedMinuteOfDay,
			workspaceMode: current.editor.workspaceMode,
			storyCanvas: {
				...snapshotCanvas,
				viewport: currentCanvas.viewport,
				nodes: snapshotCanvas.nodes.map(node => currentNodes.get(node.id) ?? node)
			},
			worldTimeViewport:
				current.editor.worldTimeViewport ?? snapshot.editor.worldTimeViewport
		}
	};
}

export function applyNarrativeProjectCommand(
	project: NarrativeProject,
	command: NarrativeProjectCommand
): NarrativeProject {
	switch (command.type) {
		case 'project/rename':
			return touched({...project, name: command.name.trim() || project.name});
		case 'location/add':
			return touched({
				...project,
				locations: [...project.locations, {id: command.id, name: command.name}]
			});
		case 'character/add':
			return touched({
				...project,
				characters: [
					...project.characters,
					{
						id: command.id,
						name: command.name,
						cognitionTier: command.cognitionTier,
						defaultBehaviorProfileId: command.profileId
					}
				],
				behaviorProfiles: [
					...project.behaviorProfiles,
					{
						id: command.profileId,
						characterId: command.id,
						name: 'Обычная жизнь'
					}
				]
			});
		case 'item/addDefinition': {
			const name = command.name.trim();
			if (!name) {
				return project;
			}
			return touched({
				...project,
				itemDefinitions: [
					...project.itemDefinitions,
					{id: command.id, name, tags: []}
				]
			});
		}
		case 'item/addInstance':
			if (
				!project.itemDefinitions.some(
					definition => definition.id === command.definitionId
				)
			) {
				return project;
			}
			return touched({
				...project,
				itemInstances: [
					...project.itemInstances,
					{
						id: command.id,
						definitionId: command.definitionId,
						placement: command.placement ?? {type: 'unplaced'}
					}
				]
			});
		case 'fact/add': {
			const title = command.title.trim();
			if (!title) {
				return project;
			}
			return touched({
				...project,
				objectiveFacts: [
					...project.objectiveFacts,
					{
						id: command.id,
						title,
						description: command.description?.trim() || undefined,
						tags: []
					}
				]
			});
		}
		case 'claim/add': {
			const text = command.text.trim();
			if (
				!text ||
				(command.aboutFactId !== undefined &&
					!project.objectiveFacts.some(fact => fact.id === command.aboutFactId))
			) {
				return project;
			}
			return touched({
				...project,
				claims: [
					...project.claims,
					{
						id: command.id,
						text,
						aboutFactId: command.aboutFactId,
						stance: command.stance ?? 'unresolved',
						tags: []
					}
				]
			});
		}
		case 'story/addDraftNode': {
			const canvas = storyCanvas(project);
			return touched({
				...project,
				storyNodes: [
					...project.storyNodes,
					{
						id: command.id,
						kind: command.kind,
						title: command.title.trim() || 'Новый сюжетный блок',
						participantIds: [],
						activationState: 'draft'
					}
				],
				editor: {
					...project.editor,
					storyCanvas: {
						...canvas,
						nodes: [
							...canvas.nodes,
							{
								id: command.canvasNodeId,
								kind: 'entity',
								entityRef: {type: 'storyNode', id: command.id},
								position: command.position
							}
						]
					}
				}
			});
		}
		case 'story/removeNode':
			return touched({
				...project,
				storyNodes: project.storyNodes.filter(node => node.id !== command.id),
				storyConnections: project.storyConnections.filter(
					connection =>
						connection.sourceNodeId !== command.id &&
						connection.targetNodeId !== command.id
				),
				narrativeMoves: removeStoryNodeFromNarrativeMoves(
					project.narrativeMoves,
					command.id
				),
				editor: {
					...project.editor,
					storyCanvas: {
						...storyCanvas(project),
						nodes: storyCanvas(project).nodes.filter(
							node => node.entityRef?.id !== command.id
						)
					}
				}
			});
		case 'story/updateNodeTitle':
			return touched({
				...project,
				storyNodes: project.storyNodes.map(node =>
					node.id === command.id
						? {...node, title: command.title.trim() || node.title}
						: node
				)
			});
		case 'story/setPlacement':
			return touched({
				...project,
				storyNodes: project.storyNodes.map(node => {
					if (node.id !== command.id) {
						return node;
					}
					if (!command.placement) {
						return {...node, placement: undefined};
					}
					return {
						...node,
						placement: {
							...command.placement,
							day:
								command.placement.day === undefined
									? undefined
									: clampDay(
										command.placement.day,
										project.template.dayCount
									  ),
							minuteOfDay:
								command.placement.minuteOfDay === undefined
									? undefined
									: clampMinuteOfDay(command.placement.minuteOfDay)
						}
					};
				})
			});
		case 'story/connect': {
			const mode = command.mode ?? 'reference';
			if (
				command.sourceNodeId === command.targetNodeId ||
				!project.storyNodes.some(node => node.id === command.sourceNodeId) ||
				!project.storyNodes.some(node => node.id === command.targetNodeId) ||
				(mode === 'executable' &&
					(!storyConnectionKindCanExecute(command.kind) ||
						!command.sourcePortId ||
						!command.targetPortId))
			) {
				return project;
			}

			return touched({
				...project,
				storyConnections: [
					...project.storyConnections,
					{
						id: command.id,
						sourceNodeId: command.sourceNodeId,
						targetNodeId: command.targetNodeId,
						kind: command.kind,
						mode,
						sourcePortId: command.sourcePortId,
						targetPortId: command.targetPortId
					}
				]
			});
		}
		case 'story/setConnectionMode': {
			const connection = project.storyConnections.find(
				candidate => candidate.id === command.id
			);
			if (
				!connection ||
				(command.mode === 'executable' &&
					(!storyConnectionKindCanExecute(connection.kind) ||
						!connection.sourcePortId ||
						!connection.targetPortId))
			) {
				return project;
			}
			return touched({
				...project,
				storyConnections: project.storyConnections.map(candidate =>
					candidate.id === command.id
						? {...candidate, mode: command.mode}
						: candidate
				)
			});
		}
		case 'move/add': {
			if (project.narrativeMoves.some(move => move.id === command.id)) {
				return project;
			}
			const defaultOutcome = createDefaultNarrativeOutcome(command.id);
			const outcomes = command.outcomes ?? [defaultOutcome];
			const resolution =
				command.resolution ??
				({
					type: 'automatic',
					outcomeId: outcomes[0]?.id ?? defaultOutcome.id
				} as const);
			const move: NarrativeMoveDefinition = {
				id: command.id,
				storyNodeId: command.storyNodeId,
				kind: command.kind,
				label: command.label.trim(),
				actorCharacterId: command.actorCharacterId,
				targetCharacterIds: command.targetCharacterIds ?? [],
				communicatedClaimId: command.communicatedClaimId,
				communicationIntent: command.communicationIntent,
				guards: command.guards ?? [],
				resolution,
				outcomes
			};
			if (
				!narrativeMoveIsStructurallyValid(move) ||
				!narrativeMoveReferencesExist(project, move)
			) {
				return project;
			}
			return touched({
				...project,
				narrativeMoves: [...project.narrativeMoves, move]
			});
		}
		case 'move/remove':
			if (!project.narrativeMoves.some(move => move.id === command.id)) {
				return project;
			}
			return touched({
				...project,
				narrativeMoves: project.narrativeMoves.filter(
					move => move.id !== command.id
				)
			});
		case 'editor/selectDay':
			return {
				...project,
				editor: {
					...project.editor,
					selectedDay: clampDay(command.day, project.template.dayCount)
				}
			};
		case 'editor/selectPeriod': {
			const period = project.template.periods.find(
				candidate => candidate.id === command.periodId
			);
			if (!period) {
				return project;
			}
			return {
				...project,
				editor: {
					...project.editor,
					selectedPeriodId: period.id,
					selectedMinuteOfDay: period.startMinute
				}
			};
		}
		case 'editor/selectMoment': {
			const minuteOfDay = clampMinuteOfDay(command.minuteOfDay);
			const period = project.template.periods.find(candidate =>
				periodContainsMinute(candidate, minuteOfDay)
			);
			return {
				...project,
				editor: {
					...project.editor,
					selectedDay: clampDay(command.day, project.template.dayCount),
					selectedMinuteOfDay: minuteOfDay,
					selectedPeriodId: period?.id ?? project.editor.selectedPeriodId
				}
			};
		}
		case 'editor/selectWorkspace':
			return {
				...project,
				editor: {...project.editor, workspaceMode: command.workspace}
			};
		case 'editor/addCanvasReference': {
			const canvas = storyCanvas(project);
			return {
				...project,
				editor: {
					...project.editor,
					storyCanvas: {
						...canvas,
						nodes: [
							...canvas.nodes,
							{
								id: command.canvasNodeId,
								kind: 'entity',
								entityRef: command.entityRef,
								position: command.position
							}
						]
					}
				}
			};
		}
		case 'editor/removeCanvasNode': {
			const canvas = storyCanvas(project);
			return {
				...project,
				editor: {
					...project.editor,
					storyCanvas: {
						...canvas,
						nodes: canvas.nodes.filter(
							node => node.id !== command.canvasNodeId
						)
					}
				}
			};
		}
		case 'editor/moveCanvasNode': {
			const canvas = storyCanvas(project);
			return {
				...project,
				editor: {
					...project.editor,
					storyCanvas: {
						...canvas,
						nodes: canvas.nodes.map(node =>
							node.id === command.canvasNodeId
								? {...node, position: command.position}
								: node
						)
					}
				}
			};
		}
		case 'editor/setStoryViewport':
			return {
				...project,
				editor: {
					...project.editor,
					storyCanvas: {
						...storyCanvas(project),
						viewport: {
							x: command.viewport.x,
							y: command.viewport.y,
							zoom: Math.max(0.25, Math.min(2.5, command.viewport.zoom))
						}
					}
				}
			};
		case 'editor/setWorldTimeViewport': {
			const maximumAbsoluteMinute =
				project.template.dayCount * minutesPerDay - 1;
			const centerAbsoluteMinute = Math.max(
				0,
				Math.min(maximumAbsoluteMinute, command.centerAbsoluteMinute)
			);
			const day = Math.floor(centerAbsoluteMinute / minutesPerDay) + 1;
			const minuteOfDay = Math.floor(centerAbsoluteMinute % minutesPerDay);
			const period = project.template.periods.find(candidate =>
				periodContainsMinute(candidate, minuteOfDay)
			);
			const currentViewport = project.editor.worldTimeViewport ?? {
				centerAbsoluteMinute,
				pixelsPerHour: 0.4,
				scrollY: 0
			};

			return {
				...project,
				editor: {
					...project.editor,
					selectedDay: day,
					selectedMinuteOfDay: minuteOfDay,
					selectedPeriodId: period?.id ?? project.editor.selectedPeriodId,
					worldTimeViewport: {
						...currentViewport,
						centerAbsoluteMinute,
						pixelsPerHour: Math.max(
							0.35,
							Math.min(480, command.pixelsPerHour)
						),
						scrollY: command.scrollY ?? currentViewport.scrollY,
						viewportWidth:
							command.viewportWidth ?? currentViewport.viewportWidth,
						viewportHeight:
							command.viewportHeight ?? currentViewport.viewportHeight
					}
				}
			};
		}
	}
}

function isEditorNavigation(command: NarrativeProjectCommand) {
	return command.type.startsWith('editor/');
}

export function narrativeProjectHistoryReducer(
	state: NarrativeProjectHistoryState,
	action: NarrativeProjectHistoryAction
): NarrativeProjectHistoryState {
	if (action.type === 'undo') {
		const previous = state.past[state.past.length - 1];
		if (!previous) {
			return state;
		}

		return {
			past: state.past.slice(0, -1),
			present: restoreSnapshotKeepingEditorView(previous, state.present),
			future: [state.present, ...state.future]
		};
	}

	if (action.type === 'redo') {
		const next = state.future[0];
		if (!next) {
			return state;
		}

		return {
			past: [...state.past, state.present],
			present: restoreSnapshotKeepingEditorView(next, state.present),
			future: state.future.slice(1)
		};
	}

	const nextProject = applyNarrativeProjectCommand(
		state.present,
		action.command
	);
	if (nextProject === state.present) {
		return state;
	}

	if (isEditorNavigation(action.command)) {
		return {...state, present: nextProject};
	}

	return {
		past: [...state.past, state.present],
		present: nextProject,
		future: []
	};
}
