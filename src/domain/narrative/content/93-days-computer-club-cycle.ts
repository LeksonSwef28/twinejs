import {NarrativeProject} from '../project';
import {arrivalCorridorIds} from './93-days-arrival-corridor';
import {
	create93DaysFirstWeekProject,
	firstWeekIds
} from './93-days-first-week';

export const computerClubCycleProjectId = '93-days-computer-club-cycle-v1';

export const computerClubCycleIds = {
	locations: {
		computerClub: 'a68-computer-club'
	},
	scenes: {
		mainRoom: 'a68-computer-club:main-room'
	},
	characters: {
		clubWorker: 'a68-club-worker',
		clubRegular: 'a68-club-regular'
	},
	behaviorProfiles: {
		clubWorker: 'a68-club-worker-shift',
		clubRegular: 'a68-club-regular-routine'
	},
	routines: {
		clubWorker: 'a68-club-worker-at-club',
		clubRegular: 'a68-club-regular-at-club'
	},
	routes: {
		dormToClub: 'a68-route-dorm-club',
		clubToDorm: 'a68-route-club-dorm'
	}
} as const;

/**
 * A68-C1 initial production skeleton.
 *
 * This layer expands the already proven first-week project with one MASTER-backed
 * central/student social space. It intentionally adds only ordinary canonical
 * content data: a Computer Club location, two NPC roles, routine intent and
 * explicit travel routes. Story/provenance/cross-place consequences are added in
 * later C1 slices after the topology is proven.
 */
export function create93DaysComputerClubCycleProject(): NarrativeProject {
	const project = create93DaysFirstWeekProject();
	const ids = computerClubCycleIds;

	project.projectId = computerClubCycleProjectId;
	project.name = '93 дня до конца нашего лета — компьютерный клуб';

	project.locations = [
		...project.locations,
		{
			id: ids.locations.computerClub,
			name: 'Компьютерный клуб'
		}
	];

	project.scenes = [
		...project.scenes,
		{
			id: ids.scenes.mainRoom,
			locationId: ids.locations.computerClub,
			name: 'Основной зал компьютерного клуба'
		}
	];

	project.characters = [
		...project.characters,
		{
			id: ids.characters.clubWorker,
			name: 'Администратор компьютерного клуба',
			cognitionTier: 'light',
			defaultBehaviorProfileId: ids.behaviorProfiles.clubWorker
		},
		{
			id: ids.characters.clubRegular,
			name: 'Завсегдатай компьютерного клуба',
			cognitionTier: 'light',
			defaultBehaviorProfileId: ids.behaviorProfiles.clubRegular
		}
	];

	project.behaviorProfiles = [
		...project.behaviorProfiles,
		{
			id: ids.behaviorProfiles.clubWorker,
			characterId: ids.characters.clubWorker,
			name: 'Смена в компьютерном клубе'
		},
		{
			id: ids.behaviorProfiles.clubRegular,
			characterId: ids.characters.clubRegular,
			name: 'Учёба, общежитие и вечера в компьютерном клубе'
		}
	];

	project.routineRules = [
		...project.routineRules,
		{
			id: ids.routines.clubWorker,
			characterId: ids.characters.clubWorker,
			behaviorProfileId: ids.behaviorProfiles.clubWorker,
			activeRange: {fromDay: 8, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {
				type: 'exact',
				startMinute: 12 * 60,
				endMinute: 23 * 60
			},
			targetLocationId: ids.locations.computerClub
		},
		{
			id: ids.routines.clubRegular,
			characterId: ids.characters.clubRegular,
			behaviorProfileId: ids.behaviorProfiles.clubRegular,
			activeRange: {fromDay: 8, toDay: 93},
			recurrence: {type: 'everyDay'},
			timeWindow: {
				type: 'exact',
				startMinute: 17 * 60,
				endMinute: 22 * 60
			},
			targetLocationId: ids.locations.computerClub
		}
	];

	project.travelRoutes = [
		...(project.travelRoutes ?? []),
		{
			id: ids.routes.dormToClub,
			label: 'Дойти от общежития до компьютерного клуба',
			originLocationId: arrivalCorridorIds.locations.studentDormitory,
			destinationLocationId: ids.locations.computerClub,
			durationMinutes: 16,
			mode: 'walk',
			physicalAction: 'walk'
		},
		{
			id: ids.routes.clubToDorm,
			label: 'Вернуться от компьютерного клуба к общежитию',
			originLocationId: ids.locations.computerClub,
			destinationLocationId: arrivalCorridorIds.locations.studentDormitory,
			durationMinutes: 16,
			mode: 'walk',
			physicalAction: 'walk'
		}
	];

	// Keep the existing A67 Old City content intact. The first C1 bridge Story
	// will explicitly reconnect to this character rather than duplicating it.
	if (
		!project.characters.some(
			character => character.id === firstWeekIds.characters.cameraStudent
		)
	) {
		throw new Error('A68-C1 requires the canonical A67 camera student.');
	}

	return project;
}
