import {minutesPerDay} from '../../domain/narrative/calendar';
import {NarrativeProject} from '../../domain/narrative/project';
import {storyParticipantIds} from '../../domain/narrative/workspace-navigation';

export type ProjectSearchKind =
	| 'story-node'
	| 'character'
	| 'location'
	| 'scene'
	| 'item-definition'
	| 'item-instance'
	| 'fact'
	| 'claim'
	| 'move'
	| 'interaction-template'
	| 'routine-rule'
	| 'schedule-exception';

export type ProjectSearchWorkspace = 'story' | 'world-time';

export interface ProjectSearchDocument {
	key: string;
	kind: ProjectSearchKind;
	id: string;
	title: string;
	detail?: string;
	workspace: ProjectSearchWorkspace;
	searchText: string;
}

export interface ProjectSearchQuery {
	text: string;
	kinds?: ProjectSearchKind[];
	limit?: number;
}

export interface ProjectBackReference {
	key: string;
	kind: ProjectSearchKind;
	id: string;
	title: string;
	workspace: ProjectSearchWorkspace;
}

export interface ProjectSearchNavigationTarget {
	workspace: ProjectSearchWorkspace;
	storyNodeId?: string;
	characterId?: string;
	locationId?: string;
	absoluteMinute?: number;
}

function normalized(value: string | undefined) {
	return (value ?? '').trim().toLocaleLowerCase();
}

function document(
	kind: ProjectSearchKind,
	id: string,
	title: string,
	workspace: ProjectSearchWorkspace,
	detail?: string,
	aliases: string[] = []
): ProjectSearchDocument {
	return {
		key: `${kind}:${id}`,
		kind,
		id,
		title,
		detail,
		workspace,
		searchText: normalized([title, detail, id, ...aliases].filter(Boolean).join(' '))
	};
}

export function buildProjectSearchIndex(project: NarrativeProject) {
	const documents: ProjectSearchDocument[] = [];
	const locationsById = new Map(project.locations.map(value => [value.id, value]));
	const charactersById = new Map(project.characters.map(value => [value.id, value]));
	const itemDefinitionsById = new Map(
		project.itemDefinitions.map(value => [value.id, value])
	);

	for (const node of project.storyNodes) {
		documents.push(
			document(
				'story-node',
				node.id,
				node.title,
				'story',
				node.description,
				[
					node.kind,
					node.activationState,
					node.placement?.locationId
						? locationsById.get(node.placement.locationId)?.name ?? ''
						: ''
				]
			)
		);
	}
	for (const character of project.characters) {
		documents.push(
			document(
				'character',
				character.id,
				character.name,
				'story',
				`Character · ${character.cognitionTier}`
			)
		);
	}
	for (const location of project.locations) {
		documents.push(
			document('location', location.id, location.name, 'world-time', 'Location')
		);
	}
	for (const scene of project.scenes) {
		documents.push(
			document(
				'scene',
				scene.id,
				scene.name,
				'story',
				locationsById.get(scene.locationId)?.name
			)
		);
	}
	for (const definition of project.itemDefinitions) {
		documents.push(
			document(
				'item-definition',
				definition.id,
				definition.name,
				'story',
				definition.description,
				definition.tags
			)
		);
	}
	for (const instance of project.itemInstances) {
		const definition = itemDefinitionsById.get(instance.definitionId);
		documents.push(
			document(
				'item-instance',
				instance.id,
				instance.nameOverride ?? definition?.name ?? instance.id,
				'story',
				`Item instance · ${instance.placement.type}`,
				[definition?.name ?? '', instance.definitionId]
			)
		);
	}
	for (const fact of project.objectiveFacts) {
		documents.push(
			document('fact', fact.id, fact.title, 'story', fact.description, fact.tags)
		);
	}
	for (const claim of project.claims) {
		documents.push(
			document(
				'claim',
				claim.id,
				claim.text,
				'story',
				`Claim · ${claim.stance}`,
				claim.tags
			)
		);
	}
	for (const move of project.narrativeMoves) {
		documents.push(
			document(
				'move',
				move.id,
				move.label,
				'story',
				`Move · ${move.kind}`,
				[move.communicationIntent ?? '', move.communicatedClaimId ?? '']
			)
		);
	}
	for (const template of project.interactionTemplates) {
		documents.push(
			document(
				'interaction-template',
				template.id,
				template.name,
				'story',
				`${template.moves.length} move(s)`,
				template.tags
			)
		);
	}
	for (const rule of project.routineRules) {
		const character = charactersById.get(rule.characterId);
		const location = rule.targetLocationId
			? locationsById.get(rule.targetLocationId)
			: undefined;
		documents.push(
			document(
				'routine-rule',
				rule.id,
				`${character?.name ?? rule.characterId}: ${location?.name ?? (rule.absent ? 'отсутствует' : 'расписание')}`,
				'world-time',
				'RoutineRule',
				[rule.characterId, rule.targetLocationId ?? '']
			)
		);
	}
	for (const exception of project.scheduleExceptions) {
		const character = charactersById.get(exception.characterId);
		const location = exception.targetLocationId
			? locationsById.get(exception.targetLocationId)
			: undefined;
		documents.push(
			document(
				'schedule-exception',
				exception.id,
				`${character?.name ?? exception.characterId}: ${location?.name ?? (exception.absent ? 'отсутствует' : 'исключение')}`,
				'world-time',
				`ScheduleException · priority ${exception.priority}`,
				[exception.characterId, exception.targetLocationId ?? '']
			)
		);
	}

	return documents;
}

