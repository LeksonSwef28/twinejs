import * as React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {createNarrativeProject} from '../../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../../domain/narrative/templates/93-days';
import {DeferredClaimInspectorPanel} from '../deferred-claim-inspector-panel';

function projectWithJournal() {
	const project = createNarrativeProject('a86-panel-host', 'Inspector UI', ninetyThreeDaysTemplate);
	project.runtimeOccurrences = [
		{
			id: 'cause1', type: 'move-outcome', storyNodeId: 'story', moveId: 'move',
			outcomeId: 'out', effectIds: ['learn'], moment: {day: 1, minuteOfDay: 360}
		},
		{
			id: 'pending1', type: 'deferred-claim', result: 'scheduled', storyNodeId: 'story',
			moveId: 'move', outcomeId: 'out', effectId: 'learn', causeOccurrenceId: 'cause1',
			dueMoment: {day: 3, minuteOfDay: 360}, moment: {day: 1, minuteOfDay: 360}
		},
		{
			id: 'expired2', type: 'deferred-claim', result: 'expired', storyNodeId: 'story',
			moveId: 'move', outcomeId: 'out', effectId: 'other', causeOccurrenceId: 'cause2',
			dueMoment: {day: 94, minuteOfDay: 360}, moment: {day: 92, minuteOfDay: 360},
			reason: 'past-project-end'
		}
	];
	return project;
}

describe('A86 deferred Claim inspector playtest panel', () => {
	test('renders grouped counts, deadline and safety disclaimer without mutating the project', () => {
		const project = projectWithJournal();
		const baseline = JSON.stringify(project);
		render(<DeferredClaimInspectorPanel project={project} />);
		expect(screen.getByRole('region', {name: 'Отложенные Claim-события'})).toBeTruthy();
		expect(screen.getByText('Ожидают · 1')).toBeTruthy();
		expect(screen.getByText('Завершены · 0 исполнено / 1 отклонено')).toBeTruthy();
		expect(screen.getByText(/Срок: День 3/)).toBeTruthy();
		expect(screen.getByText(/Просмотр не изменяет время/)).toBeTruthy();
		expect(JSON.stringify(project)).toBe(baseline);
	});

	test('discloses expired cause and technical identifiers on demand', () => {
		const project = projectWithJournal();
		render(<DeferredClaimInspectorPanel project={project} />);
		fireEvent.click(screen.getByText('Завершены · 0 исполнено / 1 отклонено'));
		expect(screen.getByText(/Срок за пределами истории/)).toBeTruthy();
		const details = screen.getAllByText('Техническая причина и идентификаторы');
		fireEvent.click(details[1]);
		expect(screen.getAllByText('cause2').length).toBeGreaterThan(0);
	});
});
