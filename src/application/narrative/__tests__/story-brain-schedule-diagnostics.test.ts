import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {storyBrainNavigationForFinding} from '../story-brain-diagnostic-navigation';
import {
	queryStoryBrain,
	queryStoryBrainProjectDiagnostics
} from '../story-brain-query';

function projectWithScheduleConflict() {
	const project = createNarrativeProject(
		'schedule-story-brain',
		'Schedule Story Brain',
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
	project.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'school', name: 'Школа'}
	];
	project.routineRules = [
		{
			id: 'home-rule',
			characterId: 'hero',
			behaviorProfileId: 'hero-profile',
			activeRange: {fromDay: 1, toDay: 1},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 480, endMinute: 660},
			targetLocationId: 'home'
		},
		{
			id: 'school-rule',
			characterId: 'hero',
			behaviorProfileId: 'hero-profile',
			activeRange: {fromDay: 1, toDay: 1},
			recurrence: {type: 'everyDay'},
			timeWindow: {type: 'exact', startMinute: 600, endMinute: 720},
			targetLocationId: 'school'
		}
	];
	return project;
}

describe('Story Brain schedule diagnostics', () => {
	it('shows routine overlaps globally and in Character focus', () => {
		const project = projectWithScheduleConflict();
		const diagnostics = queryStoryBrainProjectDiagnostics(project);
		const focused = queryStoryBrain(project, {kind: 'character', id: 'hero'});
		const finding = diagnostics.findings.find(candidate => candidate.kind === 'routine-overlap');

		expect(finding).toEqual(
			expect.objectContaining({
				kind: 'routine-overlap',
				characterId: 'hero',
				ruleIds: ['home-rule', 'school-rule']
			})
		);
		expect(focused.coverage.findings).toContainEqual(finding);
		expect(focused.projectDiagnostics.findings).toContainEqual(finding);
		expect(finding && storyBrainNavigationForFinding(project, finding)).toEqual({
			focus: {kind: 'character', id: 'hero'},
			workspace: 'world-time',
			worldTimeCenterAbsoluteMinute: 630
		});
	});
});
