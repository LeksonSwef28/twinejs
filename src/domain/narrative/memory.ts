import {MemorySource, MemoryTrace} from './cognition';
import {EntityId} from './entities';

export interface MemoryMoment {
	day: number;
	minuteOfDay: number;
}

export interface MemoryWriteInput {
	id: EntityId;
	characterId: EntityId;
	summary: string;
	importance: number;
	baseStrength: number;
	tags: string[];
	relatedEntityIds: EntityId[];
	source: MemorySource;
	moment: MemoryMoment;
}

export interface MemoryWriteResult {
	memories: MemoryTrace[];
	memory: MemoryTrace;
	created: boolean;
}

export interface MemorySaliencePolicy {
	halfLifeDays: number;
	strengthWeight: number;
	importanceWeight: number;
	reinforcementPerHit: number;
	maximumReinforcementBoost: number;
}

export interface MemorySalienceTrace {
	memoryId: EntityId;
	ageDays: number;
	decayedStrength: number;
	importance: number;
	reinforcementCount: number;
	reinforcementBoost: number;
	salience: number;
}

export const defaultMemorySaliencePolicy: MemorySaliencePolicy = {
	halfLifeDays: 7,
	strengthWeight: 0.65,
	importanceWeight: 0.35,
	reinforcementPerHit: 0.05,
	maximumReinforcementBoost: 0.3
};

function clamp01(value: number) {
	return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function momentToAbsoluteMinute(moment: MemoryMoment) {
	return Math.max(0, (Math.max(1, moment.day) - 1) * 24 * 60 + moment.minuteOfDay);
}

/**
 * A31 write model. Repeating the same stable memory id reinforces the existing
 * trace instead of duplicating objective history. The input array is never mutated.
 */
export function createOrReinforceMemory(
	memories: MemoryTrace[],
	input: MemoryWriteInput
): MemoryWriteResult {
	const existing = memories.find(memory => memory.id === input.id);
	if (!existing) {
		const memory: MemoryTrace = {
			id: input.id,
			characterId: input.characterId,
			summary: input.summary.trim(),
			createdAtDay: input.moment.day,
			createdAtMinute: input.moment.minuteOfDay,
			importance: clamp01(input.importance),
			baseStrength: clamp01(input.baseStrength),
			tags: [...new Set(input.tags.map(tag => tag.trim()).filter(Boolean))],
			relatedEntityIds: [...new Set(input.relatedEntityIds.filter(Boolean))],
			source: input.source,
			reinforcementCount: 0
		};
		return {memories: [...memories, memory], memory, created: true};
	}

	if (existing.characterId !== input.characterId) {
		throw new Error('Stable memory id cannot be reused for another character.');
	}

	const memory: MemoryTrace = {
		...existing,
		importance: Math.max(clamp01(existing.importance), clamp01(input.importance)),
		baseStrength: Math.max(clamp01(existing.baseStrength), clamp01(input.baseStrength)),
		tags: [...new Set([...existing.tags, ...input.tags.map(tag => tag.trim()).filter(Boolean)])],
		relatedEntityIds: [
			...new Set([...existing.relatedEntityIds, ...input.relatedEntityIds.filter(Boolean)])
		],
		reinforcementCount: (existing.reinforcementCount ?? 0) + 1,
		lastReinforcedAtDay: input.moment.day,
		lastReinforcedAtMinute: input.moment.minuteOfDay
	};

	return {
		memories: memories.map(candidate => (candidate.id === memory.id ? memory : candidate)),
		memory,
		created: false
	};
}

/**
 * A32 derived salience. Decay changes current recall strength only; it never
 * deletes a MemoryTrace or rewrites the Fact/Claim that the memory may reference.
 */
export function memorySalienceAt(
	memory: MemoryTrace,
	moment: MemoryMoment,
	policy: MemorySaliencePolicy = defaultMemorySaliencePolicy
): MemorySalienceTrace {
	const anchor: MemoryMoment =
		memory.lastReinforcedAtDay !== undefined &&
		memory.lastReinforcedAtMinute !== undefined
			? {
					day: memory.lastReinforcedAtDay,
					minuteOfDay: memory.lastReinforcedAtMinute
				}
			: {day: memory.createdAtDay, minuteOfDay: memory.createdAtMinute};
	const ageMinutes = Math.max(
		0,
		momentToAbsoluteMinute(moment) - momentToAbsoluteMinute(anchor)
	);
	const ageDays = ageMinutes / (24 * 60);
	const halfLifeDays = Math.max(0.01, policy.halfLifeDays);
	const decayedStrength =
		clamp01(memory.baseStrength) * Math.pow(0.5, ageDays / halfLifeDays);
	const importance = clamp01(memory.importance);
	const reinforcementCount = Math.max(0, memory.reinforcementCount ?? 0);
	const reinforcementBoost = Math.min(
		Math.max(0, policy.maximumReinforcementBoost),
		reinforcementCount * Math.max(0, policy.reinforcementPerHit)
	);
	const weighted =
		decayedStrength * Math.max(0, policy.strengthWeight) +
		importance * Math.max(0, policy.importanceWeight) +
		reinforcementBoost;
	const normalizer = Math.max(
		1,
		Math.max(0, policy.strengthWeight) + Math.max(0, policy.importanceWeight)
	);
	const salience = clamp01(weighted / normalizer);

	return {
		memoryId: memory.id,
		ageDays,
		decayedStrength,
		importance,
		reinforcementCount,
		reinforcementBoost,
		salience
	};
}

export function salientMemoriesForCharacter(
	memories: MemoryTrace[],
	characterId: EntityId,
	moment: MemoryMoment,
	minimumSalience = 0.25,
	policy: MemorySaliencePolicy = defaultMemorySaliencePolicy
) {
	return memories
		.filter(memory => memory.characterId === characterId)
		.map(memory => ({memory, trace: memorySalienceAt(memory, moment, policy)}))
		.filter(result => result.trace.salience >= minimumSalience)
		.sort(
			(a, b) =>
				b.trace.salience - a.trace.salience ||
				a.memory.id.localeCompare(b.memory.id)
		);
}
