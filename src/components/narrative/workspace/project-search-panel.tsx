import * as React from 'react';
import {minutesPerDay} from '../../../domain/narrative/calendar';
import {
	ProjectSearchDocument,
	ProjectSearchKind,
	buildProjectSearchIndex,
	projectBackReferences,
	projectSearchNavigationTarget,
	searchNarrativeProject
} from '../../../application/narrative/project-search';
import {storyCanvasViewportForNode} from '../../../domain/narrative/workspace-navigation';
import {useNarrativeProject} from '../../../store/narrative-project';

const kindLabels: Record<ProjectSearchKind, string> = {
	'story-node': 'Story',
	character: 'Персонажи',
	location: 'Локации',
	scene: 'Сцены',
	'item-definition': 'Типы предметов',
	'item-instance': 'Экземпляры предметов',
	fact: 'Факты',
	claim: 'Claims',
	move: 'Moves',
	'interaction-template': 'Шаблоны',
	'routine-rule': 'Расписания',
	'schedule-exception': 'Исключения расписания'
};

type NavigationSnapshot = {
	workspace: 'story' | 'world-time';
	storyViewport?: {x: number; y: number; zoom: number};
	worldTimeViewport?: {
		centerAbsoluteMinute: number;
		pixelsPerHour: number;
		scrollY: number;
	};
};

