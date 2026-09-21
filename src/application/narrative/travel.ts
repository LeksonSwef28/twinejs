import {
	applyNarrativeCashSpend,
	evaluateNarrativeCashSpend,
	NarrativeCashSpendTrace
} from '../../domain/narrative/economy';
import {PhysicalActionKind} from '../../domain/narrative/injury';
import {NarrativeProject} from '../../domain/narrative/project';
import {
	NarrativeTravelRouteDefinition,
	narrativeTravelRouteIsStructurallyValid
} from '../../domain/narrative/travel';
import {setNarrativeCharacterActualLocation} from './living-simulation';
import {
	evaluateNarrativePhysicalAction,
	NarrativePhysicalActionEvaluation
} from './physical';
import {
	advanceNarrativeProjectSimulation,
	NarrativeProjectSimulationStepResult
} from './simulation';

export type NarrativeTravelRejectionReason =
	| 'unknown-route'
	| 'unknown-character'
	| 'invalid-route'
	| 'wrong-origin'
	| 'physical-blocked'
	| 'insufficient-funds'
	| 'project-end';

export type NarrativeTravelExecutionResult =
	| {
			status: 'applied';
			project: NarrativeProject;
			route: NarrativeTravelRouteDefinition;
			characterId: string;
			simulation: NarrativeProjectSimulationStepResult;
			physical?: NarrativePhysicalActionEvaluation;
			fareMinorUnits?: number;
			spendTrace?: NarrativeCashSpendTrace;
	  }
	| {
			status: 'rejected';
			project: NarrativeProject;
			reason: NarrativeTravelRejectionReason;
			summary: string;
			route?: NarrativeTravelRouteDefinition;
			physical?: NarrativePhysicalActionEvaluation;
	  };

function physicalEvaluation(
	project: NarrativeProject,
	characterId: string,
	action: PhysicalActionKind | undefined
) {
	return action
		? evaluateNarrativePhysicalAction(project, characterId, action)
		: undefined;
}

/**
 * A56 canonical travel orchestrator.
 *
 * Ordering is deliberate:
 * validate -> physical eligibility -> canonical simulation time -> Actual Presence.
 * Any rejected path returns the original project unchanged.
 */
export function executeNarrativeTravel(
	project: NarrativeProject,
	routeId: string,
	characterId: string
): NarrativeTravelExecutionResult {
	const route = (project.travelRoutes ?? []).find(
		candidate => candidate.id === routeId
	);
	if (!route) {
		return {
			status: 'rejected',
			project,
			reason: 'unknown-route',
			summary: 'Маршрут не найден в текущем Narrative Project.'
		};
	}
	if (!project.characters.some(character => character.id === characterId)) {
		return {
			status: 'rejected',
			project,
			route,
			reason: 'unknown-character',
			summary: 'Путешествующий персонаж не найден.'
		};
	}
	if (
		!narrativeTravelRouteIsStructurallyValid(route) ||
		!project.locations.some(location => location.id === route.originLocationId) ||
		!project.locations.some(
			location => location.id === route.destinationLocationId
		)
	) {
		return {
			status: 'rejected',
			project,
			route,
			reason: 'invalid-route',
			summary: 'Маршрут содержит недействительные authored данные.'
		};
	}
	if (
		project.simulation.actualLocationByCharacter[characterId] !==
		route.originLocationId
	) {
		return {
			status: 'rejected',
			project,
			route,
			reason: 'wrong-origin',
			summary: 'Персонаж сейчас находится не в исходной точке маршрута.'
		};
	}

	const physical = physicalEvaluation(project, characterId, route.physicalAction);
	if (physical && !physical.allowed) {
		return {
			status: 'rejected',
			project,
			route,
			physical,
			reason: 'physical-blocked',
			summary: physical.blockers.map(blocker => blocker.message).join(' ')
		};
	}

	const fareEvaluation =
		route.fareMinorUnits === undefined
			? undefined
			: evaluateNarrativeCashSpend(
					project.cashByCharacter,
					characterId,
					route.fareMinorUnits,
					true
				);
	if (fareEvaluation && !fareEvaluation.allowed) {
		return {
			status: 'rejected',
			project,
			route,
			physical,
			reason:
				fareEvaluation.reason === 'insufficient-funds'
					? 'insufficient-funds'
					: 'invalid-route',
			summary: fareEvaluation.summary
		};
	}

	const simulation = advanceNarrativeProjectSimulation(
		project,
		route.durationMinutes
	);
	if (simulation.trace.appliedMinutes !== route.durationMinutes) {
		return {
			status: 'rejected',
			project,
			route,
			physical,
			reason: 'project-end',
			summary: 'До конца проекта недостаточно времени для полного маршрута.'
		};
	}

	const paidProject =
		fareEvaluation?.allowed === true
			? {
					...simulation.project,
					cashByCharacter: applyNarrativeCashSpend(
						simulation.project.cashByCharacter,
						fareEvaluation
					)
				}
			: simulation.project;

	return {
		status: 'applied',
		project: setNarrativeCharacterActualLocation(
			paidProject,
			characterId,
			route.destinationLocationId
		),
		route,
		characterId,
		simulation,
		physical,
		fareMinorUnits: route.fareMinorUnits,
		spendTrace: fareEvaluation?.allowed ? fareEvaluation.trace : undefined
	};
}
