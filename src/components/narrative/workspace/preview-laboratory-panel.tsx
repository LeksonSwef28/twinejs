import * as React from 'react';
import {
	PreviewScenario,
	advancePreviewScenario,
	comparePreviewScenarios,
	createPreviewScenario,
	executePreviewMove,
	forcePreviewOutcome,
	forkPreviewScenario,
	inspectPreviewScenarioChanges,
	resetPreviewScenario,
	setPreviewRuntimeInput,
	tracePreviewMove
} from '../../../application/narrative/preview-laboratory';
import {NarrativeProjectMoveResolutionTrace} from '../../../application/narrative/living-simulation';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {KnowledgeAttitude} from '../../../domain/narrative/knowledge';
import {useNarrativeProject} from '../../../store/narrative-project';
import './preview-laboratory-panel.css';

const knowledgeAttitudes: KnowledgeAttitude[] = [
	'knows',
	'believes',
	'doubts',
	'disbelieves'
];

type PreviewLaboratoryLayer = 'preview' | 'analysis' | 'debug';

function scenarioLabel(scenario: PreviewScenario) {
	return `${scenario.name} · день ${scenario.project.simulation.day} ${formatMinuteOfDay(
		scenario.project.simulation.minuteOfDay
	)}`;
}

function moveStatusCopy(trace: NarrativeProjectMoveResolutionTrace) {
	switch (trace.status) {
		case 'resolved':
			return 'Move доступен: authored resolver выбрал результат.';
		case 'blocked':
			return 'Move заблокирован текущим runtime-состоянием.';
		case 'unknown':
			return 'Недостаточно runtime-данных, чтобы определить результат Move.';
		case 'input-required':
			return 'Для разрешения Move нужны явные test-only входные данные.';
	}
}

function guardStatusCopy(status: NarrativeProjectMoveResolutionTrace['guardTraces'][number]['status']) {
	switch (status) {
		case 'met':
			return 'выполнен';
		case 'unmet':
			return 'блокирует';
		case 'unknown':
			return 'неизвестен';
	}
}

function MoveTraceSummary({
	trace,
	detailed = false
}: {
	trace?: NarrativeProjectMoveResolutionTrace;
	detailed?: boolean;
}) {
	if (!trace) {
		return (
			<p className="simulation-debug__empty">
				Запустите Trace only, чтобы проверить Move без изменения sandbox.
			</p>
		);
	}

	return (
		<div className={`preview-lab__diagnostic is-${trace.status}`}>
			<strong>{moveStatusCopy(trace)}</strong>
			<p>{trace.resolutionSummary}</p>
			{trace.outcomeId && (
				<p>
					Authored Outcome: <code>{trace.outcomeId}</code>
				</p>
			)}
			{detailed && (
				<div>
					<h4>Почему?</h4>
					{trace.guardTraces.length ? (
						<ul aria-label="Move diagnostic reasons">
							{trace.guardTraces.map(guard => (
								<li key={guard.guardId}>
									<strong>{guard.label ?? guard.guardId}</strong> — {guardStatusCopy(guard.status)}.{' '}
									{guard.summary}
								</li>
							))}
						</ul>
					) : (
						<p className="simulation-debug__empty">У Move нет authored guards.</p>
					)}
				</div>
			)}
		</div>
	);
}