export const ProjectSearchPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const [query, setQuery] = React.useState('');
	const [kind, setKind] = React.useState<ProjectSearchKind | 'all'>('all');
	const [activeKey, setActiveKey] = React.useState<string>();
	const [selectedStoryIds, setSelectedStoryIds] = React.useState<string[]>([]);
	const [bulkLocationId, setBulkLocationId] = React.useState('');
	const [navigationHistory, setNavigationHistory] = React.useState<
		NavigationSnapshot[]
	>([]);

	const index = React.useMemo(() => buildProjectSearchIndex(project), [project]);
	const indexByKey = React.useMemo(
		() => new Map(index.map(document => [document.key, document])),
		[index]
	);
	const results = React.useMemo(
		() =>
			searchNarrativeProject(project, {
				text: query,
				kinds: kind === 'all' ? undefined : [kind],
				limit: 80
			}),
		[project, query, kind]
	);
	const activeDocument = activeKey ? indexByKey.get(activeKey) : undefined;
	const backReferences = React.useMemo(
		() =>
			activeDocument ? projectBackReferences(project, activeDocument) : [],
		[activeDocument, project]
	);

	React.useEffect(() => {
		const existing = new Set(project.storyNodes.map(node => node.id));
		setSelectedStoryIds(current => current.filter(id => existing.has(id)));
	}, [project.storyNodes]);

	function currentNavigationSnapshot(): NavigationSnapshot {
		return {
			workspace: project.editor.workspaceMode ?? 'story',
			storyViewport: project.editor.storyCanvas?.viewport,
			worldTimeViewport: project.editor.worldTimeViewport
		};
	}

	function pushHistory() {
		setNavigationHistory(current => [...current.slice(-19), currentNavigationSnapshot()]);
	}

	function applyDocumentNavigation(document: ProjectSearchDocument) {
		pushHistory();
		const target = projectSearchNavigationTarget(project, document);
		if (target.storyNodeId || target.characterId) {
			const visual = project.editor.storyCanvas?.nodes.find(node => {
				if (!node.entityRef) {
					return false;
				}
				return target.storyNodeId
					? node.entityRef.type === 'storyNode' && node.entityRef.id === target.storyNodeId
					: node.entityRef.type === 'character' && node.entityRef.id === target.characterId;
			});
			if (visual) {
				execute({
					type: 'editor/setStoryViewport',
					viewport: storyCanvasViewportForNode(
						visual.position,
						project.editor.storyCanvas?.viewport.zoom
					)
				});
			}
		}
		if (target.workspace === 'world-time' && target.absoluteMinute !== undefined) {
			execute({
				type: 'editor/setWorldTimeViewport',
				centerAbsoluteMinute: target.absoluteMinute,
				pixelsPerHour: Math.max(
					12,
					project.editor.worldTimeViewport?.pixelsPerHour ?? 12
				)
			});
		}
		execute({type: 'editor/selectWorkspace', workspace: target.workspace});
		setActiveKey(document.key);
	}

	function showStoryNodeInTime(document: ProjectSearchDocument) {
		const node = project.storyNodes.find(candidate => candidate.id === document.id);
		if (node?.placement?.day === undefined || node.placement.minuteOfDay === undefined) {
			return;
		}
		pushHistory();
		execute({
			type: 'editor/setWorldTimeViewport',
			centerAbsoluteMinute:
				(node.placement.day - 1) * minutesPerDay + node.placement.minuteOfDay,
			pixelsPerHour: Math.max(
				12,
				project.editor.worldTimeViewport?.pixelsPerHour ?? 12
			)
		});
		execute({type: 'editor/selectWorkspace', workspace: 'world-time'});
		setActiveKey(document.key);
	}

	function navigateBack() {
		const snapshot = navigationHistory[navigationHistory.length - 1];
		if (!snapshot) {
			return;
		}
		setNavigationHistory(current => current.slice(0, -1));
		if (snapshot.storyViewport) {
			execute({type: 'editor/setStoryViewport', viewport: snapshot.storyViewport});
		}
		if (snapshot.worldTimeViewport) {
			execute({
				type: 'editor/setWorldTimeViewport',
				...snapshot.worldTimeViewport
			});
		}
		execute({type: 'editor/selectWorkspace', workspace: snapshot.workspace});
	}

	function toggleStorySelection(id: string) {
		setSelectedStoryIds(current =>
			current.includes(id) ? current.filter(candidate => candidate !== id) : [...current, id]
		);
	}

	function applyBulkLocation() {
		if (selectedStoryIds.length === 0) {
			return;
		}
		execute({
			type: 'story/bulkSetLocation',
			storyNodeIds: selectedStoryIds,
			locationId: bulkLocationId || undefined
		});
	}

	return (
		<section
			className="narrative-workspace__project-search"
			aria-label="Поиск и навигация по Narrative Project"
		>
			<div className="narrative-workspace__panel-heading">
				<span>PROJECT SEARCH</span>
				<small>{index.length} индексируемых authored сущностей</small>
			</div>
			<div className="narrative-workspace__project-search-controls">
				<input
					aria-label="Поиск по Narrative Project"
					value={query}
					placeholder="Story, персонаж, локация, Claim, Move, шаблон…"
					onChange={event => setQuery(event.target.value)}
				/>
				<select
					aria-label="Фильтр типа Project Search"
					value={kind}
					onChange={event => setKind(event.target.value as ProjectSearchKind | 'all')}
				>
					<option value="all">Все типы</option>
					{Object.entries(kindLabels).map(([value, label]) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
				<button type="button" onClick={navigateBack} disabled={navigationHistory.length === 0}>
					← Назад по навигации
				</button>
			</div>

			{query.trim() && (
				<div className="narrative-workspace__project-search-results">
					<div className="narrative-workspace__project-search-result-list">
						{results.length === 0 ? (
							<small>Совпадений нет.</small>
						) : (
							results.map(result => {
								const storySelected =
									result.kind === 'story-node' && selectedStoryIds.includes(result.id);
								const storyNode =
									result.kind === 'story-node'
										? project.storyNodes.find(node => node.id === result.id)
										: undefined;
								return (
									<div
										key={result.key}
										className={`narrative-workspace__project-search-result${activeKey === result.key ? ' is-active' : ''}`}
									>
										{result.kind === 'story-node' && (
											<input
												type="checkbox"
												aria-label={`Выбрать ${result.title} для bulk edit`}
												checked={storySelected}
												onChange={() => toggleStorySelection(result.id)}
											/>
										)}
										<div>
											<strong>{result.title}</strong>
											<small>{kindLabels[result.kind]}{result.detail ? ` · ${result.detail}` : ''}</small>
										</div>
										<button type="button" onClick={() => applyDocumentNavigation(result)}>
											Открыть
										</button>
										{storyNode?.placement?.day !== undefined &&
											storyNode.placement.minuteOfDay !== undefined && (
												<button type="button" onClick={() => showStoryNodeInTime(result)}>
													Во времени
												</button>
											)}
									</div>
								);
							})
						)}
					</div>

					<div className="narrative-workspace__project-search-references">
						<strong>Back-references</strong>
						{!activeDocument ? (
							<small>Открой результат, чтобы увидеть authored ссылки на него.</small>
						) : backReferences.length === 0 ? (
							<small>Прямых ссылок не найдено.</small>
						) : (
							backReferences.slice(0, 30).map(reference => {
								const referencedDocument = indexByKey.get(reference.key);
								return (
									<button
										key={reference.key}
										type="button"
										disabled={!referencedDocument}
										onClick={() =>
											referencedDocument && applyDocumentNavigation(referencedDocument)
										}
									>
										{kindLabels[reference.kind]} · {reference.title}
									</button>
								);
							})
						)}
					</div>
				</div>
			)}

			<div className="narrative-workspace__bulk-authoring">
				<strong>Bulk Story edit</strong>
				<span>Выбрано: {selectedStoryIds.length}</span>
				<select
					aria-label="Локация для выбранных Story nodes"
					value={bulkLocationId}
					onChange={event => setBulkLocationId(event.target.value)}
				>
					<option value="">Без локации</option>
					{project.locations.map(location => (
						<option key={location.id} value={location.id}>
							{location.name}
						</option>
					))}
				</select>
				<button type="button" onClick={applyBulkLocation} disabled={selectedStoryIds.length === 0}>
					Применить локацию одним Undo-шагом
				</button>
				<button type="button" onClick={() => setSelectedStoryIds([])} disabled={selectedStoryIds.length === 0}>
					Снять выбор
				</button>
			</div>
		</section>
	);
};
