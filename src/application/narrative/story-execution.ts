import {
	createActiveStoryExecution,
	interruptActiveStoryExecution,
	normalizedStoryRuntimePolicy,
	runtimeExecutionAbsoluteMinute,
	storyExecutionConflicts,
	storyRuntimePolicyIsValid,
	storyWorkWasConsumed
} from '../../domain/narrative/runtime-execution';
import {
	appendNarrativeStoryWorkOccurrence,
	NarrativeRuntimeOccurrence
} from '../../domain/narrative/runtime-story';
import {NarrativeProject} from '../../domain/narrative/project';
import {scheduledStoryWork} from '../../domain/narrative/simulation-kernel';

export type NarrativeStoryWorkDecision = 'execute' | 'miss';

export type NarrativeStoryWorkExecutionStatus =
	| 'started'
	| 'completed'
	| 'missed'
	| 'expired'
	| 'not-due'
	| 'already-active'
	| 'already-consumed'
	| 'conflict'
	| 'preemption-blocked'
	| 'insufficient-time'
	| 'invalid-policy'
	| 'unknown-work';

export interface NarrativeStoryWorkExecutionRequest {
	decision: NarrativeStoryWorkDecision;
	/** Explicitly selected active executions that may be interrupted to start this work. */
	preemptExecutionIds?: string[];
}

export interface NarrativeStoryWorkExecutionTrace {
	workId: string;
	storyNodeId?: string;
	status: NarrativeStoryWorkExecutionStatus;
	decision: NarrativeStoryWorkDecision;
	scheduledDay?: number;
	scheduledMinuteOfDay?: number;
	occurrenceMode?: 'one-shot' | 'repeatable';
	durationMinutes?: number;
	missAfterMinutes?: number;
	interruption?: 'interruptible' | 'locked';
	conflictingExecutionIds: string[];
	preemptedExecutionIds: string[];
	executionId?: string;
	occurrenceId?: string;
	summary: string;
}

export interface NarrativeStoryWorkExecutionResult {
	project: NarrativeProject;
	trace: NarrativeStoryWorkExecutionTrace;
}

export interface NarrativeStoryExecutionInterruptTrace {
	executionId: string;
	status: 'interrupted' | 'locked' | 'missing';
	occurrenceId?: string;
	summary: string;
}

function currentMoment(project: NarrativeProject) {
	return {
		day: project.simulation.day,
		minuteOfDay: project.simulation.minuteOfDay
	};
}

function storyWorkMissWasRecorded(
	history: NarrativeRuntimeOccurrence[],
	workId: string,
	scheduledDay: number,
	scheduledMinuteOfDay: number
) {
	return history.some(
		occurrence =>
			occurrence.type === 'story-work' &&
			occurrence.workId === workId &&
			occurrence.result === 'missed' &&
			occurrence.scheduledMoment.day === scheduledDay &&
			occurrence.scheduledMoment.minuteOfDay === scheduledMinuteOfDay
	);
}

function traceBase(
	workId: string,
	decision: NarrativeStoryWorkDecision
): NarrativeStoryWorkExecutionTrace {
	return {
		workId,
		status: 'unknown-work',
		decision,
		conflictingExecutionIds: [],
		preemptedExecutionIds: [],
		summary: 'Scheduled Story work was not found.'
	};
}

function recordMiss(
	project: NarrativeProject,
	workId: string,
	storyNodeId: string,
	scheduledMoment: {day: number; minuteOfDay: number},
	plannedDurationMinutes: number,
	status: 'missed' | 'expired',
	trace: NarrativeStoryWorkExecutionTrace
): NarrativeStoryWorkExecutionResult {
	const write = appendNarrativeStoryWorkOccurrence(project.runtimeOccurrences, {
		type: 'story-work',
		workId,
		storyNodeId,
		result: 'missed',
		scheduledMoment: {...scheduledMoment},
		moment: currentMoment(project),
		plannedDurationMinutes,
		elapsedMinutes: 0
	});
	return {
		project: {
			...project,
			runtimeOccurrences: write.history,
			storyNodeStateOverrides: {
				...project.storyNodeStateOverrides,
				[storyNodeId]: 'blocked'
			}
		},
		trace: {
			...trace,
			status,
			occurrenceId: write.occurrence.id,
			summary:
				status === 'expired'
					? 'Story work expired after its authored miss window and was recorded as missed.'
					: 'Story work was explicitly recorded as missed.'
		}
	};
}

