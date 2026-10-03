import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';
import {
	create93DaysFirstWeekProject,
	firstWeekIds
} from '../../../domain/narrative/content/93-days-first-week';

describe('A67-W1 first-week content skeleton', () => {
	test('extends the existing Day 1-4 production project without a new schema', () => {
		const project = create93DaysFirstWeekProject();

		expect(project.projectId).toBe('93-days-first-week-v1');
		expect(project.schemaVersion).toBe(3);
		expect(
			project.storyNodes.some(
				node => node.id === rumorSocialEchoIds.story.contactReportsToDormDuty
			)
		).toBe(true);
		expect(
			project.locations.some(
				location => location.id === firstWeekIds.locations.oldMarketSquare
			)
		).toBe(true);
		expect(
			project.characters.some(
				character => character.id === firstWeekIds.characters.cameraStudent
			)
		).toBe(true);
	});

	test('places a coherent Day 5-7 topology into canonical Story data', () => {
		const project = create93DaysFirstWeekProject();
		const nodes = Object.fromEntries(
			project.storyNodes.map(node => [node.id, node])
		);

		expect(nodes[firstWeekIds.story.dayFiveMarketIntroduction].placement).toMatchObject({
			day: 5,
			locationId: firstWeekIds.locations.oldMarketSquare
		});
		expect(nodes[firstWeekIds.story.daySixCinemaSquare].placement).toMatchObject({
			day: 6,
			locationId: firstWeekIds.locations.oldMarketSquare
		});
		expect(nodes[firstWeekIds.story.daySixDormCounterline].placement).toMatchObject({
			day: 6,
			locationId: 'arrival-student-dormitory'
		});
		expect(nodes[firstWeekIds.story.daySevenWeekEcho].placement).toMatchObject({
			day: 7,
			locationId: 'arrival-student-dormitory'
		});
		expect(nodes[firstWeekIds.story.daySevenWeekEcho].activationState).toBe(
			'dormant'
		);
	});

	test('adds ordinary routes and routine data for the new social hub', () => {
		const project = create93DaysFirstWeekProject();

		expect(project.travelRoutes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.routes.dormToMarketBus,
					destinationLocationId: firstWeekIds.locations.oldMarketSquare
				}),
				expect.objectContaining({
					id: firstWeekIds.routes.marketToDormBus,
					originLocationId: firstWeekIds.locations.oldMarketSquare
				})
			])
		);
		expect(project.routineRules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.routines.cameraStudentMarket,
					characterId: firstWeekIds.characters.cameraStudent,
					targetLocationId: firstWeekIds.locations.oldMarketSquare
				})
			])
		);
	});

	test('still compiles through the canonical runtime artifact compiler', () => {
		const compiled = compileNarrativeRuntimeArtifact(
			create93DaysFirstWeekProject()
		);

		expect(compiled.status).toBe('compiled');
		if (compiled.status !== 'compiled') {
			throw new Error(
				compiled.diagnostics.map(item => item.source).join('\n')
			);
		}
		expect(compiled.artifact.authored.projectId).toBe('93-days-first-week-v1');
	});
});
