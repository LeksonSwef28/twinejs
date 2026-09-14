import * as React from 'react';
import {storyBrainNavigationForFinding} from '../../../application/narrative/story-brain-diagnostic-navigation';
import {
	queryStoryBrain,
	queryStoryBrainProjectDiagnostics,
	storyBrainEntityCount,
	StoryBrainFinding,
	StoryBrainQueryResult
} from '../../../application/narrative/story-brain-query';
import {NarrativeProject} from '../../../domain/narrative/project';
import {
	StoryBrainEntityKind,
	StoryBrainEntityRef
} from '../../../domain/narrative/story-brain';
import {storyCanvasViewportForNode} from '../../../domain/narrative/workspace-navigation';
import {useNarrativeProject} from '../../../store/narrative-project';
import './story-brain-panel.css';

const kindLabels: Record<StoryBrainEntityKind, string> = {
	['story-node']: 'Story',
	move: 'Moves',
	claim: 'Claims',
	character: 'Персонажи',
	item: 'Предметы'
};

const availabilityLabels = {
	available: 'Доступно',
	blocked: 'Заблокировано',
	unknown: 'Неизвестно'
};

function focusValue(focus: StoryBrainEntityRef) {
	return `${focus.kind}:${focus.id}`;
}

function parseFocus(value: string): StoryBrainEntityRef | undefined {
	const separator = value.indexOf(':');
	if (separator <= 0) {
		return undefined;
	}
	const kind = value.slice(0, separator) as StoryBrainEntityKind;
	const id = value.slice(separator + 1);
	if (!id || !Object.prototype.hasOwnProperty.call(kindLabels, kind)) {
		return undefined;
	}
	return {kind, id};
}

function entityLabel(project: NarrativeProject, entity: StoryBrainEntityRef) {
	switch (entity.kind) {
		case 'story-node':
			return project.storyNodes.find(node => node.id === entity.id)?.title ?? entity.id;
		case 'move':
			return project.narrativeMoves.find(move => move.id === entity.id)?.label ?? entity.id;
		case 'claim':
			return project.claims.find(claim => claim.id === entity.id)?.text ?? entity.id;
		case 'character':
			return project.characters.find(character => character.id === entity.id)?.name ?? entity.id;
		case 'item': {
			const item = project.itemInstances.find(instance => instance.id === entity.id);
			return (
				project.itemDefinitions.find(definition => definition.id === item?.definitionId)
					?.name ?? entity.id
			);
		}
	}
}

function storyNodeLabel(project: NarrativeProject, storyNodeId: string) {
	return project.storyNodes.find(node => node.id === storyNodeId)?.title ?? storyNodeId;
}

