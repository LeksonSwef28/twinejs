import {NarrativeMoveDefinition} from './interaction';
import {
	StoryConnectionDefinition,
	StoryNodeDefinition,
	storyConnectionMode
} from './story';

const continuityConnectionKinds = new Set([
	'flow',
	'condition-true',
	'condition-false',
	'effect',
	'knowledge',
	'relationship'
]);

export interface StoryContinuityAnalysis {
	isolatedNodeIds: string[];
	entryNodeIds: string[];
	terminalNodeIds: string[];
	unscheduledNodeIds: string[];
	earlyTerminalNodeIds: string[];
}

export type StoryCoverageFindingKind =
	| 'terminal-story-node'
	| 'early-terminal-story-node'
	| 'isolated-story-node'
	| 'unreachable-story-node'
	| 'outcome-without-consequence'
	| 'asymmetric-outcomes'
	| 'character-frontier';

export type StoryCoverageSeverity = 'info' | 'warning';

export interface StoryCoverageFinding {
	id: string;
	kind: StoryCoverageFindingKind;
	severity: StoryCoverageSeverity;
	summary: string;
	storyNodeId?: string;
	moveId?: string;
	outcomeId?: string;
	characterId?: string;
}

export interface StoryCoverageAnalysis {
	findings: StoryCoverageFinding[];
	terminalNodeIds: string[];
	earlyTerminalNodeIds: string[];
	isolatedNodeIds: string[];
	unreachableNodeIds: string[];
	outcomeWithoutConsequenceIds: string[];
	asymmetricMoveIds: string[];
	characterFrontierIds: string[];
}

function continuityConnections(connections: StoryConnectionDefinition[]) {
	return connections.filter(
		connection =>
			storyConnectionMode(connection) === 'executable' &&
			continuityConnectionKinds.has(connection.kind)
	);
}

/**
 * Focus/highlight follows every authored relation, including reference edges.
 * Reference edges remain useful for thinking even though they are excluded from
 * causal continuity and runtime traversal.
 */
export function connectedStoryNodeIds(
	startNodeId: string,
	connections: StoryConnectionDefinition[]
) {
	const connected = new Set<string>([startNodeId]);
	const queue = [startNodeId];

	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const connection of connections) {
			let neighbor: string | undefined;
			if (connection.sourceNodeId === current) {
				neighbor = connection.targetNodeId;
			} else if (connection.targetNodeId === current) {
				neighbor = connection.sourceNodeId;
			}

			if (neighbor && !connected.has(neighbor)) {
				connected.add(neighbor);
				queue.push(neighbor);
			}
		}
	}

	return connected;
}

export function analyzeStoryContinuity(
	nodes: StoryNodeDefinition[],
	connections: StoryConnectionDefinition[],
	dayCount: number
): StoryContinuityAnalysis {
	const causalConnections = continuityConnections(connections);
	const incoming = new Map<string, number>();
	const outgoing = new Map<string, number>();

	for (const node of nodes) {
		incoming.set(node.id, 0);
		outgoing.set(node.id, 0);
	}

	for (const connection of causalConnections) {
		if (outgoing.has(connection.sourceNodeId)) {
			outgoing.set(
				connection.sourceNodeId,
				(outgoing.get(connection.sourceNodeId) ?? 0) + 1
			);
		}
		if (incoming.has(connection.targetNodeId)) {
			incoming.set(
				connection.targetNodeId,
				(incoming.get(connection.targetNodeId) ?? 0) + 1
			);
		}
	}

	const isolatedNodeIds = nodes
		.filter(
			node =>
				(incoming.get(node.id) ?? 0) === 0 &&
				(outgoing.get(node.id) ?? 0) === 0
		)
		.map(node => node.id);
	const entryNodeIds = nodes
		.filter(node => (incoming.get(node.id) ?? 0) === 0)
		.map(node => node.id);
	const terminalNodeIds = nodes
		.filter(node => (outgoing.get(node.id) ?? 0) === 0)
		.map(node => node.id);
	const unscheduledNodeIds = nodes
		.filter(node => node.placement?.day === undefined)
		.map(node => node.id);
	const earlyTerminalNodeIds = nodes
		.filter(
			node =>
				(outgoing.get(node.id) ?? 0) === 0 &&
				node.placement?.day !== undefined &&
				node.placement.day < dayCount
		)
		.map(node => node.id);

	return {
		isolatedNodeIds,
		entryNodeIds,
		terminalNodeIds,
		unscheduledNodeIds,
		earlyTerminalNodeIds
	};
}

