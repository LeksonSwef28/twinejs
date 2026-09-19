import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {storyBrainNavigationForFinding} from '../story-brain-diagnostic-navigation';
import {
	queryStoryBrain,
	queryStoryBrainProjectDiagnostics
} from '../story-brain-query';

function projectWithExceptionAmbiguity() {
	const project = createNarrativeProject(
		'schedule-exception-story-brain',
		'Schedule exception Story Brain',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'hero',
			name: 'Герой',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'hero-profile'
		}
	];
	project.behaviorProfiles = [
		{id: 'hero-profile', characterId: 'hero', name: 'Герой'}
	];
	project.scheduleExceptions = [
		{
			id: 'stay-home',
			characterId: 'hero',
			activeRange: {fromDay: 1, toDay: 1},
			timeWindow: {type: 'exact', startMinute: 600, endMinute: 660},
			priority: 100
		},
		{
			id: 'go-school',
			characterId: 'hero',
			activeRange: {fromDay: 1, toDay: 1},
			timeWindow: {type: 'exact', startMinute: 630, endMinute: 700},
			priority: 100
		}
	];
	return project;
}

describe('Story Brain ScheduleException diagnostics', () => {
	it('shows priority ties globally and in Character focus and jumps to WORLD/TIME', () => {
		const project = projectWithExceptionAmbiguity();
		const diagnostics = queryStoryBrainProjectDiagnostics(project);
		const focused = queryStoryBrain(project, {kind: 'character', id: 'hero'});
		const finding = diagnostics.findings.find(
			candidate => candidate.kind === 'schedule-exception-ambiguity'
		);

		expect(finding).toEqual(
			expect.objectContaining({
				kind: 'schedule-exception-ambiguity',
				characterId: 'hero',
				ruleIds: ['go-school', 'stay-home'],
				overlap: {start: 630, end: 660}
			})
		);
		expect(focused.coverage.findings).toContainEqual(finding);
		expect(focused.projectDiagnostics.findings).toContainEqual(finding);
		expect(finding && storyBrainNavigationForFinding(project, finding)).toEqual({
			focus: {kind: 'character', id: 'hero'},
			workspace: 'world-time',
			worldTimeCenterAbsoluteMinute: 645
		});
	});
});