/**
 * A42 explicit consume/execute boundary for scheduled Story work. The clock
 * never calls this function automatically. A caller must decide to execute or
 * miss work that has become due.
 */
export function consumeNarrativeStoryWork(
	project: NarrativeProject,
	workId: string,
	request: NarrativeStoryWorkExecutionRequest
): NarrativeStoryWorkExecutionResult {
	const base = traceBase(workId, request.decision);
	const work = scheduledStoryWork(project.storyNodes).find(item => item.id === workId);
	if (!work?.sourceEntityId) {
		return {project, trace: base};
	}
	const node = project.storyNodes.find(candidate => candidate.id === work.sourceEntityId);
	if (!node) {
		return {project, trace: base};
	}
	if (!storyRuntimePolicyIsValid(node.runtimePolicy)) {
		return {
			project,
			trace: {
				...base,
				storyNodeId: node.id,
				status: 'invalid-policy',
				summary: 'Authored Story runtime policy is invalid.'
			}
		};
	}
	const policy = normalizedStoryRuntimePolicy(node);
	const trace: NarrativeStoryWorkExecutionTrace = {
		...base,
		storyNodeId: node.id,
		scheduledDay: work.moment.day,
		scheduledMinuteOfDay: work.moment.minuteOfDay,
		occurrenceMode: policy.occurrenceMode,
		durationMinutes: policy.durationMinutes,
		missAfterMinutes: policy.missAfterMinutes,
		interruption: policy.interruption
	};
	const now = currentMoment(project);
	const nowAbsolute = runtimeExecutionAbsoluteMinute(now);
	const scheduledAbsolute = runtimeExecutionAbsoluteMinute(work.moment);
	if (nowAbsolute < scheduledAbsolute) {
		return {
			project,
			trace: {...trace, status: 'not-due', summary: 'Story work is not due yet.'}
		};
	}
	if (project.activeStoryExecutions.some(execution => execution.workId === workId)) {
		return {
			project,
			trace: {
				...trace,
				status: 'already-active',
				summary: 'This Story work is already active.'
			}
		};
	}
	const missRecorded = storyWorkMissWasRecorded(
		project.runtimeOccurrences,
		workId,
		work.moment.day,
		work.moment.minuteOfDay
	);
	if (
		missRecorded ||
		(policy.occurrenceMode === 'one-shot' &&
			storyWorkWasConsumed(project.runtimeOccurrences, workId))
	) {
		return {
			project,
			trace: {
				...trace,
				status: 'already-consumed',
				summary: 'One-shot Story work or this scheduled opportunity was already consumed.'
			}
		};
	}
	if (
		policy.missAfterMinutes !== undefined &&
		nowAbsolute > scheduledAbsolute + policy.missAfterMinutes
	) {
		return recordMiss(
			project,
			workId,
			node.id,
			work.moment,
			policy.durationMinutes,
			'expired',
			trace
		);
	}
	if (request.decision === 'miss') {
		return recordMiss(
			project,
			workId,
			node.id,
			work.moment,
			policy.durationMinutes,
			'missed',
			trace
		);
	}

	const completionAbsolute = nowAbsolute + policy.durationMinutes;
	const maximumAbsolute = project.template.dayCount * 24 * 60 - 1;
	if (completionAbsolute > maximumAbsolute) {
		return {
			project,
			trace: {
				...trace,
				status: 'insufficient-time',
				summary: 'Story work cannot finish before the end of the 93-day project.'
			}
		};
	}

	const conflicts = storyExecutionConflicts(
		project.activeStoryExecutions,
		node.participantIds
	);
	trace.conflictingExecutionIds = conflicts.map(execution => execution.id);
	const requestedPreemptions = new Set(request.preemptExecutionIds ?? []);
	if (
		conflicts.length > 0 &&
		conflicts.some(execution => !requestedPreemptions.has(execution.id))
	) {
		return {
			project,
			trace: {
				...trace,
				status: 'conflict',
				summary: 'Participants are busy in active Story work; preemption must be explicit.'
			}
		};
	}
	if (conflicts.some(execution => execution.interruption === 'locked')) {
		return {
			project,
			trace: {
				...trace,
				status: 'preemption-blocked',
				summary: 'At least one conflicting Story execution is locked against interruption.'
			}
		};
	}

	let activeExecutions = project.activeStoryExecutions;
	let runtimeOccurrences = project.runtimeOccurrences;
	let storyNodeStateOverrides = project.storyNodeStateOverrides;
	const preemptedExecutionIds: string[] = [];
	for (const conflict of conflicts) {
		const interrupted = interruptActiveStoryExecution(
			activeExecutions,
			runtimeOccurrences,
			storyNodeStateOverrides,
			conflict.id,
			now
		);
		if (interrupted.status !== 'interrupted') {
			throw new Error(`Preemption changed after validation: ${conflict.id}`);
		}
		activeExecutions = interrupted.activeExecutions;
		runtimeOccurrences = interrupted.runtimeOccurrences;
		storyNodeStateOverrides = interrupted.storyNodeStateOverrides;
		preemptedExecutionIds.push(conflict.id);
	}

	if (policy.durationMinutes === 0) {
		const write = appendNarrativeStoryWorkOccurrence(runtimeOccurrences, {
			type: 'story-work',
			workId,
			storyNodeId: node.id,
			result: 'executed',
			scheduledMoment: {...work.moment},
			startedAt: {...now},
			moment: {...now},
			plannedDurationMinutes: 0,
			elapsedMinutes: 0
		});
		return {
			project: {
				...project,
				activeStoryExecutions: activeExecutions,
				runtimeOccurrences: write.history,
				storyNodeStateOverrides: {
					...storyNodeStateOverrides,
					[node.id]:
						policy.occurrenceMode === 'one-shot' ? 'completed' : 'available'
				}
			},
			trace: {
				...trace,
				status: 'completed',
				preemptedExecutionIds,
				occurrenceId: write.occurrence.id,
				summary: 'Zero-duration Story work executed immediately.'
			}
		};
	}

	const execution = createActiveStoryExecution(
		workId,
		node,
		work.moment,
		now,
		policy,
		activeExecutions,
		runtimeOccurrences
	);
	return {
		project: {
			...project,
			activeStoryExecutions: [...activeExecutions, execution],
			runtimeOccurrences,
			storyNodeStateOverrides: {
				...storyNodeStateOverrides,
				[node.id]: 'active'
			}
		},
		trace: {
			...trace,
			status: 'started',
			preemptedExecutionIds,
			executionId: execution.id,
			summary: `Story work started for ${policy.durationMinutes} simulation minutes.`
		}
	};
}

/** Explicit interruption; the Simulation Playhead never chooses this itself. */
export function interruptNarrativeStoryExecution(
	project: NarrativeProject,
	executionId: string
): {project: NarrativeProject; trace: NarrativeStoryExecutionInterruptTrace} {
	const interrupted = interruptActiveStoryExecution(
		project.activeStoryExecutions,
		project.runtimeOccurrences,
		project.storyNodeStateOverrides,
		executionId,
		currentMoment(project)
	);
	if (interrupted.status !== 'interrupted') {
		return {
			project,
			trace: {
				executionId,
				status: interrupted.status,
				summary:
					interrupted.status === 'locked'
						? 'Story execution is locked against interruption.'
						: 'Active Story execution was not found.'
			}
		};
	}
	return {
		project: {
			...project,
			activeStoryExecutions: interrupted.activeExecutions,
			runtimeOccurrences: interrupted.runtimeOccurrences,
			storyNodeStateOverrides: interrupted.storyNodeStateOverrides
		},
		trace: {
			executionId,
			status: 'interrupted',
			occurrenceId: interrupted.occurrenceId,
			summary: 'Story execution was explicitly interrupted.'
		}
	};
}
