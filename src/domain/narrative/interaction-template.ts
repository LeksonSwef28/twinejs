import {EntityId} from './entities';
import {
	CommunicationIntent,
	createDefaultNarrativeOutcome,
	NarrativeEffectDefinition,
	NarrativeGuardDefinition,
	NarrativeKnowledgeEffectSourceDefinition,
	NarrativeMemorySourceDefinition,
	NarrativeMoveDefinition,
	NarrativeMoveKind
} from './interaction';
import {KnowledgeAttitude, knowledgeConfidenceIsValid} from './knowledge';
import {StoryNodeActivationState} from './story';

export type InteractionTemplateRoleKind = 'character';

export interface InteractionTemplateRoleDefinition {
	id: EntityId;
	label: string;
	/** Explicit slot type. Omitted values from older projects mean character. */
	kind?: InteractionTemplateRoleKind;
}

export interface InteractionTemplateClaimSlotDefinition {
	id: EntityId;
	label: string;
	required: boolean;
}

export type InteractionTemplateConditionDefinition =
	| {
			type: 'role-knows-claim';
			characterRoleId: EntityId;
			claimSlotId: EntityId;
	  }
	| {
			type: 'relationship-at-least';
			fromRoleId: EntityId;
			toRoleId: EntityId;
			axis: string;
			value: number;
	  }
	| {
			type: 'roles-share-location';
			roleIds: EntityId[];
	  }
	| {
			type: 'story-node-state';
			state: StoryNodeActivationState;
	  };

export interface InteractionTemplateGuardDefinition {
	id: EntityId;
	label?: string;
	condition: InteractionTemplateConditionDefinition;
	negated?: boolean;
}

export type InteractionTemplateEffectDefinition =
	| {
			id: EntityId;
			type: 'role-learns-claim';
			recipientRoleId: EntityId;
			claimSlotId: EntityId;
			attitude: KnowledgeAttitude;
			confidence: number;
			source: NarrativeKnowledgeEffectSourceDefinition;
	  }
	| {
			id: EntityId;
			type: 'relationship-adjust';
			fromRoleId: EntityId;
			toRoleId: EntityId;
			axis: string;
			delta: number;
	  }
	| {
			id: EntityId;
			type: 'role-mood-set';
			roleId: EntityId;
			mood: string;
	  }
	| {
			id: EntityId;
			type: 'role-remembers';
			roleId: EntityId;
			summary: string;
			importance: number;
			baseStrength: number;
			tags: string[];
			source: NarrativeMemorySourceDefinition;
	  }
	| {
			id: EntityId;
			type: 'story-node-set-state';
			state: StoryNodeActivationState;
	  };

/**
 * A template move binds reusable interaction structure only. Once instantiated,
 * all guards and effects become ordinary canonical NarrativeMove contracts.
 */
export interface InteractionTemplateMoveDefinition {
	id: EntityId;
	kind: NarrativeMoveKind;
	label: string;
	actorRoleId?: EntityId;
	targetRoleIds: EntityId[];
	communicatedClaimSlotId?: EntityId;
	communicationIntent?: CommunicationIntent;
	guards?: InteractionTemplateGuardDefinition[];
	/** Effects are placed on the default continue outcome after instantiation. */
	effects?: InteractionTemplateEffectDefinition[];
}

export interface InteractionTemplateDefinition {
	id: EntityId;
	name: string;
	description?: string;
	roles: InteractionTemplateRoleDefinition[];
	claimSlots: InteractionTemplateClaimSlotDefinition[];
	moves: InteractionTemplateMoveDefinition[];
	tags: string[];
}

export interface InteractionTemplateBinding {
	storyNodeId: EntityId;
	characterByRole: Record<string, EntityId | undefined>;
	claimBySlot: Record<string, EntityId | undefined>;
}

export interface InteractionTemplateInstantiation {
	instanceId: EntityId;
	templateId: EntityId;
	moves: NarrativeMoveDefinition[];
}

export interface InteractionTemplateMissingBinding {
	kind: 'story-node' | 'character-role' | 'claim-slot';
	id: EntityId;
	label: string;
}

export interface InteractionTemplatePreview {
	status: 'ready' | 'incomplete' | 'invalid';
	missingBindings: InteractionTemplateMissingBinding[];
	moves: NarrativeMoveDefinition[];
	error?: string;
}

