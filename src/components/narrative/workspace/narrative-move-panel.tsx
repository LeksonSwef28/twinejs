import * as React from 'react';
import {
	CommunicationIntent,
	createDefaultNarrativeOutcome,
	createDefaultSkillCheckOutcomes,
	NarrativeKnowledgeEffectDefinition,
	NarrativeMoveKind
} from '../../../domain/narrative/interaction';
import {KnowledgeAttitude} from '../../../domain/narrative/knowledge';
import {useNarrativeProject} from '../../../store/narrative-project';

const moveKindLabels: Record<NarrativeMoveKind, string> = {
	['ask']: 'Спросить',
	inform: 'Сообщить',
	persuade: 'Убедить',
	deceive: 'Обмануть',
	threaten: 'Угрожать',
	accuse: 'Обвинить',
	investigate: 'Исследовать',
	observe: 'Наблюдать',
	joke: 'Пошутить',
	flirt: 'Флиртовать',
	refuse: 'Отказать',
	'give-item': 'Передать предмет',
	'take-item': 'Взять предмет',
	leave: 'Уйти',
	custom: 'Другое'
};

const intentLabels: Record<CommunicationIntent, string> = {
	honest: 'Говорит искренне',
	deceptive: 'Намеренно вводит в заблуждение',
	mistaken: 'Ошибается, но считает сказанное верным',
	uncertain: 'Не уверен в сказанном',
	withholding: 'Утаивает часть известного',
	other: 'Другое намерение'
};

const knowledgeAttitudeLabels: Record<KnowledgeAttitude, string> = {
	knows: 'Знает / уверен',
	believes: 'Верит',
	doubts: 'Сомневается',
	disbelieves: 'Не верит'
};

type ResolutionMode = 'automatic' | 'skill-check';
type KnowledgeEffectOutcomeMode = 'success' | 'failure' | 'both';

export interface NarrativeMovePanelProps {
	storyNodeId?: string;
}

