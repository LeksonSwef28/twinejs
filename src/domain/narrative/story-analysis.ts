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
