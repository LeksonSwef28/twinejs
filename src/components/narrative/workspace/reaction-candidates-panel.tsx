import * as React from 'react';
import {
	evaluateReactionCandidateSet,
	ReactionCandidateDefinition,
	ReactionCandidateSetEvaluation,
	ReactionConsiderationDefinition,
	ReactionValence
} from '../../../domain/narrative/reaction';
import {useNarrativeProject} from '../../../store/narrative-project';

const availabilityLabels = {
	available: 'доступно',
	blocked: 'заблокировано',
	unknown: 'неизвестно'
};

type ConsiderationMode = 'none' | 'relationship' | 'mood' | 'claim' | 'memory';

interface CandidateDraft {
	key: string;
	moveId: string;
	valence: ReactionValence;
	baseScore: number;
	considerationMode: ConsiderationMode;
	considerationValue: string;
	threshold: number;
	memoryMinimumSalience: string;
	weight: number;
}

function newDraft(key: string): CandidateDraft {
	return {
		key,
		moveId: '',
		valence: 'neutral',
		baseScore: 0,
		considerationMode: 'none',
		considerationValue: '',
		threshold: 0,
		memoryMinimumSalience: '',
		weight: 1
	};
}

function memoryThresholdIsValid(draft: CandidateDraft) {
	if (draft.considerationMode !== 'memory' || !draft.memoryMinimumSalience.trim()) {
		return true;
	}
	const value = Number(draft.memoryMinimumSalience);
	return Number.isFinite(value) && value >= 0 && value <= 1;
}

