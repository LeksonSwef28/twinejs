import * as React from 'react';
import {
	createNarrativeReactionDecisionOpportunity,
	evaluateNarrativeNpcDecision
} from '../../../application/narrative/npc-decision';
import {createNarrativeSimulationDebugSnapshot} from '../../../application/narrative/debug-snapshot';
import {
	NarrativeProjectMoveResolutionTrace,
	resolveNarrativeProjectMove
} from '../../../application/narrative/living-simulation';
import {advanceNarrativeProjectSimulation} from '../../../application/narrative/simulation';
import {formatMinuteOfDay, minutesPerDay} from '../../../domain/narrative/calendar';
import {NpcDecisionSelectionTrace} from '../../../domain/narrative/npc-decision';
import {
	SimulationScheduledWork,
	SimulationStepTrace
} from '../../../domain/narrative/simulation-kernel';
import {useNarrativeProject} from '../../../store/narrative-project';
import './simulation-debug-panel.css';

export interface SimulationDebugPanelProps {
	open: boolean;
	onClose(): void;
}

function percent(value: number) {
	return `${Math.round(value * 100)}%`;
}

function momentLabel(day: number, minuteOfDay: number) {
	return `День ${day} · ${formatMinuteOfDay(minuteOfDay)}`;
}

export const SimulationDebugPanel: React.FC<SimulationDebugPanelProps> = ({
	open,
	onClose
}) => {
	const {project, replaceRuntimeProject, execute} = useNarrativeProject();
	const [playing, setPlaying] = React.useState(false);
	const [lastDueWork, setLastDueWork] = React.useState<SimulationScheduledWork[]>([]);
	const [simulationTrace, setSimulationTrace] =
		React.useState<SimulationStepTrace>();
	const [moveTrace, setMoveTrace] =
		React.useState<NarrativeProjectMoveResolutionTrace>();
	const [npcTrace, setNpcTrace] =
		React.useState<NpcDecisionSelectionTrace>();
	const snapshot = React.useMemo(
		() => createNarrativeSimulationDebugSnapshot(project),
		[project]
	);
	const maximumAbsoluteMinute = project.template.dayCount * minutesPerDay - 1;
	const currentAbsoluteMinute =
		(project.simulation.day - 1) * minutesPerDay + project.simulation.minuteOfDay;
	const atProjectEnd = currentAbsoluteMinute >= maximumAbsoluteMinute;

	const advance = React.useCallback(
		(minutes: number) => {
			const result = advanceNarrativeProjectSimulation(project, minutes);
			replaceRuntimeProject(result.project);
			setLastDueWork(result.dueWork);
			setSimulationTrace(result.trace);
			if (result.trace.appliedMinutes === 0 || result.trace.clampedAtProjectEnd) {
				setPlaying(false);
			}
		},
		[project, replaceRuntimeProject]
	);

	React.useEffect(() => {
		if (!open || !playing || atProjectEnd) {
			return;
		}
		const timeout = window.setTimeout(() => advance(5), 450);
		return () => window.clearTimeout(timeout);
	}, [advance, atProjectEnd, open, playing]);

	React.useEffect(() => {
		if (!open) {
			setPlaying(false);
		}
	}, [open]);

	if (!open) {
		return null;
	}

	function inspectMove(moveId: string) {
		setMoveTrace(resolveNarrativeProjectMove(project, moveId));
	}

	function inspectReactionSet(reactionSetId: string) {
		const opportunity = createNarrativeReactionDecisionOpportunity(
			project,
			reactionSetId,
			`debug:${reactionSetId}`,
			0
		);
		setNpcTrace(evaluateNarrativeNpcDecision(project, [opportunity]).selection);
	}

	function close() {
		setPlaying(false);
		onClose();
	}

	return (
		<aside className="simulation-debug" aria-label="Living Simulation playtest">
			<header className="simulation-debug__header">
				<div>
					<p className="simulation-debug__eyebrow">Living Simulation · Playtest</p>
					<h2>{momentLabel(project.simulation.day, project.simulation.minuteOfDay)}</h2>
					<small>
						Runtime control surface · не третье workspace · authoring Undo не двигает Playhead
					</small>
				</div>
				<button type="button" onClick={close} aria-label="Закрыть playtest panel">
					Закрыть
				</button>
			</header>

			<section className="simulation-debug__controls" aria-label="Simulation Playhead controls">
				<button
					type="button"
					className={playing ? 'is-active' : undefined}
					disabled={atProjectEnd}
					onClick={() => setPlaying(value => !value)}
				>
					{playing ? 'Пауза' : 'Play'}
				</button>
				{[1, 5, 30].map(minutes => (
					<button
						key={minutes}
						type="button"
						disabled={playing || atProjectEnd}
						onClick={() => advance(minutes)}
					>
						+{minutes} мин
					</button>
				))}
				<button
					type="button"
					onClick={() =>
						execute({
							type: 'editor/selectMoment',
							day: project.simulation.day,
							minuteOfDay: project.simulation.minuteOfDay
						})
					}
				>
					Просмотр → Playhead
				</button>
				{atProjectEnd && <strong>Конец 93-го дня</strong>}
			</section>

			<div className="simulation-debug__grid">
				<section className="simulation-debug__card is-wide">
					<h3>Персонажи · фактическое runtime-состояние</h3>
					{snapshot.characters.length === 0 ? (
						<p className="simulation-debug__empty">Персонажей пока нет.</p>
					) : (
						<div className="simulation-debug__character-grid">
							{snapshot.characters.map(character => (
								<article key={character.id} className="simulation-debug__character">
									<h4>{character.name}</h4>
									<dl>
										<dt>Actual presence</dt>
										<dd>{character.actualLocationName ?? character.actualLocationId ?? 'не задано'}</dd>
										<dt>Schedule intent</dt>
										<dd>{character.behaviorProfileId ?? 'нет активного профиля'}</dd>
										<dt>Настроение</dt>
										<dd>{character.mood ?? 'не задано'}</dd>
									</dl>
									{character.body ? (
										<div className="simulation-debug__body">
											<span>Усталость {percent(character.body.fatigue)}</span>
											<span>Сытость {percent(character.body.satiety)}</span>
											<span>Долг сна {Math.round(character.body.sleepDebtMinutes)} мин</span>
											<span>Пищеварение {character.body.digestionRemainingMinutes} мин</span>
										</div>
									) : (
										<p className="simulation-debug__empty">Body state ещё не создан.</p>
									)}
									<div className="simulation-debug__mini-section">
										<strong>Травмы · {character.injuries.length}</strong>
										{character.injuries.map(injury => (
											<span key={injury.id}>
												{injury.kind} / {injury.region} · {injury.pain} · {injury.recoveryRemainingMinutes} мин
											</span>
										))}
									</div>
									<div className="simulation-debug__mini-section">
										<strong>Инвентарь · {character.items.length}</strong>
										{character.items.map(item => (
											<span key={item.id}>{item.name} — {item.placement}</span>
										))}
									</div>
									<div className="simulation-debug__metrics">
										<span>Knowledge {character.knowledgeCount}</span>
										<span>Memories {character.memoryCount}</span>
										<span>Pending {character.pendingReactionCount}</span>
									</div>
								</article>
							))}
						</div>
					)}
				</section>

				<section className="simulation-debug__card">
					<h3>Due work</h3>
					<strong>Последний шаг</strong>
					{lastDueWork.length === 0 ? (
						<p className="simulation-debug__empty">На последнем шаге ничего не стало due.</p>
					) : (
						<ul>
							{lastDueWork.map(work => (
								<li key={work.id}>{work.id} · {momentLabel(work.moment.day, work.moment.minuteOfDay)}</li>
							))}
						</ul>
					)}
					<strong>Ближайшее расписанное</strong>
					<ul>
						{snapshot.upcomingWork.slice(0, 10).map(work => (
							<li key={work.id}>{work.id} · {momentLabel(work.moment.day, work.moment.minuteOfDay)}</li>
						))}
					</ul>
				</section>

				<section className="simulation-debug__card">
					<h3>Active executions</h3>
					{snapshot.activeExecutions.length === 0 ? (
						<p className="simulation-debug__empty">Активных Story-действий нет.</p>
					) : (
						<ul>
							{snapshot.activeExecutions.map(execution => (
								<li key={execution.id}>
									{execution.storyNodeId} · до {momentLabel(execution.completesAt.day, execution.completesAt.minuteOfDay)}
								</li>
							))}
						</ul>
					)}
				</section>

				<section className="simulation-debug__card is-wide">
					<h3>Runtime Story state</h3>
					<div className="simulation-debug__story-list">
						{snapshot.story.map(node => (
							<div key={node.id} className="simulation-debug__story-row">
								<strong>{node.title}</strong>
								<code>{node.id}</code>
								<span>authored: {node.authoredState}</span>
								<span>runtime: {node.runtimeState}</span>
							</div>
						))}
					</div>
				</section>

				<section className="simulation-debug__card is-wide">
					<h3>Occurrence history · applied runtime effects</h3>
					{snapshot.recentOccurrences.length === 0 ? (
						<p className="simulation-debug__empty">Occurrence history пуста.</p>
					) : (
						<ol reversed>
							{[...snapshot.recentOccurrences].reverse().map(occurrence => (
								<li key={occurrence.id}>
									{occurrence.type === 'move-outcome' ? (
										<>
											<strong>{occurrence.moveId} → {occurrence.outcomeId}</strong>{' '}
											<span>effects: {occurrence.effectIds.join(', ') || 'none'}</span>
										</>
									) : (
										<strong>{occurrence.workId} · {occurrence.result}</strong>
									)}{' '}
									<small>{momentLabel(occurrence.moment.day, occurrence.moment.minuteOfDay)}</small>
								</li>
							))}
						</ol>
					)}
				</section>

				<section className="simulation-debug__card">
					<h3>Move resolution trace</h3>
					<div className="simulation-debug__button-list">
						{project.narrativeMoves.map(move => (
							<button key={move.id} type="button" onClick={() => inspectMove(move.id)}>
								Проверить · {move.label}
							</button>
						))}
					</div>
					{moveTrace && <pre>{JSON.stringify(moveTrace, null, 2)}</pre>}
				</section>

				<section className="simulation-debug__card">
					<h3>NPC decision trace</h3>
					<p className="simulation-debug__hint">
						Read-only debug evaluation: стоимость действий = 0, ничего не исполняется.
					</p>
					<div className="simulation-debug__button-list">
						{project.reactionCandidateSets.map(set => (
							<button key={set.id} type="button" onClick={() => inspectReactionSet(set.id)}>
								Оценить · {set.id}
							</button>
						))}
					</div>
					{npcTrace && <pre>{JSON.stringify(npcTrace, null, 2)}</pre>}
				</section>

				<section className="simulation-debug__card is-wide">
					<h3>Simulation step trace</h3>
					{simulationTrace ? (
						<pre>{JSON.stringify(simulationTrace, null, 2)}</pre>
					) : (
						<p className="simulation-debug__empty">Сделайте шаг симуляции.</p>
					)}
				</section>
			</div>
		</aside>
	);
};
