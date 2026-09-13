import * as React from 'react';
import {NarrativeMoveKind} from '../../../domain/narrative/interaction';
import {InteractionTemplateDefinition} from '../../../domain/narrative/interaction-template';
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
	const [customMoveLabel, setCustomMoveLabel] = React.useState('');
	const [customMoveKind, setCustomMoveKind] = React.useState<NarrativeMoveKind>('inform');
	const [customUsesClaim, setCustomUsesClaim] = React.useState(true);
	const template = templates.find(candidate => candidate.id === templateId);

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

	function instantiate(event: React.FormEvent) {
		event.preventDefault();
		if (!template || !storyNodeId) {
			return;
		}
		execute({
			type: 'template/instantiate',
			templateId: template.id,
			binding: {storyNodeId, characterByRole, claimBySlot},
			instanceId: createId('interaction-instance')
		});
		setMessage(
			`Шаблон отправлен как одна authoring-команда: ${template.moves.length} Move(s), один Undo.`
		);
	}

	function addCustomTemplate(event: React.FormEvent) {
		event.preventDefault();
		const name = customName.trim();
		const moveLabel = customMoveLabel.trim();
		if (!name || !moveLabel) {
			return;
		}
		const id = createId('interaction-template');
		const customTemplate: InteractionTemplateDefinition = {
			id,
			name,
			description: 'Пользовательский reusable Interaction Template.',
			roles: [
				{id: 'speaker', label: 'Актор'},
				{id: 'listener', label: 'Цель'}
			],
			claimSlots: customUsesClaim
				? [{id: 'claim', label: 'Claim', required: true}]
				: [],
			moves: [
				{
					id: 'move',
					kind: customMoveKind,
					label: moveLabel,
					actorRoleId: 'speaker',
					targetRoleIds: ['listener'],
					communicatedClaimSlotId: customUsesClaim ? 'claim' : undefined,
					communicationIntent: customUsesClaim ? 'honest' : undefined
				}
			],
			tags: ['custom']
		};
		execute({type: 'template/add', template: customTemplate});
		setTemplateId(id);
		setCustomName('');
		setCustomMoveLabel('');
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Interaction Templates">
			<h2>Interaction Templates</h2>
			<p>
				Один reusable шаблон привязывается к конкретным ролям и затем атомарно
				 материализуется в обычные Narrative Moves. Runtime шаблонов не знает.
			</p>

			<form className="narrative-workspace__compact-form" onSubmit={addCustomTemplate}>
				<strong>Новый пользовательский шаблон</strong>
				<input aria-label="Название interaction template" value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Например: Попросить услугу" />
				<input aria-label="Текст move шаблона" value={customMoveLabel} onChange={event => setCustomMoveLabel(event.target.value)} placeholder="Например: Попросить помочь" />
				<select aria-label="Тип move шаблона" value={customMoveKind} onChange={event => setCustomMoveKind(event.target.value as NarrativeMoveKind)}>
					{moveKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}
				</select>
				<label>
					<input type="checkbox" checked={customUsesClaim} onChange={event => setCustomUsesClaim(event.target.checked)} />{' '}
					Шаблон использует обязательный Claim
				</label>
				<button type="submit">Сохранить шаблон</button>
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
						{role.label}
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
						{slot.label} {slot.required ? '· обязательно' : ''}
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
				<button type="submit" disabled={!template || !storyNodeId}>
					Применить шаблон
				</button>
				{message && <small>{message}</small>}
			</form>

			{project.interactionTemplates.length > 0 && (
				<div className="narrative-workspace__reaction-set">
					<strong>Пользовательские шаблоны</strong>
					{project.interactionTemplates.map(candidate => (
						<div key={candidate.id}>
							<span>{candidate.name}</span>
							<button type="button" onClick={() => execute({type: 'template/remove', id: candidate.id})}>Удалить</button>
						</div>
					))}
				</div>
			)}
		</section>
	);
};