function conditionIsStructurallyValid(
	condition: InteractionTemplateConditionDefinition,
	roleIds: Set<string>,
	claimSlotIds: Set<string>
) {
	switch (condition.type) {
		case 'role-knows-claim':
			return (
				roleIds.has(condition.characterRoleId) &&
				claimSlotIds.has(condition.claimSlotId)
			);
		case 'relationship-at-least':
			return (
				roleIds.has(condition.fromRoleId) &&
				roleIds.has(condition.toRoleId) &&
				Boolean(condition.axis.trim()) &&
				Number.isFinite(condition.value)
			);
		case 'roles-share-location':
			return (
				Array.isArray(condition.roleIds) &&
				condition.roleIds.length >= 2 &&
				condition.roleIds.every(roleId => roleIds.has(roleId))
			);
		case 'story-node-state':
			return Boolean(condition.state);
	}
}

function effectIsStructurallyValid(
	effect: InteractionTemplateEffectDefinition,
	roleIds: Set<string>,
	claimSlotIds: Set<string>
) {
	switch (effect.type) {
		case 'role-learns-claim':
			return (
				roleIds.has(effect.recipientRoleId) &&
				claimSlotIds.has(effect.claimSlotId) &&
				knowledgeConfidenceIsValid(effect.confidence)
			);
		case 'relationship-adjust':
			return (
				roleIds.has(effect.fromRoleId) &&
				roleIds.has(effect.toRoleId) &&
				Boolean(effect.axis.trim()) &&
				Number.isFinite(effect.delta)
			);
		case 'role-mood-set':
			return roleIds.has(effect.roleId) && Boolean(effect.mood.trim());
		case 'role-remembers':
			return (
				roleIds.has(effect.roleId) &&
				Boolean(effect.summary.trim()) &&
				Number.isFinite(effect.importance) &&
				Number.isFinite(effect.baseStrength) &&
				Array.isArray(effect.tags)
			);
		case 'story-node-set-state':
			return Boolean(effect.state);
	}
}

export function interactionTemplateIsStructurallyValid(
	template: InteractionTemplateDefinition
) {
	if (
		!template.id ||
		!template.name?.trim() ||
		!Array.isArray(template.roles) ||
		!Array.isArray(template.claimSlots) ||
		!Array.isArray(template.moves) ||
		!Array.isArray(template.tags) ||
		template.moves.length === 0
	) {
		return false;
	}

	const roleIds = new Set<string>();
	for (const role of template.roles) {
		if (
			!role?.id ||
			!role.label?.trim() ||
			(role.kind !== undefined && role.kind !== 'character') ||
			roleIds.has(role.id)
		) {
			return false;
		}
		roleIds.add(role.id);
	}

	const claimSlotIds = new Set<string>();
	for (const slot of template.claimSlots) {
		if (!slot?.id || !slot.label?.trim() || claimSlotIds.has(slot.id)) {
			return false;
		}
		claimSlotIds.add(slot.id);
	}

	const moveIds = new Set<string>();
	for (const move of template.moves) {
		if (
			!move?.id ||
			!move.label?.trim() ||
			!Array.isArray(move.targetRoleIds) ||
			(move.guards !== undefined && !Array.isArray(move.guards)) ||
			(move.effects !== undefined && !Array.isArray(move.effects)) ||
			moveIds.has(move.id)
		) {
			return false;
		}
		moveIds.add(move.id);
		if (move.actorRoleId && !roleIds.has(move.actorRoleId)) {
			return false;
		}
		if (!move.targetRoleIds.every(roleId => roleIds.has(roleId))) {
			return false;
		}
		if (
			move.communicatedClaimSlotId &&
			!claimSlotIds.has(move.communicatedClaimSlotId)
		) {
			return false;
		}

		const guardIds = new Set<string>();
		for (const guard of move.guards ?? []) {
			if (
				!guard.id ||
				guardIds.has(guard.id) ||
				!conditionIsStructurallyValid(guard.condition, roleIds, claimSlotIds)
			) {
				return false;
			}
			guardIds.add(guard.id);
		}

		const effectIds = new Set<string>();
		for (const effect of move.effects ?? []) {
			if (
				!effect.id ||
				effectIds.has(effect.id) ||
				!effectIsStructurallyValid(effect, roleIds, claimSlotIds)
			) {
				return false;
			}
			effectIds.add(effect.id);
		}
	}

	return true;
}

