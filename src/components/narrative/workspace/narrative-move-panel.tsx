import * as React from 'react';
import {
	CommunicationIntent,
	NarrativeMoveKind
} from '../../../domain/narrative/interaction';
import {useNarrativeProject} from '../../../store/narrative-project';

const moveKindLabels: Record<NarrativeMoveKind, string> = {
	ask: 'Спросить',
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

export interface NarrativeMovePanelProps {
	storyNodeId: string;
}

/**
 * Minimal A20 authoring surface. It creates generic narrative moves with an
 * automatic/no-check resolution. Skill checks are deliberately added in A21
 * on top of the same move/outcome contract rather than as a parallel system.
 */
export const NarrativeMovePanel: React.FC<NarrativeMovePanelProps> = ({
	storyNodeId
}) => {
	const {project, execute, createId} = useNarrativeProject();
	const [label, setLabel] = React.useState('');
	const [kind, setKind] = React.useState<NarrativeMoveKind>('inform');
	const [actorCharacterId, setActorCharacterId] = React.useState('');
	const [targetCharacterId, setTargetCharacterId] = React.useState('');
	const [claimId, setClaimId] = React.useState('');
	const [intent, setIntent] = React.useState<CommunicationIntent | ''>('');
	const [requireActorKnowsClaim, setRequireActorKnowsClaim] =
		React.useState(false);

	const moves = project.narrativeMoves.filter(
		move => move.storyNodeId === storyNodeId
	);
	const charactersById = new Map(
		project.characters.map(character => [character.id, character])
	);
	const claimsById = new Map(project.claims.map(claim => [claim.id, claim]));

	function addMove(event: React.FormEvent) {
		event.preventDefault();
		const title = label.trim();
		if (!title) {
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

		execute({
			type: 'move/add',
			id: createId('narrative-move'),
			storyNodeId,
			kind,
			label: title,
			actorCharacterId: actorCharacterId || undefined,
			targetCharacterIds: targetCharacterId ? [targetCharacterId] : [],
			communicatedClaimId: claimId || undefined,
			communicationIntent: claimId && intent ? intent : undefined,
			guards
		});
		setLabel('');
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Narrative Moves">
			<h3>Narrative Moves</h3>
			<p>
				Реплика или действие описывается отдельно от способа разрешения. Сейчас
				 создаём базовый вариант <strong>без броска</strong>; проверки навыка будут
				 использовать тот же Outcome-контракт.
			</p>
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
					placeholder="Например: Сказать, что начальник разрешил пройти"
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
					onChange={event => setTargetCharacterId(event.target.value)}
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
				<button type="submit">+ Narrative Move</button>
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
						return (
							<article key={move.id} className="narrative-workspace__move-card">
								<strong>{move.label}</strong>
								<small>
									{moveKindLabels[move.kind]} · без броска ·{' '}
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
				Важно: истинность Claim, намерение говорящего и вера слушателя — разные
				 состояния. Создание move не меняет runtime-знания персонажей.
			</small>
		</section>
	);
};