export const ReactionCandidatesPanel: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const [reactingCharacterId, setReactingCharacterId] = React.useState('');
	const [counterpartCharacterId, setCounterpartCharacterId] = React.useState('');
	const [drafts, setDrafts] = React.useState<CandidateDraft[]>([newDraft('initial')]);
	const selectedStoryNodeId = storyNodeId || project.storyNodes[0]?.id || '';
	const movesForStoryNode = project.narrativeMoves.filter(
		move => move.storyNodeId === selectedStoryNodeId
	);
	const evaluations = React.useMemo(() => {
		const context = {
			characterKnowledge: project.simulation.characterKnowledge,
			itemInstances: project.itemInstances,
			relationships: project.relationships,
			storyNodes: project.storyNodes,
			actualLocationByCharacter: project.simulation.actualLocationByCharacter,
			mindStates: project.mindStates,
			memories: project.memories,
			memoryMoment: {
				day: project.simulation.day,
				minuteOfDay: project.simulation.minuteOfDay
			}
		};
		return project.reactionCandidateSets
			.filter(set => set.storyNodeId === selectedStoryNodeId)
			.flatMap<ReactionCandidateSetEvaluation>(set => {
				try {
					return [evaluateReactionCandidateSet(set, context)];
				} catch {
					return [];
				}
			});
	}, [project, selectedStoryNodeId]);
	const charactersById = new Map(
		project.characters.map(character => [character.id, character])
	);
	const movesById = new Map(project.narrativeMoves.map(move => [move.id, move]));

	function updateDraft(key: string, patch: Partial<CandidateDraft>) {
		setDrafts(current =>
			current.map(draft => (draft.key === key ? {...draft, ...patch} : draft))
		);
	}

	function considerationFromDraft(
		draft: CandidateDraft
	): ReactionConsiderationDefinition[] {
		if (draft.considerationMode === 'none') {
			return [];
		}
		const id = createId('reaction-consideration');
		switch (draft.considerationMode) {
			case 'relationship':
				if (!counterpartCharacterId || !draft.considerationValue.trim()) {
					return [];
				}
				return [
					{
						id,
						type: 'relationship-at-least',
						axis: draft.considerationValue.trim(),
						value: draft.threshold,
						weight: draft.weight
					}
				];
			case 'mood':
				return draft.considerationValue.trim()
					? [
							{
								id,
								type: 'mood-is',
								mood: draft.considerationValue.trim(),
								weight: draft.weight
							}
					  ]
					: [];
			case 'claim':
				return draft.considerationValue
					? [
							{
								id,
								type: 'knows-claim',
								claimId: draft.considerationValue,
								weight: draft.weight
							}
					  ]
					: [];
			case 'memory': {
				if (!draft.considerationValue.trim() || !memoryThresholdIsValid(draft)) {
					return [];
				}
				const minimumSalience = draft.memoryMinimumSalience.trim()
					? Number(draft.memoryMinimumSalience)
					: undefined;
				return [
					{
						id,
						type: 'memory-tag',
						tag: draft.considerationValue.trim(),
						minimumSalience,
						weight: draft.weight
					}
				];
			}
		}
	}

	function addSet(event: React.FormEvent) {
		event.preventDefault();
		if (
			!selectedStoryNodeId ||
			!reactingCharacterId ||
			drafts.some(draft => !draft.moveId || !memoryThresholdIsValid(draft))
		) {
			return;
		}
		const candidates: ReactionCandidateDefinition[] = drafts.map(draft => ({
			id: createId('reaction-candidate'),
			moveId: draft.moveId,
			valence: draft.valence,
			baseScore: draft.baseScore,
			guards: [],
			considerations: considerationFromDraft(draft)
		}));
		execute({
			type: 'reaction/addSet',
			set: {
				id: createId('reaction-set'),
				storyNodeId: selectedStoryNodeId,
				reactingCharacterId,
				counterpartCharacterId: counterpartCharacterId || undefined,
				candidates
			}
		});
		setDrafts([newDraft('initial')]);
	}

	return (
		<section
			className="narrative-workspace__move-editor"
			aria-label="Reaction Candidates"
		>
			<h2>Reaction Candidates</h2>
			<p>
				Кандидатов может быть сколько угодно. Автор задаёт допустимые ответы и
				 explainable considerations; система только ранжирует их и ничего не
				 запускает сама.
			</p>
			<select
				aria-label="Story node для реакций"
				value={selectedStoryNodeId}
				onChange={event => setStoryNodeId(event.target.value)}
			>
				<option value="">Выбери Story node</option>
				{project.storyNodes.map(node => (
					<option key={node.id} value={node.id}>
						{node.title}
					</option>
				))}
			</select>

			<form className="narrative-workspace__compact-form" onSubmit={addSet}>
				<strong>Новый набор реакций</strong>
				<select
					aria-label="Реагирующий персонаж"
					value={reactingCharacterId}
					onChange={event => setReactingCharacterId(event.target.value)}
				>
					<option value="">Кто реагирует</option>
					{project.characters.map(character => (
						<option key={character.id} value={character.id}>
							{character.name}
						</option>
					))}
				</select>
				<select
					aria-label="Второй персонаж реакции"
					value={counterpartCharacterId}
					onChange={event => setCounterpartCharacterId(event.target.value)}
				>
					<option value="">Без конкретного counterpart</option>
					{project.characters.map(character => (
						<option key={character.id} value={character.id}>
							{character.name}
						</option>
					))}
				</select>

				{drafts.map((draft, index) => (
					<fieldset
						key={draft.key}
						className="narrative-workspace__skill-check-editor"
					>
						<legend>Кандидат {index + 1}</legend>
						<select
							aria-label={`Move кандидата ${index + 1}`}
							value={draft.moveId}
							onChange={event =>
								updateDraft(draft.key, {moveId: event.target.value})
							}
						>
							<option value="">Выбери authored Move</option>
							{movesForStoryNode.map(move => (
								<option key={move.id} value={move.id}>
									{move.label}
								</option>
							))}
						</select>
						<select
							aria-label={`Valence кандидата ${index + 1}`}
							value={draft.valence}
							onChange={event =>
								updateDraft(draft.key, {
									valence: event.target.value as ReactionValence
								})
							}
						>
							<option value="positive">positive</option>
							<option value="neutral">neutral</option>
							<option value="negative">negative</option>
							<option value="other">other</option>
						</select>
						<input
							aria-label={`Base score кандидата ${index + 1}`}
							type="number"
							value={draft.baseScore}
							onChange={event =>
								updateDraft(draft.key, {
									baseScore: Number(event.target.value)
								})
							}
						/>
						<select
							aria-label={`Consideration кандидата ${index + 1}`}
							value={draft.considerationMode}
							onChange={event =>
								updateDraft(draft.key, {
									considerationMode: event.target.value as ConsiderationMode,
									considerationValue: ''
								})
							}
						>
							<option value="none">Без consideration</option>
							<option value="relationship">Relationship threshold</option>
							<option value="mood">Mood</option>
							<option value="claim">Knows Claim</option>
							<option value="memory">Memory tag / salience</option>
						</select>
						{draft.considerationMode === 'claim' ? (
							<select
								aria-label={`Claim consideration ${index + 1}`}
								value={draft.considerationValue}
								onChange={event =>
									updateDraft(draft.key, {
										considerationValue: event.target.value
									})
								}
							>
								<option value="">Выбери Claim</option>
								{project.claims.map(claim => (
									<option key={claim.id} value={claim.id}>
										{claim.text}
									</option>
								))}
							</select>
						) : draft.considerationMode !== 'none' ? (
							<input
								aria-label={`Значение consideration ${index + 1}`}
								value={draft.considerationValue}
								onChange={event =>
									updateDraft(draft.key, {
										considerationValue: event.target.value
									})
								}
								placeholder={
									draft.considerationMode === 'relationship'
										? 'trust'
										: draft.considerationMode === 'mood'
											? 'angry'
											: 'betrayal'
								}
							/>
						) : null}
						{draft.considerationMode === 'relationship' && (
							<input
								aria-label={`Порог relationship ${index + 1}`}
								type="number"
								value={draft.threshold}
								onChange={event =>
									updateDraft(draft.key, {
										threshold: Number(event.target.value)
									})
								}
							/>
						)}
						{draft.considerationMode === 'memory' && (
							<input
								aria-label={`Минимальная salience памяти ${index + 1}`}
								type="number"
								min="0"
								max="1"
								step="0.05"
								value={draft.memoryMinimumSalience}
								placeholder="Без порога = достаточно наличия памяти"
								onChange={event =>
									updateDraft(draft.key, {
										memoryMinimumSalience: event.target.value
									})
								}
							/>
						)}
						{draft.considerationMode !== 'none' && (
							<input
								aria-label={`Вес consideration ${index + 1}`}
								type="number"
								value={draft.weight}
								onChange={event =>
									updateDraft(draft.key, {
										weight: Number(event.target.value)
									})
								}
							/>
						)}
						{drafts.length > 1 && (
							<button
								type="button"
								onClick={() =>
									setDrafts(current =>
										current.filter(candidate => candidate.key !== draft.key)
									)
								}
							>
								Убрать кандидата
							</button>
						)}
					</fieldset>
				))}
				<button
					type="button"
					onClick={() =>
					setDrafts(current => [
						...current,
						newDraft(`draft-${Date.now()}-${current.length}`)
					])
				}
				>
					+ кандидат
				</button>
				<button
					type="submit"
					disabled={
					!reactingCharacterId ||
					movesForStoryNode.length === 0 ||
					drafts.some(draft => !memoryThresholdIsValid(draft))
				}
				>
					Сохранить набор реакций
				</button>
			</form>

			{evaluations.length === 0 ? (
				<small>Для этого Story node пока нет authored Reaction Candidate Set.</small>
			) : (
				evaluations.map(evaluation => (
					<div
						key={evaluation.setId}
						className="narrative-workspace__reaction-set"
					>
						<div>
							<strong>
								{charactersById.get(evaluation.reactingCharacterId)?.name ??
									evaluation.reactingCharacterId}
							</strong>
							<button
								type="button"
								onClick={() =>
									execute({type: 'reaction/removeSet', id: evaluation.setId})
								}
							>
								Удалить набор
							</button>
						</div>
						{evaluation.candidates.map(candidate => (
							<div key={candidate.candidateId}>
								<span>
									{movesById.get(candidate.moveId)?.label ?? candidate.moveId}
								</span>
								<small>
									{candidate.valence} · {availabilityLabels[candidate.availability]} ·
									 score {candidate.score}
								</small>
								{candidate.considerationTraces.slice(0, 3).map(trace => (
									<small key={trace.considerationId}>
										{trace.status === 'met'
											? `${trace.appliedWeight >= 0 ? '+' : ''}${trace.appliedWeight}`
											: trace.status === 'unmet'
												? '0'
												: '?'}{' '}
										· {trace.summary}
									</small>
								))}
							</div>
						))}
					</div>
				))
			)}
		</section>
	);
};