function referencedRoleIds(template: InteractionTemplateDefinition) {
	const ids = new Set<string>();
	for (const move of template.moves) {
		if (move.actorRoleId) {
			ids.add(move.actorRoleId);
		}
		for (const targetRoleId of move.targetRoleIds) {
			ids.add(targetRoleId);
		}
		for (const guard of move.guards ?? []) {
			switch (guard.condition.type) {
				case 'role-knows-claim':
					ids.add(guard.condition.characterRoleId);
					break;
				case 'relationship-at-least':
					ids.add(guard.condition.fromRoleId);
					ids.add(guard.condition.toRoleId);
					break;
				case 'roles-share-location':
					guard.condition.roleIds.forEach(roleId => ids.add(roleId));
					break;
				case 'story-node-state':
					break;
			}
		}
		for (const effect of move.effects ?? []) {
			switch (effect.type) {
				case 'role-learns-claim':
					ids.add(effect.recipientRoleId);
					break;
				case 'relationship-adjust':
					ids.add(effect.fromRoleId);
					ids.add(effect.toRoleId);
					break;
				case 'role-mood-set':
				case 'role-remembers':
					ids.add(effect.roleId);
					break;
				case 'story-node-set-state':
					break;
			}
		}
	}
	return ids;
}

function referencedClaimSlotIds(template: InteractionTemplateDefinition) {
	const ids = new Set<string>(
		template.claimSlots.filter(slot => slot.required).map(slot => slot.id)
	);
	for (const move of template.moves) {
		if (move.communicatedClaimSlotId) {
			ids.add(move.communicatedClaimSlotId);
		}
		for (const guard of move.guards ?? []) {
			if (guard.condition.type === 'role-knows-claim') {
				ids.add(guard.condition.claimSlotId);
			}
		}
		for (const effect of move.effects ?? []) {
			if (effect.type === 'role-learns-claim') {
				ids.add(effect.claimSlotId);
			}
		}
	}
	return ids;
}

function boundCharacter(binding: InteractionTemplateBinding, roleId: EntityId) {
	const characterId = binding.characterByRole[roleId];
	if (!characterId) {
		throw new Error(`Missing Character binding for role ${roleId}.`);
	}
	return characterId;
}

function boundClaim(binding: InteractionTemplateBinding, slotId: EntityId) {
	const claimId = binding.claimBySlot[slotId];
	if (!claimId) {
		throw new Error(`Missing Claim binding for slot ${slotId}.`);
	}
	return claimId;
}

function materializeCondition(
	condition: InteractionTemplateConditionDefinition,
	binding: InteractionTemplateBinding
): NarrativeGuardDefinition['condition'] {
	switch (condition.type) {
		case 'role-knows-claim':
			return {
				type: 'character-knows-claim',
				characterId: boundCharacter(binding, condition.characterRoleId),
				claimId: boundClaim(binding, condition.claimSlotId)
			};
		case 'relationship-at-least':
			return {
				type: 'relationship-at-least',
				fromCharacterId: boundCharacter(binding, condition.fromRoleId),
				toCharacterId: boundCharacter(binding, condition.toRoleId),
				axis: condition.axis,
				value: condition.value
			};
		case 'roles-share-location':
			return {
				type: 'characters-share-location',
				characterIds: condition.roleIds.map(roleId =>
					boundCharacter(binding, roleId)
				)
			};
		case 'story-node-state':
			return {
				type: 'story-node-state',
				storyNodeId: binding.storyNodeId,
				state: condition.state
			};
	}
}

function materializeEffect(
	effect: InteractionTemplateEffectDefinition,
	binding: InteractionTemplateBinding,
	moveId: EntityId
): NarrativeEffectDefinition {
	const id = `${moveId}:effect:${effect.id}`;
	switch (effect.type) {
		case 'role-learns-claim':
			return {
				id,
				type: 'character-learns-claim',
				recipient: {
					type: 'character',
					characterId: boundCharacter(binding, effect.recipientRoleId)
				},
				claim: {type: 'claim', claimId: boundClaim(binding, effect.claimSlotId)},
				attitude: effect.attitude,
				confidence: effect.confidence,
				source: effect.source
			};
		case 'relationship-adjust':
			return {
				id,
				type: 'relationship-adjust',
				from: {
					type: 'character',
					characterId: boundCharacter(binding, effect.fromRoleId)
				},
				to: {
					type: 'character',
					characterId: boundCharacter(binding, effect.toRoleId)
				},
				axis: effect.axis,
				delta: effect.delta
			};
		case 'role-mood-set':
			return {
				id,
				type: 'character-mood-set',
				character: {
					type: 'character',
					characterId: boundCharacter(binding, effect.roleId)
				},
				mood: effect.mood
			};
		case 'role-remembers':
			return {
				id,
				type: 'character-remembers',
				character: {
					type: 'character',
					characterId: boundCharacter(binding, effect.roleId)
				},
				summary: effect.summary,
				importance: effect.importance,
				baseStrength: effect.baseStrength,
				tags: effect.tags,
				source: effect.source
			};
		case 'story-node-set-state':
			return {
				id,
				type: 'story-node-set-state',
				storyNodeId: binding.storyNodeId,
				state: effect.state
			};
	}
}

