import {NarrativeProject} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';

export const scaleFixtureDayCount = 93;
export const scaleFixtureStorySlotsPerDay = 8;
export const scaleFixtureCharacterCount = 96;
export const scaleFixtureLocationCount = 24;

/**
 * A production-shaped fixture that spans the complete summer. It intentionally
 * uses ordinary project entities and ordinary runtime APIs; there is no special
 * benchmark-only representation or shortened calendar.
 */
export function createNinetyThreeDayScaleFixture(): NarrativeProject {
	const project = createNarrativeProject(
		'story-a45-scale',
		'A45 93-day scale fixture',
		ninetyThreeDaysTemplate
	);

	project.locations = Array.from({length: scaleFixtureLocationCount}, (_, index) => ({
		id: `location-${index}`,
		name: `Локация ${index}`
	}));
	project.characters = Array.from({length: scaleFixtureCharacterCount}, (_, index) => ({
		id: `character-${index}`,
		name: `Персонаж ${index}`,
		cognitionTier: index < 24 ? ('full' as const) : index < 64 ? ('light' as const) : ('background' as const),
		defaultBehaviorProfileId: `profile-${index}`
	}));
	project.behaviorProfiles = project.characters.map((character, index) => ({
		id: `profile-${index}`,
		characterId: character.id,
		name: 'Обычная жизнь'
	}));
	project.routineRules = project.characters.map((character, index) => ({
		id: `routine-${index}`,
		characterId: character.id,
		behaviorProfileId: character.defaultBehaviorProfileId,
		activeRange: {fromDay: 1, toDay: scaleFixtureDayCount},
		recurrence: {type: 'everyDay' as const},
		timeWindow: {
			type: 'exact' as const,
			startMinute: 8 * 60 + (index % 4) * 15,
			endMinute: 17 * 60 + (index % 3) * 20,
			endDayOffset: 0 as const
		},
		targetLocationId: `location-${index % scaleFixtureLocationCount}`
	}));
	project.simulation.actualLocationByCharacter = Object.fromEntries(
		project.characters.map((character, index) => [
			character.id,
			`location-${index % scaleFixtureLocationCount}`
		])
	);

	project.storyNodes = Array.from(
		{length: scaleFixtureDayCount * scaleFixtureStorySlotsPerDay},
		(_, index) => {
			const day = Math.floor(index / scaleFixtureStorySlotsPerDay) + 1;
			const slot = index % scaleFixtureStorySlotsPerDay;
			return {
				id: `story-${index.toString().padStart(4, '0')}`,
				kind: slot % 3 === 0 ? ('event' as const) : ('beat' as const),
				title: `День ${day}, событие ${slot + 1}`,
				participantIds: [`character-${index % scaleFixtureCharacterCount}`],
				placement: {
					day,
					minuteOfDay: slot * 3 * 60,
					locationId: `location-${index % scaleFixtureLocationCount}`
				},
				activationState: 'available' as const
			};
		}
	);
	project.storyConnections = project.storyNodes.slice(1).map((node, index) => ({
		id: `connection-${index}`,
		sourceNodeId: project.storyNodes[index].id,
		targetNodeId: node.id,
		kind: 'semantic' as const,
		mode: 'reference' as const
	}));

	return project;
}