export const NarrativeMovePanel: React.FC<NarrativeMovePanelProps> = ({
	storyNodeId
}) => {
	const {project, execute, createId} = useNarrativeProject();
	const [selectedStoryNodeId, setSelectedStoryNodeId] = React.useState('');
	const [label, setLabel] = React.useState('');
	const [kind, setKind] = React.useState<NarrativeMoveKind>('inform');
	const [actorCharacterId, setActorCharacterId] = React.useState('');
	const [targetCharacterId, setTargetCharacterId] = React.useState('');
	const [claimId, setClaimId] = React.useState('');
	const [intent, setIntent] = React.useState<CommunicationIntent | ''>('');
	const [requireActorKnowsClaim, setRequireActorKnowsClaim] = React.useState(false);
	const [resolutionMode, setResolutionMode] = React.useState<ResolutionMode>('automatic');
	const [skillKey, setSkillKey] = React.useState('');
	const [difficulty, setDifficulty] = React.useState(10);
	const [diceCount, setDiceCount] = React.useState(2);
	const [dieSides, setDieSides] = React.useState(6);
	const [modifierLabel, setModifierLabel] = React.useState('');
	const [modifierValue, setModifierValue] = React.useState(0);
	const [targetLearnsClaim, setTargetLearnsClaim] = React.useState(false);
	const [knowledgeAttitude, setKnowledgeAttitude] =
		React.useState<KnowledgeAttitude>('believes');
	const [knowledgeConfidence, setKnowledgeConfidence] = React.useState(0.75);
	const [knowledgeEffectOutcome, setKnowledgeEffectOutcome] =
		React.useState<KnowledgeEffectOutcomeMode>('success');
	const activeStoryNodeId = storyNodeId ?? selectedStoryNodeId;

	const moves = activeStoryNodeId
		? project.narrativeMoves.filter(move => move.storyNodeId === activeStoryNodeId)
		: [];
	const charactersById = new Map(
		project.characters.map(character => [character.id, character])
	);
	const claimsById = new Map(project.claims.map(claim => [claim.id, claim]));

	function addMove(event: React.FormEvent) {
		event.preventDefault();
		const title = label.trim();
		if (!title || !activeStoryNodeId) {
			return;
		}
		if (
			resolutionMode === 'skill-check' &&
			(!skillKey.trim() ||
				!Number.isFinite(difficulty) ||
				diceCount < 1 ||
				dieSides < 2)
		) {
			return;
		}
		if (
			targetLearnsClaim &&
			(!targetCharacterId ||
				!claimId ||
				!Number.isFinite(knowledgeConfidence) ||
				knowledgeConfidence < 0 ||
				knowledgeConfidence > 1)
		) {
			return;
		}

		const guards =
			requireActorKnowsClaim && actorCharacterId && claimId
				? [
						{
							id: createId('move-guard'),
							label: 'Актор знает утверждение',
							condition: {
								type: 'character-knows-claim' as const,
								characterId: actorCharacterId,
								claimId
							}
						}
				  ]
				: [];
		const moveId = createId('narrative-move');
		const skillOutcomes = createDefaultSkillCheckOutcomes(moveId);
		const automaticOutcome = createDefaultNarrativeOutcome(moveId);
		const isSkillCheck = resolutionMode === 'skill-check';
		const shouldAuthorKnowledgeEffect =
			targetLearnsClaim && Boolean(targetCharacterId) && Boolean(claimId);

		function createKnowledgeEffect(): NarrativeKnowledgeEffectDefinition {
			return {
				id: createId('knowledge-effect'),
				type: 'character-learns-claim',
				recipient: {type: 'move-target', targetIndex: 0},
				claim: {type: 'communicated-claim'},
				attitude: knowledgeAttitude,
				confidence: knowledgeConfidence,
				source: actorCharacterId ? {type: 'move-actor'} : {type: 'authored'}
			};
		}

		if (shouldAuthorKnowledgeEffect) {
			if (!isSkillCheck) {
				automaticOutcome.effects = [createKnowledgeEffect()];
			} else {
				if (
					knowledgeEffectOutcome === 'success' ||
					knowledgeEffectOutcome === 'both'
				) {
					skillOutcomes[0].effects = [createKnowledgeEffect()];
				}
				if (
					knowledgeEffectOutcome === 'failure' ||
					knowledgeEffectOutcome === 'both'
				) {
					skillOutcomes[1].effects = [createKnowledgeEffect()];
				}
			}
		}

		execute({
			type: 'move/add',
			id: moveId,
			storyNodeId: activeStoryNodeId,
			kind,
			label: title,
			actorCharacterId: actorCharacterId || undefined,
			targetCharacterIds: targetCharacterId ? [targetCharacterId] : [],
			communicatedClaimId: claimId || undefined,
			communicationIntent: claimId && intent ? intent : undefined,
			guards,
			outcomes: isSkillCheck
				? skillOutcomes
				: shouldAuthorKnowledgeEffect
					? [automaticOutcome]
					: undefined,
			resolution: isSkillCheck
				? {
						type: 'skill-check',
						check: {
							skillKey: skillKey.trim(),
							difficulty,
							rollRule: {type: 'dice', diceCount, dieSides},
							modifiers: modifierLabel.trim()
								? [
										{
											id: createId('check-modifier'),
											label: modifierLabel.trim(),
											value: modifierValue
										}
								  ]
								: [],
							successOutcomeId: skillOutcomes[0].id,
							failureOutcomeId: skillOutcomes[1].id,
							retryPolicy: 'never'
						}
				  }
				: shouldAuthorKnowledgeEffect
					? {type: 'automatic', outcomeId: automaticOutcome.id}
					: undefined
		});
		setLabel('');
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Narrative Moves">
			<h2>Narrative Moves</h2>
			<p>
				Реплика или действие отделены от способа разрешения: без проверки или
				 через Skill Check.
			</p>

			{!storyNodeId && (
				<select
					aria-label="Сюжетный блок Narrative Move"
					value={selectedStoryNodeId}
					onChange={event => setSelectedStoryNodeId(event.target.value)}
				>
					<option value="">Выбери сюжетный блок</option>
					{project.storyNodes.map(node => (
						<option key={node.id} value={node.id}>
							{node.title}
						</option>
					))}
				</select>
			)}

			<form onSubmit={addMove} className="narrative-workspace__compact-form">
				<select
					aria-label="Тип narrative move"
					value={kind}
					onChange={event => setKind(event.target.value as NarrativeMoveKind)}
				>
					{Object.entries(moveKindLabels).map(([value, text]) => (
						<option key={value} value={value}>
							{text}
						</option>
					))}
				</select>
				<input
					aria-label="Текст или смысл narrative move"
					value={label}
					placeholder="Например: Убедить охранника пропустить"
					onChange={event => setLabel(event.target.value)}
				/>
				<select
					aria-label="Актор narrative move"
					value={actorCharacterId}
					onChange={event => setActorCharacterId(event.target.value)}
				>
					<option value="">Актор не назначен</option>
					{project.characters.map(character => (
						<option key={character.id} value={character.id}>
							{character.name}
						</option>
					))}
				</select>
				<select
					aria-label="Цель narrative move"
					value={targetCharacterId}
					onChange={event => {
						setTargetCharacterId(event.target.value);
						if (!event.target.value) {
							setTargetLearnsClaim(false);
						}
					}}
				>
					<option value="">Без конкретной цели</option>
					{project.characters.map(character => (
						<option key={character.id} value={character.id}>
							{character.name}
						</option>
					))}
				</select>
				<select
					aria-label="Передаваемое утверждение"
					value={claimId}
					onChange={event => {
						setClaimId(event.target.value);
						if (!event.target.value) {
							setIntent('');
							setRequireActorKnowsClaim(false);
							setTargetLearnsClaim(false);
						}
					}}
				>
					<option value="">Без Claim</option>
					{project.claims.map(claim => (
						<option key={claim.id} value={claim.id}>
							{claim.text}
						</option>
					))}
				</select>
				<select
					aria-label="Намерение говорящего"
					value={intent}
					disabled={!claimId}
					onChange={event =>
						setIntent(event.target.value as CommunicationIntent | '')
					}
				>
					<option value="">Намерение не задано</option>
					{Object.entries(intentLabels).map(([value, text]) => (
						<option key={value} value={value}>
							{text}
						</option>
					))}
				</select>
				<label>
					<input
						type="checkbox"
						checked={requireActorKnowsClaim}
						disabled={!actorCharacterId || !claimId}
						onChange={event => setRequireActorKnowsClaim(event.target.checked)}
					/>{' '}
					Доступно только если актор знает этот Claim
				</label>
				<select
					aria-label="Способ разрешения narrative move"
					value={resolutionMode}
					onChange={event => setResolutionMode(event.target.value as ResolutionMode)}
				>
					<option value="automatic">Без проверки</option>
					<option value="skill-check">Проверка навыка</option>
				</select>

				{resolutionMode === 'skill-check' && (
					<fieldset className="narrative-workspace__skill-check-editor">
						<legend>Skill Check</legend>
						<input
							aria-label="Навык или характеристика"
							value={skillKey}
							placeholder="Например: Убеждение"
							onChange={event => setSkillKey(event.target.value)}
						/>
						<label>
							Сложность{' '}
							<input
								type="number"
								value={difficulty}
								onChange={event => setDifficulty(Number(event.target.value))}
							/>
						</label>
						<label>
							Кубиков{' '}
							<input
								type="number"
								min={1}
								value={diceCount}
								onChange={event => setDiceCount(Number(event.target.value))}
							/>
						</label>
						<label>
							Граней{' '}
							<input
								type="number"
								min={2}
								value={dieSides}
								onChange={event => setDieSides(Number(event.target.value))}
							/>
						</label>
						<input
							aria-label="Название модификатора проверки"
							value={modifierLabel}
							placeholder="Модификатор, например Доверие"
							onChange={event => setModifierLabel(event.target.value)}
						/>
						<label>
							Значение модификатора{' '}
							<input
								type="number"
								value={modifierValue}
								onChange={event => setModifierValue(Number(event.target.value))}
							/>
						</label>
						<small>
							SUCCESS и FAILURE — отдельные Outcomes. Бросок выполняет runtime, не
							 редактор.
						</small>
					</fieldset>
				)}

				<label>
					<input
						type="checkbox"
						checked={targetLearnsClaim}
						disabled={!targetCharacterId || !claimId}
						onChange={event => setTargetLearnsClaim(event.target.checked)}
					/>{' '}
					После исхода цель получает этот Claim
				</label>
				{targetLearnsClaim && targetCharacterId && claimId && (
					<fieldset className="narrative-workspace__skill-check-editor">
						<legend>Knowledge Effect</legend>
						<select
							aria-label="Отношение цели к полученному Claim"
							value={knowledgeAttitude}
							onChange={event =>
								setKnowledgeAttitude(event.target.value as KnowledgeAttitude)
							}
						>
							{Object.entries(knowledgeAttitudeLabels).map(([value, text]) => (
								<option key={value} value={value}>
									{text}
								</option>
							))}
						</select>
						<label>
							Уверенность{' '}
							<input
								type="number"
								min={0}
								max={1}
								step={0.05}
								value={knowledgeConfidence}
								onChange={event =>
									setKnowledgeConfidence(Number(event.target.value))
								}
							/>
						</label>
						{resolutionMode === 'skill-check' && (
							<select
								aria-label="Исход проверки, который передаёт Claim"
								value={knowledgeEffectOutcome}
								onChange={event =>
									setKnowledgeEffectOutcome(
										event.target.value as KnowledgeEffectOutcomeMode
									)
								}
							>
								<option value="success">Только при SUCCESS</option>
								<option value="failure">Только при FAILURE</option>
								<option value="both">При любом исходе</option>
							</select>
						)}
						<small>
							Это только authored Effect. Preview-знание изменится, когда runtime
							 действительно выберет соответствующий Outcome.
						</small>
					</fieldset>
				)}

				<button type="submit" disabled={!activeStoryNodeId}>
					+ Narrative Move
				</button>
			</form>

			{moves.length > 0 && (
				<div className="narrative-workspace__move-list">
					{moves.map(move => {
						const actor = move.actorCharacterId
							? charactersById.get(move.actorCharacterId)
							: undefined;
						const targets = move.targetCharacterIds
							.map(id => charactersById.get(id)?.name)
							.filter(Boolean)
							.join(', ');
						const claim = move.communicatedClaimId
							? claimsById.get(move.communicatedClaimId)
							: undefined;
						const resolutionSummary =
							move.resolution.type === 'skill-check'
								? `${move.resolution.check.skillKey} · ${move.resolution.check.rollRule.diceCount}d${move.resolution.check.rollRule.dieSides} · сложность ${move.resolution.check.difficulty}`
								: move.resolution.type === 'condition'
									? 'условие'
									: 'без проверки';
						const effectCount = move.outcomes.reduce(
							(total, outcome) => total + (outcome.effects?.length ?? 0),
							0
						);

						return (
							<article key={move.id} className="narrative-workspace__move-card">
								<strong>{move.label}</strong>
								<small>
									{moveKindLabels[move.kind]} · {resolutionSummary} ·{' '}
									{move.outcomes.length} outcome
								</small>
								{actor && <span>Актор: {actor.name}</span>}
								{targets && <span>Цель: {targets}</span>}
								{claim && (
									<span>
										Claim: {claim.text}
										{move.communicationIntent
											? ` · ${intentLabels[move.communicationIntent]}`
											: ''}
									</span>
								)}
								{move.guards.length > 0 && (
									<span>Eligibility guards: {move.guards.length}</span>
								)}
								{effectCount > 0 && <span>Outcome effects: {effectCount}</span>}
								<button
									type="button"
									onClick={() => execute({type: 'move/remove', id: move.id})}
								>
									Удалить move
								</button>
							</article>
						);
					})}
				</div>
			)}
			<small>
				Истинность Claim, намерение говорящего, результат проверки и вера слушателя
				 — разные состояния.
			</small>
		</section>
	);
};