export const StoryBrainPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
	const [selectedFocus, setSelectedFocus] = React.useState('');
	const focus = React.useMemo(() => parseFocus(selectedFocus), [selectedFocus]);
	const result: StoryBrainQueryResult | undefined = React.useMemo(
		() => (focus ? queryStoryBrain(project, focus) : undefined),
		[focus, project]
	);
	const projectDiagnostics = React.useMemo(
		() => result?.projectDiagnostics ?? queryStoryBrainProjectDiagnostics(project),
		[project, result]
	);

	React.useEffect(() => {
		if (selectedFocus) {
			return;
		}
		const firstNode = project.storyNodes[0];
		if (firstNode) {
			setSelectedFocus(focusValue({kind: 'story-node', id: firstNode.id}));
		}
	}, [project.storyNodes, selectedFocus]);

	const impactCounts = React.useMemo(() => {
		if (!result) {
			return undefined;
		}
		return (Object.keys(kindLabels) as StoryBrainEntityKind[]).map(kind => ({
			kind,
			count: result.impact.hits.filter(hit => hit.entity.kind === kind).length
		}));
	}, [result]);

	function jumpToFinding(finding: StoryBrainFinding) {
		const navigation = storyBrainNavigationForFinding(project, finding);
		if (!navigation) {
			return;
		}
		setSelectedFocus(focusValue(navigation.focus));
		execute({type: 'editor/selectWorkspace', workspace: 'story'});

		if (!navigation.canvasEntityRef) {
			return;
		}
		const visual = project.editor.storyCanvas?.nodes.find(
			node =>
				node.entityRef?.type === navigation.canvasEntityRef?.type &&
				node.entityRef.id === navigation.canvasEntityRef.id
		);
		if (!visual) {
			return;
		}
		execute({
			type: 'editor/setStoryViewport',
			viewport: storyCanvasViewportForNode(
				visual.position,
				project.editor.storyCanvas?.viewport.zoom
			)
		});
	}

	function renderFinding(finding: StoryBrainFinding) {
		const navigation = storyBrainNavigationForFinding(project, finding);
		return (
			<li key={finding.id} data-severity={finding.severity}>
				<span>{finding.severity === 'warning' ? '⚠' : '•'}</span>
				<div>
					<strong>{finding.summary}</strong>
					<small>{finding.kind}</small>
				</div>
				{navigation && (
					<button type="button" onClick={() => jumpToFinding(finding)}>
						К источнику
					</button>
				)}
			</li>
		);
	}

	return (
		<section className="narrative-workspace__story-brain" aria-label="Story Brain">
			<header className="narrative-workspace__story-brain-header">
				<div>
					<span>STORY BRAIN</span>
					<h2>Focus · Impact · Why · Coverage · Bridges</h2>
				</div>
				<small>read-only analysis</small>
			</header>

			<div className="narrative-workspace__story-brain-focus-picker">
				<label htmlFor="story-brain-focus">Анализировать</label>
				<select
					id="story-brain-focus"
					value={selectedFocus}
					onChange={event => setSelectedFocus(event.target.value)}
				>
					<option value="">Выбери Story / Move / Claim / Character / Item</option>
					<optgroup label="Story nodes">
						{project.storyNodes.map(node => (
							<option key={node.id} value={focusValue({kind: 'story-node', id: node.id})}>
								{node.title}
							</option>
						))}
					</optgroup>
					<optgroup label="Narrative Moves">
						{project.narrativeMoves.map(move => (
							<option key={move.id} value={focusValue({kind: 'move', id: move.id})}>
								{move.label}
							</option>
						))}
					</optgroup>
					<optgroup label="Claims">
						{project.claims.map(claim => (
							<option key={claim.id} value={focusValue({kind: 'claim', id: claim.id})}>
								{claim.text}
							</option>
						))}
					</optgroup>
					<optgroup label="Персонажи">
						{project.characters.map(character => (
							<option key={character.id} value={focusValue({kind: 'character', id: character.id})}>
								{character.name}
							</option>
						))}
					</optgroup>
					<optgroup label="Предметы">
						{project.itemInstances.map(item => (
							<option key={item.id} value={focusValue({kind: 'item', id: item.id})}>
								{project.itemDefinitions.find(definition => definition.id === item.definitionId)?.name ?? item.id}
							</option>
						))}
					</optgroup>
				</select>
			</div>

			<article className="narrative-workspace__story-brain-project-diagnostics">
				<h3>PROJECT DIAGNOSTICS</h3>
				<p>
					Полный read-only список структурных и authored-reference проблем проекта.
					 Он не зависит от текущего Focus, поэтому глобальные ошибки не скрываются
					 за одним локальным контекстом.
				</p>
				{projectDiagnostics.findings.length > 0 ? (
					<ul className="narrative-workspace__story-brain-finding-list">
						{projectDiagnostics.findings.slice(0, 12).map(renderFinding)}
					</ul>
				) : (
					<small>Структурных и authored-reference диагностик по проекту не найдено.</small>
				)}
				<small>
					Всего диагностик по проекту: {projectDiagnostics.findingCount}.
					{projectDiagnostics.findingCount > 12
						? ' Показаны первые 12.'
						: ''}
				</small>
			</article>

			{result ? (
				<div className="narrative-workspace__story-brain-grid">
					<article>
						<h3>FOCUS</h3>
						<p>
							Семантический контекст выбранного элемента. Reference-связи здесь
							 учитываются, потому что они полезны для понимания истории.
						</p>
						<div className="narrative-workspace__story-brain-metrics">
							{(Object.keys(kindLabels) as StoryBrainEntityKind[]).map(kind => (
								<div key={kind}>
									<span>{kindLabels[kind]}</span>
									<strong>{storyBrainEntityCount(result.focus.entities, kind)}</strong>
								</div>
							))}
						</div>
						<small>{result.focus.relationCount} найденных связей в Focus-окне.</small>
					</article>

					<article>
						<h3>IMPACT</h3>
						<p>
							Только реальные зависимости и причинные направления. Обычная
							 reference-линия не считается последствием.
						</p>
						<div className="narrative-workspace__story-brain-metrics">
							{impactCounts?.map(({kind, count}) => (
								<div key={kind}>
									<span>{kindLabels[kind]}</span>
									<strong>{count}</strong>
								</div>
							))}
						</div>
						{result.impact.hits.length > 0 ? (
							<ul className="narrative-workspace__story-brain-impact-list">
								{result.impact.hits.slice(0, 8).map(hit => (
									<li key={`${hit.entity.kind}:${hit.entity.id}`}>
										<strong>{entityLabel(project, hit.entity)}</strong>
										<small>
											{kindLabels[hit.entity.kind]} · {hit.via}
										</small>
									</li>
								))}
							</ul>
						) : (
							<small>Нет downstream-зависимостей в текущей модели.</small>
						)}
					</article>

					<article className="narrative-workspace__story-brain-why">
						<h3>WHY</h3>
						<p>
							Доступность считается по текущему preview/runtime. Авторские Guards
							 не изменяют состояние — Brain только объясняет их.
						</p>
						{result.why.moves.length > 0 ? (
							<div className="narrative-workspace__story-brain-why-list">
								{result.why.moves.map(move => (
									<div key={move.moveId}>
										<div className="narrative-workspace__story-brain-why-heading">
											<strong>{move.label}</strong>
											<span data-status={move.availability}>
												{availabilityLabels[move.availability]}
											</span>
										</div>
										{move.guardTraces.map(trace => (
											<p key={trace.guardId} data-status={trace.status}>
												{trace.status === 'met' ? '✓' : trace.status === 'unmet' ? '✕' : '?'}{' '}
												{trace.label ? `${trace.label}: ` : ''}
												{trace.summary}
											</p>
										))}
										{move.guardTraces.length === 0 && <p>✓ Нет Eligibility Guards.</p>}
										<p className="narrative-workspace__story-brain-resolution">
											Resolution: {move.resolutionSummary}
										</p>
										{move.resolutionCondition && (
											<p data-status={move.resolutionCondition.status}>
												{move.resolutionCondition.summary}
											</p>
										)}
									</div>
								))}
							</div>
						) : (
							<small>Для этого Focus пока нет связанных Narrative Moves.</small>
						)}
					</article>

					<article className="narrative-workspace__story-brain-coverage">
						<h3>COVERAGE</h3>
						<p>
							Ищет пустые исходы, асимметрию веток, ранние окончания и битые
							 authored-ссылки, включая зависимости Reaction Candidate Sets.
						</p>
						{result.coverage.findings.length > 0 ? (
							<ul className="narrative-workspace__story-brain-finding-list">
								{result.coverage.findings.slice(0, 8).map(renderFinding)}
							</ul>
						) : (
							<small>В выбранном контексте Coverage-проблем не найдено.</small>
						)}
						<small>
							Всего диагностик по проекту: {result.coverage.projectFindingCount}.
						</small>
					</article>

					<article className="narrative-workspace__story-brain-bridges">
						<h3>BRIDGES</h3>
						<p>
							Предлагает только уже существующий материал проекта. Ничего не
							 создаётся и не соединяется автоматически.
						</p>
						{result.bridges.candidates.length > 0 ? (
							<ul className="narrative-workspace__story-brain-bridge-list">
								{result.bridges.candidates.map(candidate => (
									<li key={candidate.storyNodeId}>
										<div className="narrative-workspace__story-brain-bridge-heading">
											<strong>{storyNodeLabel(project, candidate.storyNodeId)}</strong>
											<span>score {candidate.score}</span>
										</div>
										{candidate.reasons.map(reason => (
											<small key={`${reason.kind}:${reason.summary}`}>
												+{reason.weight} · {reason.summary}
											</small>
										))}
									</li>
								))}
							</ul>
						) : (
							<small>Убедительных мостов из существующего материала пока нет.</small>
						)}
					</article>
				</div>
			) : (
				<p className="narrative-workspace__story-brain-empty">
					Создай или выбери Story node, Narrative Move или Claim — Brain покажет
					 его контекст, последствия, причины доступности, Coverage и Bridges.
				</p>
			)}
		</section>
	);
};