function scoreDocument(document: ProjectSearchDocument, terms: string[]) {
	let score = 0;
	const title = normalized(document.title);
	const detail = normalized(document.detail);
	for (const term of terms) {
		if (!document.searchText.includes(term)) {
			return -1;
		}
		if (title === term) {
			score += 100;
		} else if (title.startsWith(term)) {
			score += 40;
		} else if (title.includes(term)) {
			score += 20;
		} else if (detail.includes(term)) {
			score += 8;
		} else {
			score += 2;
		}
	}
	return score;
}

export function searchNarrativeProject(
	project: NarrativeProject,
	query: ProjectSearchQuery
) {
	const terms = normalized(query.text).split(/\s+/).filter(Boolean);
	if (terms.length === 0) {
		return [];
	}
	const kinds = query.kinds ? new Set(query.kinds) : undefined;
	const limit = Math.max(1, Math.min(250, query.limit ?? 80));
	return buildProjectSearchIndex(project)
		.filter(candidate => !kinds || kinds.has(candidate.kind))
		.map(candidate => ({candidate, score: scoreDocument(candidate, terms)}))
		.filter(result => result.score >= 0)
		.sort(
			(a, b) =>
				b.score - a.score ||
				a.candidate.title.localeCompare(b.candidate.title) ||
				a.candidate.key.localeCompare(b.candidate.key)
		)
		.slice(0, limit)
		.map(result => result.candidate);
}

function valueReferencesId(value: unknown, id: string): boolean {
	if (value === id) {
		return true;
	}
	if (Array.isArray(value)) {
		return value.some(item => valueReferencesId(item, id));
	}
	if (value && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).some(item =>
			valueReferencesId(item, id)
		);
	}
	return false;
}

