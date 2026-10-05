import * as React from 'react';
import {useNarrativeProject} from '../../../store/narrative-project';
import {CanonicalEntityPanel} from './canonical-entity-panel';

export const ProjectIdentityPanel: React.FC = () => {
	const {project, execute, recovery, startFreshAfterRecovery} =
		useNarrativeProject();
	const [name, setName] = React.useState(project.name);

	React.useEffect(() => {
		setName(project.name);
	}, [project.name]);

	function rename(event: React.FormEvent) {
		event.preventDefault();
		const nextName = name.trim();
		if (!nextName || nextName === project.name) {
			setName(project.name);
			return;
		}
		execute({type: 'project/rename', name: nextName});
	}

	return (
		<>
			{recovery && (
				<section
					className="narrative-workspace__project-identity"
					role="alert"
					aria-label="Восстановление проекта"
				>
					<div>
						<strong>Сохранение проекта повреждено или несовместимо.</strong>
						<p>
							Автосохранение заблокировано, чтобы не перезаписать исходные
							 данные. Повреждённый payload сохранён отдельно
							{recovery.backupKeys.length > 0
								? ` (${recovery.backupKeys.length} recovery-копия).`
								: ', но браузер не позволил создать recovery-копию.'}
						</p>
					</div>
					<button type="button" onClick={startFreshAfterRecovery}>
						Начать с чистого проекта
					</button>
				</section>
			)}
			<form
				className="narrative-workspace__project-identity"
				onSubmit={rename}
				aria-label="Настройки проекта"
			>
				<label>
					Название проекта
					<input
						aria-label="Название проекта"
						value={name}
						onChange={event => setName(event.target.value)}
					/>
				</label>
				<button
					type="submit"
					disabled={!name.trim() || name.trim() === project.name}
				>
					Переименовать
				</button>
				<small>Authoring metadata · участвует в Undo / Redo.</small>
			</form>
			<CanonicalEntityPanel />
		</>
	);
};