function outcomeHasMeaningfulConsequence(
	outcome: NarrativeMoveDefinition['outcomes'][number]
) {
	return (
		outcome.effectStoryNodeIds.length > 0 || (outcome.effects?.length ?? 0) > 0
	);
}

function moveHasBranchingResolution(move: NarrativeMoveDefinition) {
	return move.resolution.type !== 'automatic' || move.outcomes.length > 1;
}

function nodeCharacters(
	node: StoryNodeDefinition,
	moves: NarrativeMoveDefinition[]
) {
	const characters = new Set<string>();
	if (node.primaryCharacterId) {
		characters.add(node.primaryCharacterId);
	}
	for (const participantId of node.participantIds) {
		characters.add(participantId);
	}
	for (const move of moves) {
		if (move.storyNodeId !== node.id) {
			continue;
		}
		if (move.actorCharacterId) {
			characters.add(move.actorCharacterId);
		}
		for (const targetId of move.targetCharacterIds) {
			characters.add(targetId);
		}
	}
	return characters;
}

/**
 * A25 Coverage extends the existing continuity model instead of creating a
 * second graph analyzer. Executable Story edges and explicit Move outcome
 * continuations are causal; reference edges never keep a branch alive.
 */
export function analyzeStoryCoverage(
	nodes: StoryNodeDefinition[],
	connections: StoryConnectionDefinition[],
	moves: NarrativeMoveDefinition[],
	dayCount: number
): StoryCoverageAnalysis {
	const causalConnections = continuityConnections(connections);
	const nodeIds = new Set(nodes.map(node => node.id));
	const outgoingByNode = new Map<string, Set<string>>();
	const incomingByNode = new Map<string, Set<string>>();
	for (const node of nodes) {
		outgoingByNode.set(node.id, new Set());
		incomingByNode.set(node.id, new Set());
	}
	function addCausalLink(sourceNodeId: string, targetNodeId: string) {
		if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) {
			return;
		}
		outgoingByNode.get(sourceNodeId)!.add(targetNodeId);
		incomingByNode.get(targetNodeId)!.add(sourceNodeId);
	}
	for (const connection of causalConnections) {
		addCausalLink(connection.sourceNodeId, connection.targetNodeId);
	}
	for (const move of moves) {
		if (!nodeIds.has(move.storyNodeId)) {
			continue;
		}
		for (const outcome of move.outcomes) {
			for (const targetNodeId of outcome.effectStoryNodeIds) {
				addCausalLink(move.storyNodeId, targetNodeId);
			}
		}
	}

	const findings: StoryCoverageFinding[] = [];
	const terminalNodeIds = nodes
		.filter(node => (outgoingByNode.get(node.id)?.size ?? 0) === 0)
		.map(node => node.id);
	const terminalSet = new Set(terminalNodeIds);
	const earlyTerminalNodeIds = nodes
		.filter(
			node =>
				terminalSet.has(node.id) &&
				node.placement?.day !== undefined &&
				node.placement.day < dayCount
		)
		.map(node => node.id);
	const earlyTerminalSet = new Set(earlyTerminalNodeIds);

	for (const node of nodes) {
		if (!terminalSet.has(node.id)) {
			continue;
		}
		findings.push({
			id: `coverage:terminal:${node.id}`,
			kind: earlyTerminalSet.has(node.id)
				? 'early-terminal-story-node'
				: 'terminal-story-node',
			severity: earlyTerminalSet.has(node.id) ? 'warning' : 'info',
			storyNodeId: node.id,
			summary: earlyTerminalSet.has(node.id)
				? `Ветка заканчивается на «${node.title}» раньше конца 93-дневного окна.`
				: `«${node.title}» — текущий конец исполняемой ветки.`
		});
	}

	const isolatedNodeIds =
		nodes.length <= 1
			? []
			: nodes
					.filter(
						node =>
							(incomingByNode.get(node.id)?.size ?? 0) === 0 &&
							(outgoingByNode.get(node.id)?.size ?? 0) === 0
					)
					.map(node => node.id);
	for (const nodeId of isolatedNodeIds) {
		const node = nodes.find(candidate => candidate.id === nodeId)!;
		findings.push({
			id: `coverage:isolated:${node.id}`,
			kind: 'isolated-story-node',
			severity: 'warning',
			storyNodeId: node.id,
			summary: `«${node.title}» изолирован: у узла нет исполняемых входящих или исходящих Story-связей/продолжений.`
		});
	}

	const entryNodeIds = nodes
		.filter(node => (incomingByNode.get(node.id)?.size ?? 0) === 0)
		.map(node => node.id);
	const unreachableNodeIds: string[] = [];
	if (entryNodeIds.length === 1) {
		const entryNodeId = entryNodeIds[0];
		const reachable = new Set<string>([entryNodeId]);
		const queue = [entryNodeId];
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const targetNodeId of outgoingByNode.get(current) ?? []) {
				if (!reachable.has(targetNodeId)) {
					reachable.add(targetNodeId);
					queue.push(targetNodeId);
				}
			}
		}
		const entryNode = nodes.find(node => node.id === entryNodeId)!;
		for (const node of nodes) {
			if (reachable.has(node.id)) {
				continue;
			}
			unreachableNodeIds.push(node.id);
			findings.push({
				id: `coverage:unreachable:${node.id}`,
				kind: 'unreachable-story-node',
				severity: 'warning',
				storyNodeId: node.id,
				summary: `«${node.title}» недостижим из единственной точки входа «${entryNode.title}» по исполняемому Story-графу.`
			});
		}
	}

	const outcomeWithoutConsequenceIds: string[] = [];
	const asymmetricMoveIds: string[] = [];
	for (const move of moves) {
		if (!moveHasBranchingResolution(move)) {
			continue;
		}
		const meaningful = move.outcomes.map(outcome => ({
			outcome,
			meaningful: outcomeHasMeaningfulConsequence(outcome)
		}));
		for (const entry of meaningful) {
			if (entry.meaningful) {
				continue;
			}
			outcomeWithoutConsequenceIds.push(entry.outcome.id);
			findings.push({
				id: `coverage:empty-outcome:${move.id}:${entry.outcome.id}`,
				kind: 'outcome-without-consequence',
				severity: 'warning',
				storyNodeId: move.storyNodeId,
				moveId: move.id,
				outcomeId: entry.outcome.id,
				summary: `Исход «${entry.outcome.label}» у «${move.label}» не продолжает Story и не применяет ни одного эффекта.`
			});
		}

		const meaningfulCount = meaningful.filter(entry => entry.meaningful).length;
		if (meaningfulCount > 0 && meaningfulCount < meaningful.length) {
			asymmetricMoveIds.push(move.id);
			findings.push({
				id: `coverage:asymmetric:${move.id}`,
				kind: 'asymmetric-outcomes',
				severity: 'warning',
				storyNodeId: move.storyNodeId,
				moveId: move.id,
				summary: `У «${move.label}» часть исходов имеет последствия, а часть пока остаётся пустой.`
			});
		}
	}

	const nodesByCharacter = new Map<string, StoryNodeDefinition[]>();
	for (const node of nodes) {
		for (const characterId of nodeCharacters(node, moves)) {
			const list = nodesByCharacter.get(characterId) ?? [];
			list.push(node);
			nodesByCharacter.set(characterId, list);
		}
	}

	const characterFrontierIds: string[] = [];
	for (const [characterId, characterNodes] of nodesByCharacter) {
		const placed = characterNodes.filter(
			node => node.placement?.day !== undefined
		);
		if (placed.length < 2) {
			continue;
		}
		const latestDay = Math.max(...placed.map(node => node.placement!.day!));
		if (latestDay >= dayCount) {
			continue;
		}
		const latestNodes = placed.filter(node => node.placement?.day === latestDay);
		if (!latestNodes.every(node => terminalSet.has(node.id))) {
			continue;
		}
		characterFrontierIds.push(characterId);
		findings.push({
			id: `coverage:character-frontier:${characterId}`,
			kind: 'character-frontier',
			severity: 'warning',
			characterId,
			storyNodeId: latestNodes[0]?.id,
			summary: `Линия персонажа заканчивается около Day ${latestDay}: у последних размещённых Story-узлов нет исполняемого продолжения.`
		});
	}

	return {
		findings,
		terminalNodeIds,
		earlyTerminalNodeIds,
		isolatedNodeIds,
		unreachableNodeIds,
		outcomeWithoutConsequenceIds,
		asymmetricMoveIds,
		characterFrontierIds
	};
}