export const PreviewLaboratoryPanel: React.FC = () => {
	const {project} = useNarrativeProject();
	const [scenarios, setScenarios] = React.useState<PreviewScenario[]>(() => [
		createPreviewScenario(project, 'preview-main', 'Main')
	]);
	const [activeId, setActiveId] = React.useState('preview-main');
	const [compareId, setCompareId] = React.useState('');
	const [layer, setLayer] = React.useState<PreviewLaboratoryLayer>('preview');
	const [selectedMoveId, setSelectedMoveId] = React.useState(
		project.narrativeMoves[0]?.id ?? ''
	);
	const [selectedOutcomeId, setSelectedOutcomeId] = React.useState('');
	const [trace, setTrace] = React.useState<NarrativeProjectMoveResolutionTrace>();
	const [lastOutcomeTrace, setLastOutcomeTrace] = React.useState<unknown>();
	const [dayInput, setDayInput] = React.useState(String(project.simulation.day));
	const [minuteInput, setMinuteInput] = React.useState(
		String(project.simulation.minuteOfDay)
	);
	const [characterId, setCharacterId] = React.useState(project.characters[0]?.id ?? '');
	const [locationId, setLocationId] = React.useState(project.locations[0]?.id ?? '');
	const [knowledgeCharacterId, setKnowledgeCharacterId] = React.useState(
		project.characters[0]?.id ?? ''
	);
	const [claimId, setClaimId] = React.useState(project.claims[0]?.id ?? '');
	const [knowledgeAttitude, setKnowledgeAttitude] =
		React.useState<KnowledgeAttitude>('believes');
	const [confidenceInput, setConfidenceInput] = React.useState('0.75');
	const [skillValueInput, setSkillValueInput] = React.useState('0');
	const [rollTotalInput, setRollTotalInput] = React.useState('0');
	const [error, setError] = React.useState<string>();
	const forkCounter = React.useRef(1);

	const active = scenarios.find(scenario => scenario.id === activeId) ?? scenarios[0];
	const compareScenario = scenarios.find(scenario => scenario.id === compareId);
	const selectedMove = active?.project.narrativeMoves.find(
		move => move.id === selectedMoveId
	);
	const changes = React.useMemo(
		() => (active ? inspectPreviewScenarioChanges(active) : undefined),
		[active]
	);
	const comparison = React.useMemo(
		() =>
			active && compareScenario && active.id !== compareScenario.id
				? comparePreviewScenarios(active, compareScenario)
				: undefined,
		[active, compareScenario]
	);

	React.useEffect(() => {
		if (!active) {
			return;
		}
		setDayInput(String(active.project.simulation.day));
		setMinuteInput(String(active.project.simulation.minuteOfDay));
		setTrace(undefined);
		setLastOutcomeTrace(undefined);
	}, [activeId]);

	React.useEffect(() => {
		if (selectedMove && !selectedMove.outcomes.some(outcome => outcome.id === selectedOutcomeId)) {
			setSelectedOutcomeId(selectedMove.outcomes[0]?.id ?? '');
		}
	}, [selectedMove, selectedOutcomeId]);

	if (!active) {
		return null;
	}

	function replaceActive(transform: (scenario: PreviewScenario) => PreviewScenario) {
		const replacement = transform(active);
		setScenarios(current =>
			current.map(scenario => (scenario.id === active.id ? replacement : scenario))
		);
		setTrace(undefined);
		setLastOutcomeTrace(undefined);
	}

	function run(operation: () => void) {
		try {
			setError(undefined);
			operation();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		}
	}

	function resolutionInput() {
		if (selectedMove?.resolution.type !== 'skill-check') {
			return {};
		}
		return {
			skillCheck: {
				skillValue: Number(skillValueInput),
				rollTotal: Number(rollTotalInput)
			}
		};
	}

	return (
		<section className="preview-lab" aria-label="Preview authoring laboratory">
			<header className="preview-lab__header">
				<div>
					<p className="simulation-debug__eyebrow">A51 · Preview / Debug Laboratory</p>
					<h3>Изолированные авторские сценарии</h3>
					<p className="simulation-debug__hint">
						Sandbox не сохраняется в Narrative Project и не создаёт authoring Undo/Redo entries.
						Deep Debug показывает сырой trace и Force Outcome только по явному выбору автора.
					</p>
				</div>
				<div className="preview-lab__scenario-actions">
					<button
						type="button"
						onClick={() =>
							run(() => {
								replaceActive(scenario =>
									createPreviewScenario(project, scenario.id, scenario.name)
								);
							})
						}
					>
						Set from live runtime
					</button>
					<button type="button" onClick={() => replaceActive(resetPreviewScenario)}>
						Reset
					</button>
					<button
						type="button"
						onClick={() => {
							const index = forkCounter.current++;
							const id = `preview-fork-${index}`;
							const fork = forkPreviewScenario(active, id, `Fork ${index}`);
							setScenarios(current => [...current, fork]);
							setCompareId(active.id);
							setActiveId(id);
						}}
					>
						Fork current
					</button>
				</div>
			</header>

			<div className="preview-lab__scenario-strip">
				<label>
					Active scenario
					<select value={active.id} onChange={event => setActiveId(event.target.value)}>
						{scenarios.map(scenario => (
							<option key={scenario.id} value={scenario.id}>
								{scenarioLabel(scenario)}
							</option>
						))}
					</select>
				</label>
			</div>

			<nav className="preview-lab__layers" role="tablist" aria-label="Preview laboratory layers">
				{([
					['preview', 'Preview'],
					['analysis', 'Analysis'],
					['debug', 'Deep Debug']
				] as const).map(([value, label]) => (
					<button
						key={value}
						type="button"
						role="tab"
						aria-selected={layer === value}
						onClick={() => setLayer(value)}
					>
						{label}
					</button>
				))}
			</nav>

			{error && <p className="preview-lab__error">{error}</p>}

			{layer === 'preview' && (
				<div className="preview-lab__grid" role="tabpanel" aria-label="Preview">
					<section className="simulation-debug__card">
						<h3>Move preview</h3>
						<label className="preview-lab__select-field">
							Move
							<select
								value={selectedMoveId}
								onChange={event => {
									setSelectedMoveId(event.target.value);
									setTrace(undefined);
									setLastOutcomeTrace(undefined);
								}}
							>
								<option value="">Choose Move</option>
								{active.project.narrativeMoves.map(move => (
									<option key={move.id} value={move.id}>
										{move.label}
									</option>
								))}
							</select>
						</label>
						{selectedMove?.resolution.type === 'skill-check' && (
							<div className="preview-lab__fields">
								<label>
									Skill value
									<input
										type="number"
										value={skillValueInput}
										onChange={event => {
											setSkillValueInput(event.target.value);
											setTrace(undefined);
											setLastOutcomeTrace(undefined);
										}}
									/>
								</label>
								<label>
									Roll total
									<input
										type="number"
										value={rollTotalInput}
										onChange={event => {
											setRollTotalInput(event.target.value);
											setTrace(undefined);
											setLastOutcomeTrace(undefined);
										}}
									/>
								</label>
							</div>
						)}
						<div className="preview-lab__button-row">
							<button
								type="button"
								disabled={!selectedMoveId}
								onClick={() =>
									run(() =>
										setTrace(tracePreviewMove(active, selectedMoveId, resolutionInput()))
									)
								}
							>
								Trace only
							</button>
							<button
								type="button"
								disabled={!selectedMoveId}
								onClick={() =>
									run(() => {
										const result = executePreviewMove(
											active,
											selectedMoveId,
											resolutionInput()
										);
										setTrace(result.resolution);
										setLastOutcomeTrace(result.outcomeTrace);
										setScenarios(current =>
											current.map(scenario =>
												scenario.id === active.id ? result.scenario : scenario
											)
										);
									})
								}
							>
								Resolve + apply authored
							</button>
						</div>
						<MoveTraceSummary trace={trace} />
					</section>

					<section className="simulation-debug__card">
						<h3>Current preview context</h3>
						<p>{scenarioLabel(active)}</p>
						<p>
							Changed runtime paths: <strong>{changes?.changedPaths.length ?? 0}</strong>
						</p>
						<p>
							New occurrences: <strong>{changes?.newOccurrenceIds.length ?? 0}</strong>
						</p>
						<p>
							Laboratory actions: <strong>{changes?.actionCount ?? 0}</strong>
						</p>
					</section>
				</div>
			)}

			{layer === 'analysis' && (
				<div className="preview-lab__grid" role="tabpanel" aria-label="Analysis">
					<section className="simulation-debug__card">
						<h3>Move analysis</h3>
						<MoveTraceSummary trace={trace} detailed />
					</section>

					<section className="simulation-debug__card">
						<h3>Test-only runtime inputs</h3>
						<div className="preview-lab__fields">
							<label>
								Day
								<input
									type="number"
									min={1}
									max={active.project.template.dayCount}
									value={dayInput}
									onChange={event => setDayInput(event.target.value)}
								/>
							</label>
							<label>
								Minute
								<input
									type="number"
									min={0}
									max={1439}
									value={minuteInput}
									onChange={event => setMinuteInput(event.target.value)}
								/>
							</label>
						</div>
						<button
							type="button"
							onClick={() =>
								run(() =>
									replaceActive(scenario =>
										setPreviewRuntimeInput(scenario, {
											type: 'moment',
											day: Number(dayInput),
											minuteOfDay: Number(minuteInput)
										})
									)
								)
							}
						>
							Set test moment
						</button>

						<div className="preview-lab__fields">
							<label>
								Character
								<select
									value={characterId}
									onChange={event => setCharacterId(event.target.value)}
								>
									{active.project.characters.map(character => (
										<option key={character.id} value={character.id}>
											{character.name}
										</option>
									))}
								</select>
							</label>
							<label>
								Actual location
								<select
									value={locationId}
									onChange={event => setLocationId(event.target.value)}
								>
									<option value="">unset</option>
									{active.project.locations.map(location => (
										<option key={location.id} value={location.id}>
											{location.name}
										</option>
									))}
								</select>
							</label>
						</div>
						<button
							type="button"
							disabled={!characterId}
							onClick={() =>
								run(() =>
									replaceActive(scenario =>
										setPreviewRuntimeInput(scenario, {
											type: 'actual-location',
											characterId,
											locationId: locationId || undefined
										})
									)
								)
							}
						>
							Set test presence
						</button>

						{active.project.claims.length > 0 && active.project.characters.length > 0 && (
							<>
								<div className="preview-lab__fields">
									<label>
										Knowledge character
										<select
											value={knowledgeCharacterId}
											onChange={event => setKnowledgeCharacterId(event.target.value)}
										>
											{active.project.characters.map(character => (
												<option key={character.id} value={character.id}>
													{character.name}
												</option>
											))}
										</select>
									</label>
									<label>
										Claim
										<select value={claimId} onChange={event => setClaimId(event.target.value)}>
											{active.project.claims.map(claim => (
												<option key={claim.id} value={claim.id}>
													{claim.text}
												</option>
											))}
										</select>
									</label>
									<label>
										Attitude
										<select
											value={knowledgeAttitude}
											onChange={event =>
												setKnowledgeAttitude(event.target.value as KnowledgeAttitude)
											}
										>
											{knowledgeAttitudes.map(attitude => (
												<option key={attitude} value={attitude}>
													{attitude}
												</option>
											))}
										</select>
									</label>
									<label>
										Confidence
										<input
											type="number"
											min={0}
											max={1}
											step={0.05}
											value={confidenceInput}
											onChange={event => setConfidenceInput(event.target.value)}
										/>
									</label>
								</div>
								<div className="preview-lab__button-row">
									<button
										type="button"
										onClick={() =>
											run(() =>
												replaceActive(scenario =>
													setPreviewRuntimeInput(scenario, {
														type: 'knowledge',
														characterId: knowledgeCharacterId,
														claimId,
														attitude: knowledgeAttitude,
														confidence: Number(confidenceInput)
													})
												)
											)
										}
									>
										Set test knowledge
									</button>
									<button
										type="button"
										onClick={() =>
											run(() =>
												replaceActive(scenario =>
													setPreviewRuntimeInput(scenario, {
														type: 'forget-claim',
														characterId: knowledgeCharacterId,
														claimId
													})
												)
											)
										}
									>
										Forget in sandbox
									</button>
								</div>
							</>
						)}
					</section>

					<section className="simulation-debug__card">
						<h3>Sandbox time & changes</h3>
						<p>{scenarioLabel(active)}</p>
						<div className="preview-lab__button-row">
							{[1, 5, 30].map(minutes => (
								<button
									key={minutes}
									type="button"
									onClick={() =>
										run(() =>
											replaceActive(scenario => advancePreviewScenario(scenario, minutes))
										)
									}
								>
									+{minutes} мин
								</button>
							))}
						</div>
						<h4>Changes from scenario baseline</h4>
						{changes?.changedPaths.length ? (
							<ul>
								{changes.changedPaths.slice(0, 50).map(path => (
									<li key={path}>
										<code>{path}</code>
									</li>
								))}
							</ul>
						) : (
							<p className="simulation-debug__empty">Runtime не отличается от baseline.</p>
						)}
						{changes && (
							<small>
								New occurrences: {changes.newOccurrenceIds.length} · lab actions: {changes.actionCount}
							</small>
						)}
					</section>

					<section className="simulation-debug__card">
						<h3>Scenario comparison</h3>
						<label className="preview-lab__select-field">
							Compare with
							<select value={compareId} onChange={event => setCompareId(event.target.value)}>
								<option value="">—</option>
								{scenarios
									.filter(scenario => scenario.id !== active.id)
									.map(scenario => (
										<option key={scenario.id} value={scenario.id}>
											{scenario.name}
										</option>
									))}
							</select>
						</label>
						{comparison ? (
							<>
								<p>
									{active.name} ↔ {compareScenario?.name}
								</p>
								{comparison.changedPaths.length ? (
									<ul>
										{comparison.changedPaths.slice(0, 50).map(path => (
											<li key={path}>
												<code>{path}</code>
											</li>
										))}
									</ul>
								) : (
									<p className="simulation-debug__empty">Runtime states совпадают.</p>
								)}
							</>
						) : (
							<p className="simulation-debug__empty">
								Создайте fork и выберите сценарий для сравнения.
							</p>
						)}
					</section>
				</div>
			)}

			{layer === 'debug' && (
				<div className="preview-lab__grid" role="tabpanel" aria-label="Deep Debug">
					<section className="simulation-debug__card">
						<h3>Raw Move trace</h3>
						{trace ? (
							<pre>{JSON.stringify(trace, null, 2)}</pre>
						) : (
							<p className="simulation-debug__empty">Trace ещё не запускался.</p>
						)}
					</section>

					<section className="simulation-debug__card">
						<h3>Force authored Outcome · inspection only</h3>
						<select
							value={selectedOutcomeId}
							onChange={event => setSelectedOutcomeId(event.target.value)}
						>
							<option value="">Choose Outcome</option>
							{selectedMove?.outcomes.map(outcome => (
								<option key={outcome.id} value={outcome.id}>
									{outcome.label}
								</option>
							))}
						</select>
						<button
							type="button"
							disabled={!selectedMoveId || !selectedOutcomeId}
							onClick={() =>
								run(() => {
									const result = forcePreviewOutcome(active, selectedMoveId, selectedOutcomeId);
									setTrace(undefined);
									setLastOutcomeTrace(result.trace);
									setScenarios(current =>
										current.map(scenario =>
											scenario.id === active.id ? result.scenario : scenario
										)
									);
								})
							}
						>
							Force Outcome
						</button>
						{lastOutcomeTrace && <pre>{JSON.stringify(lastOutcomeTrace, null, 2)}</pre>}
					</section>

					<section className="simulation-debug__card is-wide">
						<h3>Preview provenance</h3>
						<div className="preview-lab__provenance">
							<div>
								<h4>Laboratory actions</h4>
								<ol>
									{active.actions.map(entry => (
										<li key={entry.id}>
											<strong>{entry.kind}</strong> · {entry.summary}
											{entry.occurrenceId && (
												<code> occurrence {entry.occurrenceId}</code>
											)}
										</li>
									))}
								</ol>
							</div>
							<div>
								<h4>Runtime occurrences</h4>
								{active.project.runtimeOccurrences.length ? (
									<ol>
										{active.project.runtimeOccurrences.slice(-20).map(occurrence => (
											<li key={occurrence.id}>
												<code>{occurrence.id}</code> · {occurrence.type}
											</li>
										))}
									</ol>
								) : (
									<p className="simulation-debug__empty">Occurrence history пуста.</p>
								)}
							</div>
						</div>
					</section>
				</div>
			)}
		</section>
	);
};
