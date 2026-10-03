import * as React from 'react';
import {NarrativeMoveKind} from '../../../domain/narrative/interaction';
import {
	InteractionTemplateDefinition,
	previewInteractionTemplate
} from '../../../domain/narrative/interaction-template';
import {starterInteractionTemplates} from '../../../domain/narrative/standard-interaction-templates';
import {useNarrativeProject} from '../../../store/narrative-project';

const moveKinds: NarrativeMoveKind[] = [
	'ask',
	'inform',
	'persuade',
	'deceive',
	'threaten',
	'accuse',
	'investigate',
	'observe',
	'joke',
	'flirt',
	'refuse',
	'give-item',
	'take-item',
	'leave',
	'custom'
];

export const InteractionTemplatePanel: React.FC = () => {
	const {project, execute, createId} = useNarrativeProject();
	const templates = React.useMemo(() => {
		const byId = new Map(
			starterInteractionTemplates.map(template => [template.id, template])
		);
		for (const template of project.interactionTemplates) {
			byId.set(template.id, template);
		}
		return [...byId.values()];
	}, [project.interactionTemplates]);
	const [templateId, setTemplateId] = React.useState('');
	const [storyNodeId, setStoryNodeId] = React.useState('');
	const [characterByRole, setCharacterByRole] = React.useState<
		Record<string, string>
	>({});
	const [claimBySlot, setClaimBySlot] = React.useState<Record<string, string>>({});
	const [message, setMessage] = React.useState('');
	const [customName, setCustomName] = React.useState('');
	const [customDescription, setCustomDescription] = React.useState('');
	const [customMoveLabel, setCustomMoveLabel] = React.useState('');
	const [customMoveKind, setCustomMoveKind] = React.useState<NarrativeMoveKind>('inform');
	const [customUsesClaim, setCustomUsesClaim] = React.useState(true);
	const [customShareLocationGuard, setCustomShareLocationGuard] = React.useState(false);
	const [customTargetLearnsClaim, setCustomTargetLearnsClaim] = React.useState(false);
	const [customFollowupLabel, setCustomFollowupLabel] = React.useState('');
	const [customFollowupKind, setCustomFollowupKind] = React.useState<NarrativeMoveKind>('ask');
	const template = templates.find(candidate => candidate.id === templateId);
	const preview = React.useMemo(
		() =>
			template
				? previewInteractionTemplate(
						template,
						{storyNodeId, characterByRole, claimBySlot},
						'template-preview'
					  )
				: undefined,
		[template, storyNodeId, characterByRole, claimBySlot]
	);

	React.useEffect(() => {
		if (!templateId && templates[0]) {
			setTemplateId(templates[0].id);
		}
	}, [templateId, templates]);

	React.useEffect(() => {
		setCharacterByRole({});
		setClaimBySlot({});
		setMessage('');
	}, [templateId]);

	function characterName(characterId?: string) {
		return (
			project.characters.find(character => character.id === characterId)?.name ??
			characterId ??
			'—'
		);
	}

	function instantiate(event: React.FormEvent) {
		event.preventDefault();
		if (!template || preview?.status !== 'ready') {
			return;
		}
		execute({
			type: 'template/instantiate',
			templateId: template.id,
			binding: {storyNodeId, characterByRole, claimBySlot},
			instanceId: createId('interaction-instance')
		});
		setMessage(
			`Шаблон материализован как одна authoring-команда: ${template.moves.length} Move(s), один Undo.`
		);
	}

	function addCustomTemplate(event: React.FormEvent) {
		event.preventDefault();
		const name = customName.trim();
		const moveLabel = customMoveLabel.trim();
		const followupLabel = customFollowupLabel.trim();
		if (!name || !moveLabel) {
			return;
		}
		const id = createId('interaction-template');
		const guards = customShareLocationGuard
			? [
					{
						id: 'share-location',
						label: 'Участники находятся в одном месте',
						condition: {
							type: 'roles-share-location' as const,
							roleIds: ['speaker', 'listener']
						}
					}
			  ]
			: [];
		const effects =
			customUsesClaim && customTargetLearnsClaim
				? [
						{
							id: 'listener-learns-claim',
							type: 'role-learns-claim' as const,
							recipientRoleId: 'listener',
							claimSlotId: 'claim',
							attitude: 'believes' as const,
							confidence: 0.75,
							source: {type: 'move-actor' as const}
						}
				  ]
				: [];
		const customTemplate: InteractionTemplateDefinition = {
			id,
			name,
			description:
				customDescription.trim() || 'Пользовательский reusable Interaction Template.',
			roles: [
				{id: 'speaker', label: 'Актор', kind: 'character'},
				{id: 'listener', label: 'Цель', kind: 'character'}
			],
			claimSlots: customUsesClaim
				? [{id: 'claim', label: 'Claim', required: true}]
				: [],
			moves: [
				{
					id: 'move-1',
					kind: customMoveKind,
					label: moveLabel,
					actorRoleId: 'speaker',
					targetRoleIds: ['listener'],
					communicatedClaimSlotId: customUsesClaim ? 'claim' : undefined,
					communicationIntent: customUsesClaim ? 'honest' : undefined,
					guards,
					effects
				},
				...(followupLabel
					? [
							{
								id: 'move-2',
								kind: customFollowupKind,
								label: followupLabel,
								actorRoleId: 'listener',
								targetRoleIds: ['speaker'],
								guards
							}
					  ]
					: [])
			],
			tags: ['custom', 'reusable', ...(followupLabel ? ['multi-step'] : [])]
		};
		execute({type: 'template/add', template: customTemplate});
		setTemplateId(id);
		setCustomName('');
		setCustomDescription('');
		setCustomMoveLabel('');
		setCustomFollowupLabel('');
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Interaction Templates">
			<h2>Interaction Templates</h2>
			<p>
				Reusable шаблон связывает типизированные Character/Claim slots, guards и
				 effects, а затем атомарно материализуется в обычные Narrative Moves. Один
				 многошаговый шаблон покрывает EventTemplate-style сценарий без отдельного
				 runtime-движка.
			</p>

			<form className="narrative-workspace__compact-form" onSubmit={addCustomTemplate}>
				<strong>Новый пользовательский шаблон</strong>
				<input
					aria-label="Название interaction template"
					value={customName}
					onChange={event => setCustomName(event.target.value)}
					placeholder="Например: Попросить услугу"
				/>
				<input
					aria-label="Описание interaction template"
					value={customDescription}
					onChange={event => setCustomDescription(event.target.value)}
					placeholder="Когда и зачем использовать этот паттерн"
				/>
				<input
					aria-label="Текст move шаблона"
					value={customMoveLabel}
					onChange={event => setCustomMoveLabel(event.target.value)}
					placeholder="Например: Попросить помочь"
				/>
				<select
					aria-label="Тип move шаблона"
					value={customMoveKind}
					onChange={event => setCustomMoveKind(event.target.value as NarrativeMoveKind)}
				>
					{moveKinds.map(kind => (
						<option key={kind} value={kind}>
							{kind}
						</option>
					))}
				</select>
				<label>
					<input
						type="checkbox"
						checked={customUsesClaim}
						onChange={event => setCustomUsesClaim(event.target.checked)}
					/>{' '}
					Шаблон использует обязательный Claim slot
				</label>
				<label>
					<input
						type="checkbox"
						checked={customShareLocationGuard}
						onChange={event => setCustomShareLocationGuard(event.target.checked)}
					/>{' '}
					Reusable guard: участники должны находиться в одном месте
				</label>
				<label>
					<input
						type="checkbox"
						checked={customTargetLearnsClaim}
						disabled={!customUsesClaim}
						onChange={event => setCustomTargetLearnsClaim(event.target.checked)}
					/>{' '}
					Reusable effect: цель узнаёт выбранный Claim
				</label>
				<input
					aria-label="Ответный move шаблона"
					value={customFollowupLabel}
					onChange={event => setCustomFollowupLabel(event.target.value)}
					placeholder="Необязательно: второй шаг/ответ"
				/>
				{customFollowupLabel.trim() && (
					<select
						aria-label="Тип ответного move шаблона"
						value={customFollowupKind}
						onChange={event =>
							setCustomFollowupKind(event.target.value as NarrativeMoveKind)
						}
					>
						{moveKinds.map(kind => (
							<option key={kind} value={kind}>
								{kind}
							</option>
						))}
					</select>
				)}
				<button type="submit">Сохранить reusable шаблон</button>
			</form>

			<form className="narrative-workspace__compact-form" onSubmit={instantiate}>
				<strong>Применить шаблон</strong>
				<select
					aria-label="Interaction template"
					value={templateId}
					onChange={event => setTemplateId(event.target.value)}
				>
					{templates.map(candidate => (
						<option key={candidate.id} value={candidate.id}>
							{candidate.name}
						</option>
					))}
				</select>
				<select
					aria-label="Story node для interaction template"
					value={storyNodeId}
					onChange={event => setStoryNodeId(event.target.value)}
				>
					<option value="">Выбери Story node</option>
					{project.storyNodes.map(node => (
						<option key={node.id} value={node.id}>
							{node.title}
						</option>
					))}
				</select>

				{template?.roles.map(role => (
					<label key={role.id}>
						{role.label} · {role.kind ?? 'character'}
						<select
							aria-label={`Роль ${role.label}`}
							value={characterByRole[role.id] ?? ''}
							onChange={event =>
								setCharacterByRole(current => ({
									...current,
									[role.id]: event.target.value
								}))
							}
						>
							<option value="">Не назначен</option>
							{project.characters.map(character => (
								<option key={character.id} value={character.id}>
									{character.name}
								</option>
							))}
						</select>
					</label>
				))}

				{template?.claimSlots.map(slot => (
					<label key={slot.id}>
						{slot.label} · claim {slot.required ? '· обязательно' : ''}
						<select
							aria-label={`Claim slot ${slot.label}`}
							value={claimBySlot[slot.id] ?? ''}
							onChange={event =>
								setClaimBySlot(current => ({
									...current,
									[slot.id]: event.target.value
								}))
							}
						>
							<option value="">Не назначен</option>
							{project.claims.map(claim => (
								<option key={claim.id} value={claim.id}>
									{claim.text}
								</option>
							))}
						</select>
					</label>
				))}

				{template?.description && <small>{template.description}</small>}

				{template && preview && (
					<div className="narrative-workspace__reaction-set" aria-label="Предпросмотр interaction template">
						<strong>Предпросмотр перед созданием</strong>
						{preview.status === 'ready' ? (
							preview.moves.map(move => (
								<div key={move.id}>
									<span>
										{move.label} · {characterName(move.actorCharacterId)} →{' '}
										{move.targetCharacterIds.map(characterName).join(', ') || '—'}
									</span>
									<small>
										{move.guards.length} guard(s) ·{' '}
										{move.outcomes.reduce(
											(total, outcome) => total + outcome.effects.length,
											0
										)}{' '}
										effect(s)
									</small>
								</div>
							))
						) : (
							<small>
								{preview.status === 'invalid'
									? preview.error
									: `Нужно назначить: ${preview.missingBindings
											.map(binding => binding.label)
											.join(', ')}`}
							</small>
						)}
					</div>
				)}

				<button type="submit" disabled={preview?.status !== 'ready'}>
					Создать показанную структуру
				</button>
				{message && <small>{message}</small>}
			</form>

			{project.interactionTemplates.length > 0 && (
				<div className="narrative-workspace__reaction-set">
					<strong>Пользовательские шаблоны</strong>
					{project.interactionTemplates.map(candidate => (
						<div key={candidate.id}>
							<span>
								{candidate.name} · {candidate.moves.length} Move(s)
							</span>
							<button
								type="button"
								onClick={() => execute({type: 'template/remove', id: candidate.id})}
							>
								Удалить
							</button>
						</div>
					))}
				</div>
			)}
		</section>
	);
};
