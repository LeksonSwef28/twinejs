import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {a63ContactArrivalStoryId} from '../../../domain/narrative/content/93-days-player-npc-social-delivery';
import {firstWeekIds} from '../../../domain/narrative/content/93-days-first-week';
import {
	computerClubCycleIds,
	computerClubCycleProjectId
} from '../../../domain/narrative/content/93-days-computer-club-cycle';
import {
	create93DaysProductionProjectForCurrentHost,
	narrativeProjectCanLoad93DaysProductionStarter
} from '../production-project-bootstrap';
import {narrativeProductionDueWorkIsEnabled} from '../player-production-due-work';

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

	test('rebinds the current A68 composition to the host and keeps prior slices playable', () => {
		const current = blankProject();
		const production = create93DaysProductionProjectForCurrentHost(current);

		expect(production.projectId).toBe(computerClubCycleProjectId);
		expect(production.hostStoryId).toBe(current.hostStoryId);
		expect(production.name).toBe(current.name);
		expect(production.createdAt).toBe(current.createdAt);
		expect(
			production.storyNodes.some(node => node.id === a63ContactArrivalStoryId)
		).toBe(true);
		expect(
			production.storyNodes.some(
				node => node.id === firstWeekIds.story.daySevenReflection
			)
		).toBe(true);
		expect(
			production.locations.some(
				location => location.id === computerClubCycleIds.locations.computerClub
			)
		).toBe(true);
		expect(
			production.storyNodes.some(
				node => node.id === computerClubCycleIds.story.dormEcho
			)
		).toBe(true);
		expect(compileNarrativeRuntimeArtifact(production).status).toBe('compiled');
		expect(narrativeProductionDueWorkIsEnabled(production.projectId)).toBe(true);
		expect(narrativeProjectCanLoad93DaysProductionStarter(production)).toBe(false);
	});
});