export function projectBackReferences(
	project: NarrativeProject,
	target: Pick<ProjectSearchDocument, 'kind' | 'id'>
) {
	const index = buildProjectSearchIndex(project);
	const documentsByKey = new Map(index.map(item => [item.key, item]));
	const references: ProjectBackReference[] = [];
	const seen = new Set<string>();
	const add = (kind: ProjectSearchKind, id: string) => {
		const candidate = documentsByKey.get(`${kind}:${id}`);
		if (!candidate || seen.has(candidate.key) || candidate.key === `${target.kind}:${target.id}`) {
			return;
		}
		seen.add(candidate.key);
		references.push({
			key: candidate.key,
			kind: candidate.kind,
			id: candidate.id,
			title: candidate.title,
			workspace: candidate.workspace
		});
	};

	if (target.kind === 'story-node') {
		for (const connection of project.storyConnections) {
			if (connection.sourceNodeId === target.id) {
				add('story-node', connection.targetNodeId);
			}
			if (connection.targetNodeId === target.id) {
				add('story-node', connection.sourceNodeId);
			}
		}
		project.narrativeMoves
			.filter(move => move.storyNodeId === target.id)
			.forEach(move => add('move', move.id));
	}

	if (target.kind === 'character') {
		for (const node of project.storyNodes) {
			if (storyParticipantIds(node, project.narrativeMoves).includes(target.id)) {
				add('story-node', node.id);
			}
		}
		project.routineRules
			.filter(rule => rule.characterId === target.id)
			.forEach(rule => add('routine-rule', rule.id));
		project.scheduleExceptions
			.filter(exception => exception.characterId === target.id)
			.forEach(exception => add('schedule-exception', exception.id));
	}

	if (target.kind === 'location') {
		project.storyNodes
			.filter(node => node.placement?.locationId === target.id)
			.forEach(node => add('story-node', node.id));
		project.routineRules
			.filter(rule => rule.targetLocationId === target.id)
			.forEach(rule => add('routine-rule', rule.id));
		project.scheduleExceptions
			.filter(exception => exception.targetLocationId === target.id)
			.forEach(exception => add('schedule-exception', exception.id));
		project.scenes
			.filter(scene => scene.locationId === target.id)
			.forEach(scene => add('scene', scene.id));
	}

	if (target.kind === 'claim') {
		project.narrativeMoves
			.filter(move => valueReferencesId(move, target.id))
			.forEach(move => add('move', move.id));
		project.initialKnowledge
			.filter(seed => seed.claimId === target.id)
			.forEach(seed => add('character', seed.characterId));
	}

	if (target.kind === 'fact') {
		project.claims
			.filter(claim => claim.aboutFactId === target.id)
			.forEach(claim => add('claim', claim.id));
	}

	if (target.kind === 'item-definition') {
		project.itemInstances
			.filter(instance => instance.definitionId === target.id)
			.forEach(instance => add('item-instance', instance.id));
	}

	if (target.kind === 'item-instance') {
		project.narrativeMoves
			.filter(move => valueReferencesId(move, target.id))
			.forEach(move => add('move', move.id));
	}

	if (target.kind === 'move') {
		const move = project.narrativeMoves.find(candidate => candidate.id === target.id);
		if (move) {
			add('story-node', move.storyNodeId);
		}
	}

	if (target.kind === 'scene') {
		const scene = project.scenes.find(candidate => candidate.id === target.id);
		if (scene) {
			add('location', scene.locationId);
		}
	}

	if (target.kind === 'routine-rule') {
		const rule = project.routineRules.find(candidate => candidate.id === target.id);
		if (rule) {
			add('character', rule.characterId);
			if (rule.targetLocationId) {
				add('location', rule.targetLocationId);
			}
		}
	}

	if (target.kind === 'schedule-exception') {
		const exception = project.scheduleExceptions.find(
			candidate => candidate.id === target.id
		);
		if (exception) {
			add('character', exception.characterId);
			if (exception.targetLocationId) {
				add('location', exception.targetLocationId);
			}
		}
	}

	return references;
}

function storyTarget(project: NarrativeProject, storyNodeId: string) {
	const node = project.storyNodes.find(candidate => candidate.id === storyNodeId);
	const placement = node?.placement;
	return {
		workspace: 'story' as const,
		storyNodeId,
		locationId: placement?.locationId,
		absoluteMinute:
			placement?.day !== undefined && placement.minuteOfDay !== undefined
				? (placement.day - 1) * minutesPerDay + placement.minuteOfDay
				: undefined
	};
}

/** Resolves a search result to a stable editor destination without mutating runtime state. */
export function projectSearchNavigationTarget(
	project: NarrativeProject,
	document: ProjectSearchDocument
): ProjectSearchNavigationTarget {
	if (document.kind === 'story-node') {
		return storyTarget(project, document.id);
	}
	if (document.kind === 'move') {
		const move = project.narrativeMoves.find(candidate => candidate.id === document.id);
		if (move) {
			return storyTarget(project, move.storyNodeId);
		}
	}
	if (document.kind === 'character') {
		return {workspace: 'story', characterId: document.id};
	}
	if (document.kind === 'location') {
		return {workspace: 'world-time', locationId: document.id};
	}
	if (document.kind === 'routine-rule') {
		const rule = project.routineRules.find(candidate => candidate.id === document.id);
		return {
			workspace: 'world-time',
			characterId: rule?.characterId,
			locationId: rule?.targetLocationId,
			absoluteMinute: rule ? (rule.activeRange.fromDay - 1) * minutesPerDay : undefined
		};
	}
	if (document.kind === 'schedule-exception') {
		const exception = project.scheduleExceptions.find(
			candidate => candidate.id === document.id
		);
		return {
			workspace: 'world-time',
			characterId: exception?.characterId,
			locationId: exception?.targetLocationId,
			absoluteMinute: exception ? (exception.activeRange.fromDay - 1) * minutesPerDay : undefined
		};
	}

	const firstReference = projectBackReferences(project, document)[0];
	if (firstReference) {
		const referencedDocument = buildProjectSearchIndex(project).find(
			candidate => candidate.key === firstReference.key
		);
		if (referencedDocument) {
			return projectSearchNavigationTarget(project, referencedDocument);
		}
	}
	return {workspace: document.workspace};
}
