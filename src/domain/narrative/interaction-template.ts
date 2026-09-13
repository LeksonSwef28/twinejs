import {EntityId} from './entities';
import {
	CommunicationIntent,
	createDefaultNarrativeOutcome,
	NarrativeMoveDefinition,
	NarrativeMoveKind
} from './interaction';

export interface InteractionTemplateRoleDefinition {
	id: EntityId;
	label: string;
}

export interface InteractionTemplateClaimSlotDefinition {
	id: EntityId;
	label: string;
	required: boolean;
}

/**
 * A template move intentionally binds only the reusable interaction shell.
 * Guards, resolution and effects remain the canonical NarrativeMove contracts
 * after instantiation, so templates do not create a parallel rules language.
 */
export interface InteractionTemplateMoveDefinition {
	id: EntityId;
	kind: NarrativeMoveKind;
	label: string;
	actorRoleId?: EntityId;
	targetRoleIds: EntityId[];
	communicatedClaimSlotId?: EntityId;
	communicationIntent?: CommunicationIntent;
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
		if (!role?.id || !role.label?.trim() || roleIds.has(role.id)) {
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
	}

	return true;
}

function requiredRoleIds(template: InteractionTemplateDefinition) {
	const ids = new Set<string>();
	for (const move of template.moves) {
		if (move.actorRoleId) {
			ids.add(move.actorRoleId);
		}
		for (const targetRoleId of move.targetRoleIds) {
			ids.add(targetRoleId);
		}
	}
	return ids;
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

	for (const roleId of requiredRoleIds(template)) {
		if (!binding.characterByRole[roleId]) {
			throw new Error(`Missing Character binding for role ${roleId}.`);
		}
	}
	for (const slot of template.claimSlots) {
		if (slot.required && !binding.claimBySlot[slot.id]) {
			throw new Error(`Missing Claim binding for slot ${slot.id}.`);
		}
	}

	const moves = template.moves.map(templateMove => {
		const id = `${instanceId}:${templateMove.id}`;
		const outcome = createDefaultNarrativeOutcome(id);
		const communicatedClaimId = templateMove.communicatedClaimSlotId
			? binding.claimBySlot[templateMove.communicatedClaimSlotId]
			: undefined;

		return {
			id,
			storyNodeId: binding.storyNodeId,
			kind: templateMove.kind,
			label: templateMove.label,
			actorCharacterId: templateMove.actorRoleId
				? binding.characterByRole[templateMove.actorRoleId]
				: undefined,
			targetCharacterIds: templateMove.targetRoleIds.map(roleId => {
				const characterId = binding.characterByRole[roleId];
				if (!characterId) {
					throw new Error(`Missing Character binding for role ${roleId}.`);
				}
				return characterId;
			}),
			communicatedClaimId,
			communicationIntent: templateMove.communicationIntent,
			guards: [],
			resolution: {type: 'automatic', outcomeId: outcome.id} as const,
			outcomes: [outcome]
		};
	});

	return {instanceId, templateId: template.id, moves};
}
