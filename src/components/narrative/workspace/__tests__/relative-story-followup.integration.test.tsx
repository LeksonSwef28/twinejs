import * as React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectProvider,
	useNarrativeProject
} from '../../../../store/narrative-project';
import {createLocalStorageNarrativeProjectRepository} from '../../../../store/narrative-project/repository';
import {StoryMetadataPanel} from '../story-metadata-panel';

const host = 'a83-relative-host';
const name = 'A83 followup authoring';

const UI: React.FC = () => {
	const {project, undo} = useNarrativeProject();
	return (
		<>
			<output data-testid="timing">
				{project.storyNodes[1]?.placement?.day ?? '-'}:
				{project.storyNodes[1]?.placement?.minuteOfDay ?? '-'}
			</output>
			<output data-testid="clock">
				{project.simulation.day}:{project.simulation.minuteOfDay}
			</output>
			<button type="button" onClick={undo}>Отменить размещение</button>
			<StoryMetadataPanel />
		</>
	);
};

describe('A83 relative Story continuation authoring UI', () => {
	beforeEach(() => window.localStorage.clear());

	test('previews exact due placement, warns about causal distinction, saves and undoes without advancing time', async () => {
		const project = createNarrativeProject(host, name, ninetyThreeDaysTemplate);
		project.storyNodes = [{
			id: 'origin',
			kind: 'dialogue',
			title: 'Встреча',
			participantIds: [],
			placement: {day: 9, minuteOfDay: 660},
			activationState: 'available'
		}, {
			id: 'followup',
			kind: 'dialogue',
			title: 'Ответ',
			participantIds: [],
			activationState: 'dormant'
		}];
		const repository = createLocalStorageNarrativeProjectRepository(
			host, name, ninetyThreeDaysTemplate
		);
		repository.save(project);
		render(
			<NarrativeProjectProvider hostStoryId={host} projectName={name}>
				<UI />
			</NarrativeProjectProvider>
		);
		fireEvent.change(screen.getByLabelText('Сюжетный блок для Story metadata'), {
			target: {value: 'followup'}
		});
		fireEvent.change(screen.getByLabelText('Исходная сцена для продолжения'), {
			target: {value: 'origin'}
		});
		expect(screen.getByText(/это только размещение на календаре без причинной связи/))
			.toBeInTheDocument();
		expect(screen.getByText(/План: день 11/)).toBeInTheDocument();
		expect(screen.getByText(/а НЕ таймер/)).toBeInTheDocument();
		expect(screen.getByTestId('clock')).toHaveTextContent('1:360');
		fireEvent.click(screen.getByRole('button', {name: 'Назначить время продолжения'}));
		await waitFor(() =>
			expect(screen.getByTestId('timing')).toHaveTextContent('11:660')
		);
		expect(screen.getByTestId('clock')).toHaveTextContent('1:360');
		await waitFor(() =>
			expect(repository.load().storyNodes[1].placement).toEqual({day: 11, minuteOfDay: 660})
		);
		expect(screen.getByRole('button', {name: 'Назначить время продолжения'}))
			.toBeDisabled();
		fireEvent.click(screen.getByRole('button', {name: 'Отменить размещение'}));
		expect(screen.getByTestId('timing')).toHaveTextContent('-:-');
		expect(screen.getByTestId('clock')).toHaveTextContent('1:360');
	});

	test('does not offer an overwrite when target is already placed', () => {
		const project = createNarrativeProject(host, name, ninetyThreeDaysTemplate);
		project.storyNodes = [{
			id: 'origin',
			kind: 'dialogue',
			title: 'Встреча',
			participantIds: [],
			placement: {day: 9, minuteOfDay: 660},
			activationState: 'available'
		}, {
			id: 'followup',
			kind: 'dialogue',
			title: 'Ответ',
			participantIds: [],
			placement: {day: 12, minuteOfDay: 600},
			activationState: 'dormant'
		}];
		createLocalStorageNarrativeProjectRepository(
			host, name, ninetyThreeDaysTemplate
		).save(project);
		render(
			<NarrativeProjectProvider hostStoryId={host} projectName={name}>
				<UI />
			</NarrativeProjectProvider>
		);
		fireEvent.change(screen.getByLabelText('Сюжетный блок для Story metadata'), {
			target: {value: 'followup'}
		});
		fireEvent.change(screen.getByLabelText('Исходная сцена для продолжения'), {
			target: {value: 'origin'}
		});
		expect(screen.getByText(/перезаписи не будет/)).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Назначить время продолжения'}))
			.toBeDisabled();
	});
});
