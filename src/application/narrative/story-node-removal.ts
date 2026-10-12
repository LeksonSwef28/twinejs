import {NarrativeProject} from '../../domain/narrative/project';

export interface StoryNodeRemovalReference {
	kind: string;
	id: string;
	label: string;
}

export type StoryNodeRemovalInspection =
	| {status: 'missing'; references: []}
	| {status: 'ready'; references: []}
	| {status: 'blocked'; references: StoryNodeRemovalReference[]};

/**
 * Author-facing and command-boundary preflight for deleting a canonical Story
 * node. The visual Canvas instances are intentionally excluded: they are
 * projections of the canonical node and are safely removed with it.
 *
 * Deletion is refused when any authored or runtime definition still mentions
 * this id; we do not silently cascade-remove authorial moves or rewrite guards.
 * This is deliberately conservative: even an ambiguous string match blocks
 * deletion until the author resolves/reviews the dependency.
 */
export function inspectStoryNodeRemoval(
	project: NarrativeProject,
	storyNodeId: string
): StoryNodeRemovalInspection {
	if (!project.storyNodes.some(node => node.id === storyNodeId)) {
		return {status: 'missing', references: []};
	}

	const references: StoryNodeRemovalReference[] = [];
	const visit = (value: unknown): boolean => {
		if (value === storyNodeId) {
			return true;
		}
		if (Array.isArray(value)) {
			return value.some(visit);
		}
		return (
			value !== null &&
			typeof value === 'object' &&
			Object.values(value as Record<string, unknown>).some(visit)
		);
	};
	const add = (kind: string, id: string, label: string) => {
		references.push({kind, id, label});
	};
	const fromCollection = (
		kind: string,
		values: readonly unknown[],
		label: (value: Record<string, unknown>, index: number) => string
	) => {
		values.forEach((value, index) => {
			if (visit(value)) {
				const record = value as Record<string, unknown>;
				add(
					kind,
					typeof record.id === 'string' ? record.id : String(index),
					label(record, index)
				);
			}
		});
	};

	const storyTitle = (id: unknown) => {
		if (typeof id !== 'string') {
			return String(id ?? '');
		}
		return project.storyNodes.find(node => node.id === id)?.title ?? id;
	};
	fromCollection('story-connection', project.storyConnections, connection =>
		`Связь «${storyTitle(connection.sourceNodeId)}» → «${storyTitle(connection.targetNodeId)}»`);
	fromCollection('move', project.narrativeMoves, move =>
		`Действие «${String(move.label ?? move.id ?? '')}»`);
	fromCollection('reaction-set', project.reactionCandidateSets, set =>
		`Набор реакций ${String(set.id ?? '')}`);
	fromCollection('story-node', project.storyNodes.filter(node => node.id !== storyNodeId), node =>
		`Сюжетный блок «${String(node.title ?? node.id ?? '')}»`);

	// Include all other authored and runtime collections that could carry
	// provenance/state references. None may be silently changed by deletion.
	const otherCollections: Array<[string, readonly unknown[]]> = [
		['location', project.locations],
		['scene', project.scenes],
		['travel-route', project.travelRoutes ?? []],
		['sleep-option', project.sleepOptions ?? []],
		['character', project.characters],
		['item-definition', project.itemDefinitions],
		['item-instance', project.itemInstances],
		['objective-fact', project.objectiveFacts],
		['claim', project.claims],
		['initial-knowledge', project.initialKnowledge],
		['behavior-profile', project.behaviorProfiles],
		['routine-rule', project.routineRules],
		['schedule-exception', project.scheduleExceptions],
		['interaction-template', project.interactionTemplates],
		['memory', project.memories],
		['relationship', project.relationships],
		['pending-reaction', project.pendingReactions],
		['mind-state', project.mindStates],
		['runtime-occurrence', project.runtimeOccurrences],
		['active-story-execution', project.activeStoryExecutions]
	];
	otherCollections.forEach(([kind, values]) =>
		fromCollection(kind, values, value =>
			`${kind}: ${String(value.name ?? value.title ?? value.id ?? 'без имени')}`
		)
	);

	const otherRecords: Array<[string, Record<string, unknown>]> = [
		['cash', project.cashByCharacter],
		['injury', project.injuriesByCharacter],
		['item-override', project.itemPlacementOverrides],
		['story-state-override', project.storyNodeStateOverrides],
		['simulation', project.simulation as unknown as Record<string, unknown>]
	];
	for (const [kind, record] of otherRecords) {
		for (const [key, value] of Object.entries(record)) {
			if (
				(kind === 'story-state-override' && key === storyNodeId) ||
				visit(value)
			) {
				add(kind, key, `${kind}: ${key}`);
			}
		}
	}

	return references.length > 0
		? {status: 'blocked', references}
		: {status: 'ready', references: []};
}
