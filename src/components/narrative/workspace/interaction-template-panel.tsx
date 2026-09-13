import * as React from 'react';
import {instantiateInteractionTemplate} from '../../../domain/narrative/interaction-template';
import {starterInteractionTemplates} from '../../../domain/narrative/standard-interaction-templates';
import {useNarrativeProject} from '../../../store/narrative-project';

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

		try {
			const result = instantiateInteractionTemplate(
				template,
				{
					storyNodeId,
					characterByRole,
					claimBySlot
				},
				createId('interaction-instance')
			);

			for (const move of result.moves) {
				execute({
					type: 'move/add',
					id: move.id,
					storyNodeId: move.storyNodeId,
					kind: move.kind,
					label: move.label,
					actorCharacterId: move.actorCharacterId,
					targetCharacterIds: move.targetCharacterIds,
					communicatedClaimId: move.communicatedClaimId,
					communicationIntent: move.communicationIntent,
					guards: move.guards,
					resolution: move.resolution,
					outcomes: move.outcomes
				});
			}
			setMessage(`Создано Narrative Moves: ${result.moves.length}.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Не удалось применить шаблон.');
		}
	}

	return (
		<section className="narrative-workspace__move-editor" aria-label="Interaction Templates">
			<h2>Interaction Templates</h2>
			<p>
				Один шаблон можно привязать к любым персонажам и Claim. После привязки
				 создаются обычные Narrative Moves — отдельной runtime-механики нет.
			</p>
			<form className="narrative-workspace__compact-form" onSubmit={instantiate}>
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
		</section>
	);
};