function materializeMoves(
	template: InteractionTemplateDefinition,
	binding: InteractionTemplateBinding,
	instanceId: EntityId
) {
	return template.moves.map(templateMove => {
		const id = `${instanceId}:${templateMove.id}`;
		const outcome = createDefaultNarrativeOutcome(id);
		outcome.effects = (templateMove.effects ?? []).map(effect =>
			materializeEffect(effect, binding, id)
		);
		const communicatedClaimId = templateMove.communicatedClaimSlotId
			? boundClaim(binding, templateMove.communicatedClaimSlotId)
			: undefined;

		return {
			id,
			storyNodeId: binding.storyNodeId,
			kind: templateMove.kind,
			label: templateMove.label,
			actorCharacterId: templateMove.actorRoleId
				? boundCharacter(binding, templateMove.actorRoleId)
				: undefined,
			targetCharacterIds: templateMove.targetRoleIds.map(roleId =>
				boundCharacter(binding, roleId)
			),
			communicatedClaimId,
			communicationIntent: templateMove.communicationIntent,
			guards: (templateMove.guards ?? []).map(guard => ({
				id: `${id}:guard:${guard.id}`,
				label: guard.label,
				condition: materializeCondition(guard.condition, binding),
				negated: guard.negated
			})),
			resolution: {type: 'automatic', outcomeId: outcome.id} as const,
			outcomes: [outcome]
		};
	});
}

function collectMissingBindings(
	template: InteractionTemplateDefinition,
	binding: InteractionTemplateBinding
) {
	const missing: InteractionTemplateMissingBinding[] = [];
	if (!binding.storyNodeId) {
		missing.push({kind: 'story-node', id: 'story-node', label: 'Story node'});
	}
	for (const roleId of referencedRoleIds(template)) {
		if (!binding.characterByRole[roleId]) {
			const role = template.roles.find(candidate => candidate.id === roleId);
			missing.push({
				kind: 'character-role',
				id: roleId,
				label: role?.label ?? roleId
			});
		}
	}
	for (const slotId of referencedClaimSlotIds(template)) {
		if (!binding.claimBySlot[slotId]) {
			const slot = template.claimSlots.find(candidate => candidate.id === slotId);
			missing.push({
				kind: 'claim-slot',
				id: slotId,
				label: slot?.label ?? slotId
			});
		}
	}
	return missing;
}

/**
 * Pure authoring preview. It materializes the exact canonical Moves that would
 * be committed, but does not touch the NarrativeProject or authoring history.
 */
export function previewInteractionTemplate(
	template: InteractionTemplateDefinition,
	binding: InteractionTemplateBinding,
	instanceId = 'template-preview'
): InteractionTemplatePreview {
	if (!interactionTemplateIsStructurallyValid(template)) {
		return {
			status: 'invalid',
			missingBindings: [],
			moves: [],
			error: 'Interaction template is structurally invalid.'
		};
	}
	const missingBindings = collectMissingBindings(template, binding);
	if (!instanceId || missingBindings.length > 0) {
		return {
			status: 'incomplete',
			missingBindings,
			moves: [],
			error: !instanceId ? 'Interaction template requires an instance id.' : undefined
		};
	}
	try {
		return {
			status: 'ready',
			missingBindings: [],
			moves: materializeMoves(template, binding, instanceId)
		};
	} catch (error) {
		return {
			status: 'invalid',
			missingBindings: [],
			moves: [],
			error: error instanceof Error ? error.message : 'Template preview failed.'
		};
	}
}

/**
 * Materializes ordinary NarrativeMove records. Runtime never executes the
 * template itself; once bound, the concrete moves go through the same
 * Move -> Guards -> Resolution -> Outcome pipeline as hand-authored moves.
 */
export function instantiateInteractionTemplate(
	template: InteractionTemplateDefinition,
	binding: InteractionTemplateBinding,
	instanceId: EntityId
): InteractionTemplateInstantiation {
	if (!interactionTemplateIsStructurallyValid(template)) {
		throw new Error('Interaction template is structurally invalid.');
	}
	if (!instanceId || !binding.storyNodeId) {
		throw new Error('Interaction template requires an instance and Story node.');
	}

	for (const roleId of referencedRoleIds(template)) {
		boundCharacter(binding, roleId);
	}
	for (const slotId of referencedClaimSlotIds(template)) {
		boundClaim(binding, slotId);
	}

	return {
		instanceId,
		templateId: template.id,
		moves: materializeMoves(template, binding, instanceId)
	};
}
