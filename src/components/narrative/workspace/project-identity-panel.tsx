import * as React from 'react';
import {useNarrativeProject} from '../../../store/narrative-project';

export const ProjectIdentityPanel: React.FC = () => {
	const {project, execute} = useNarrativeProject();
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
			<button type="submit" disabled={!name.trim() || name.trim() === project.name}>
				Переименовать
			</button>
			<small>Authoring metadata · участвует в Undo / Redo.</small>
		</form>
	);
};
