import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	a63ContactArrivalStoryId,
	playerNpcSocialDeliveryProjectId
} from '../../../domain/narrative/content/93-days-player-npc-social-delivery';
import {
	create93DaysProductionProjectForCurrentHost,
	narrativeProjectCanLoad93DaysProductionStarter
} from '../production-project-bootstrap';

describe('A64 production project bootstrap', () => {
	function blankProject() {
		return createNarrativeProject(
			'host-story-current',
			'Авторский проект',
			ninetyThreeDaysTemplate
		);
	}

	test('allows the explicit starter only for a blank authored project', () => {
		const project = blankProject();
		expect(narrativeProjectCanLoad93DaysProductionStarter(project)).toBe(true);

		project.storyNodes.push({
			id: 'author-owned-story',
			kind: 'event',
			title: 'Авторская сцена',
			participantIds: [],
			activationState: 'available'
		});
		expect(narrativeProjectCanLoad93DaysProductionStarter(project)).toBe(false);
	});

	test('rebinds the A63 content to the current host without losing A63 identity', () => {
		const current = blankProject();
		const production = create93DaysProductionProjectForCurrentHost(current);

		expect(production.projectId).toBe(playerNpcSocialDeliveryProjectId);
		expect(production.hostStoryId).toBe(current.hostStoryId);
		expect(production.name).toBe(current.name);
		expect(production.createdAt).toBe(current.createdAt);
		expect(
			production.storyNodes.some(node => node.id === a63ContactArrivalStoryId)
		).toBe(true);
		expect(narrativeProjectCanLoad93DaysProductionStarter(production)).toBe(false);
	});
});
