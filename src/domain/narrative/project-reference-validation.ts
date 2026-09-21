import {
	NarrativeCharacterReferenceDefinition,
	NarrativeConditionDefinition,
	NarrativeEffectDefinition,
	NarrativeMoveDefinition
} from './interaction';
import {NarrativeProject} from './project';

export type NarrativeReferenceOwnerKind =
	| 'character'
	| 'scene'
	| 'travel-route'
	| 'player-start'
	| 'sleep-option'
	| 'behavior-profile'
	| 'routine-rule'
	| 'schedule-exception'
	| 'claim'
	| 'initial-knowledge'
	| 'item-instance'
	| 'story-node'
	| 'story-connection'
	| 'narrative-move'
	| 'reaction-candidate-set';

export type NarrativeReferenceTargetKind =
	| 'character'
	| 'location'
	| 'behavior-profile'
	| 'period'
	| 'objective-fact'
	| 'claim'
	| 'item-definition'
	| 'item-instance'
	| 'story-node'
	| 'narrative-move'
	| 'outcome';

export interface NarrativeReferenceFinding {
	id: string;
	kind: 'broken-authored-reference';
	severity: 'warning';
	summary: string;
	ownerKind: NarrativeReferenceOwnerKind;
	ownerId: string;
	targetKind: NarrativeReferenceTargetKind;
	targetId: string;
	storyNodeId?: string;
	moveId?: string;
	characterId?: string;
}

export interface NarrativeReferenceValidation {
	findings: NarrativeReferenceFinding[];
}

interface ReferenceSets {
	characters: Set<string>;
	locations: Set<string>;
	behaviorProfiles: Set<string>;
	periods: Set<string>;
	facts: Set<string>;
	claims: Set<string>;
	itemDefinitions: Set<string>;
	itemInstances: Set<string>;
	storyNodes: Set<string>;
	narrativeMoves: Set<string>;
}

interface FindingContext {
	ownerKind: NarrativeReferenceOwnerKind;
	ownerId: string;
	storyNodeId?: string;
	moveId?: string;
	characterId?: string;
}

function addMissingReference(
	findings: NarrativeReferenceFinding[],
	set: Set<string>,
	targetKind: NarrativeReferenceTargetKind,
	targetId: string | undefined,
	context: FindingContext,
	label: string
) {
	if (!targetId || set.has(targetId)) {
		return;
	}
	findings.push({
		id: `reference:${context.ownerKind}:${context.ownerId}:${targetKind}:${targetId}:${label}`,
		kind: 'broken-authored-reference',
		severity: 'warning',
		summary: `${label} ссылается на отсутствующую сущность ${targetKind} «${targetId}».`,
		ownerKind: context.ownerKind,
		ownerId: context.ownerId,
		targetKind,
		targetId,
		storyNodeId: context.storyNodeId,
		moveId: context.moveId,
		characterId: context.characterId
	});
}

function validateCharacterReference(
	findings: NarrativeReferenceFinding[],
	sets: ReferenceSets,
	reference: NarrativeCharacterReferenceDefinition,
	context: FindingContext,
	label: string
) {
	if (reference.type === 'character') {
		addMissingReference(
			findings,
			sets.characters,
			'character',
			reference.characterId,
			context,
			label
		);
	}
}

function validateCondition(
	findings: NarrativeReferenceFinding[],
	sets: ReferenceSets,
	condition: NarrativeConditionDefinition,
	context: FindingContext,
	label: string
) {
	switch (condition.type) {
		case 'character-knows-claim':
			addMissingReference(
				findings,
				sets.characters,
				'character',
				condition.characterId,
				context,
				`${label}: персонаж`
			);
			addMissingReference(
				findings,
				sets.claims,
				'claim',
				condition.claimId,
				context,
				`${label}: Claim`
			);
			break;
		case 'character-has-item':
			addMissingReference(
				findings,
				sets.characters,
				'character',
				condition.characterId,
				context,
				`${label}: персонаж`
			);
			addMissingReference(
				findings,
				sets.itemInstances,
				'item-instance',
				condition.itemInstanceId,
				context,
				`${label}: предмет`
			);
			break;
		case 'relationship-at-least':
			addMissingReference(
				findings,
				sets.characters,
				'character',
				condition.fromCharacterId,
				context,
				`${label}: отношение от`
			);
			addMissingReference(
				findings,
				sets.characters,
				'character',
				condition.toCharacterId,
				context,
				`${label}: отношение к`
			);
			break;
		case 'story-node-state':
			addMissingReference(
				findings,
				sets.storyNodes,
				'story-node',
				condition.storyNodeId,
				context,
				`${label}: Story node`
			);
			break;
		case 'characters-share-location':
			for (const characterId of condition.characterIds) {
				addMissingReference(
					findings,
					sets.characters,
					'character',
					characterId,
					context,
					`${label}: участник`
				);
			}
			break;
	}
}

function validateEffect(
	findings: NarrativeReferenceFinding[],
	sets: ReferenceSets,
	effect: NarrativeEffectDefinition,
	context: FindingContext
) {
	const label = `Effect ${effect.type}`;
	switch (effect.type) {
		case 'character-learns-claim':
			if (effect.recipient.type === 'character') {
				addMissingReference(
					findings,
					sets.characters,
					'character',
					effect.recipient.characterId,
					context,
					`${label}: получатель`
				);
			}
			if (effect.claim.type === 'claim') {
				addMissingReference(
					findings,
					sets.claims,
					'claim',
					effect.claim.claimId,
					context,
					`${label}: Claim`
				);
			}
			break;
		case 'relationship-adjust':
			validateCharacterReference(findings, sets, effect.from, context, `${label}: от`);
			validateCharacterReference(findings, sets, effect.to, context, `${label}: к`);
			break;
		case 'character-mood-set':
			validateCharacterReference(
				findings,
				sets,
				effect.character,
				context,
				`${label}: персонаж`
			);
			break;
		case 'item-set-placement':
			addMissingReference(
				findings,
				sets.itemInstances,
				'item-instance',
				effect.itemInstanceId,
				context,
				`${label}: предмет`
			);
			if (effect.placement.type === 'location') {
				addMissingReference(
					findings,
					sets.locations,
					'location',
					effect.placement.locationId,
					context,
					`${label}: локация`
				);
			} else if (effect.placement.type === 'character') {
				validateCharacterReference(
					findings,
					sets,
					effect.placement.character,
					context,
					`${label}: владелец`
				);
			}
			break;
		case 'story-node-set-state':
			addMissingReference(
				findings,
				sets.storyNodes,
				'story-node',
				effect.storyNodeId,
				context,
				`${label}: Story node`
			);
			break;
		case 'character-remembers':
			validateCharacterReference(
				findings,
				sets,
				effect.character,
				context,
				`${label}: персонаж`
			);
			break;
	}
}

function validateMove(
	findings: NarrativeReferenceFinding[],
	sets: ReferenceSets,
	move: NarrativeMoveDefinition
) {
	const context: FindingContext = {
		ownerKind: 'narrative-move',
		ownerId: move.id,
		storyNodeId: move.storyNodeId,
		moveId: move.id,
		characterId: move.actorCharacterId
	};
	addMissingReference(
		findings,
		sets.storyNodes,
		'story-node',
		move.storyNodeId,
		context,
		`Move «${move.label}»: owning Story node`
	);
	addMissingReference(
		findings,
		sets.characters,
		'character',
		move.actorCharacterId,
		context,
		`Move «${move.label}»: actor`
	);
	for (const targetId of move.targetCharacterIds) {
		addMissingReference(
			findings,
			sets.characters,
			'character',
			targetId,
			context,
			`Move «${move.label}»: target`
		);
	}
	addMissingReference(
		findings,
		sets.claims,
		'claim',
		move.communicatedClaimId,
		context,
		`Move «${move.label}»: communicated Claim`
	);

	for (const guard of move.guards) {
		validateCondition(
			findings,
			sets,
			guard.condition,
			context,
			`Guard «${guard.label ?? guard.id}»`
		);
	}
	if (move.resolution.type === 'condition') {
		validateCondition(
			findings,
			sets,
			move.resolution.condition,
			context,
			`Resolver Move «${move.label}»`
		);
	}

	const outcomeIds = new Set(move.outcomes.map(outcome => outcome.id));
	const resolutionOutcomeIds =
		move.resolution.type === 'automatic'
			? [move.resolution.outcomeId]
			: move.resolution.type === 'condition'
				? [move.resolution.trueOutcomeId, move.resolution.falseOutcomeId]
				: [
						move.resolution.check.successOutcomeId,
						move.resolution.check.failureOutcomeId
					];
	for (const outcomeId of resolutionOutcomeIds) {
		addMissingReference(
			findings,
			outcomeIds,
			'outcome',
			outcomeId,
			context,
			`Move «${move.label}»: resolver outcome`
		);
	}

	for (const outcome of move.outcomes) {
		for (const storyNodeId of outcome.effectStoryNodeIds) {
			addMissingReference(
				findings,
				sets.storyNodes,
				'story-node',
				storyNodeId,
				context,
				`Outcome «${outcome.label}»: continuation`
			);
		}
		for (const effect of outcome.effects ?? []) {
			validateEffect(findings, sets, effect, context);
		}
	}
}


function validateReactionCandidateSet(
	findings: NarrativeReferenceFinding[],
	sets: ReferenceSets,
	set: NarrativeProject['reactionCandidateSets'][number]
) {
	const context: FindingContext = {
		ownerKind: 'reaction-candidate-set',
		ownerId: set.id,
		storyNodeId: set.storyNodeId,
		characterId: set.reactingCharacterId
	};
	addMissingReference(
		findings,
		sets.storyNodes,
		'story-node',
		set.storyNodeId,
		context,
		`Reaction set «${set.id}»: Story node`
	);
	addMissingReference(
		findings,
		sets.characters,
		'character',
		set.reactingCharacterId,
		context,
		`Reaction set «${set.id}»: reacting character`
	);
	addMissingReference(
		findings,
		sets.characters,
		'character',
		set.counterpartCharacterId,
		context,
		`Reaction set «${set.id}»: counterpart character`
	);

	for (const candidate of set.candidates) {
		addMissingReference(
			findings,
			sets.narrativeMoves,
			'narrative-move',
			candidate.moveId,
			context,
			`Reaction candidate «${candidate.id}»: Move`
		);
		for (const guard of candidate.guards) {
			validateCondition(
				findings,
				sets,
				guard.condition,
				context,
				`Reaction candidate «${candidate.id}» guard «${guard.label ?? guard.id}»`
			);
		}
		for (const consideration of candidate.considerations) {
			if (consideration.type === 'knows-claim') {
				addMissingReference(
					findings,
					sets.claims,
					'claim',
					consideration.claimId,
					context,
					`Reaction candidate «${candidate.id}»: Claim consideration`
				);
			} else if (consideration.type === 'story-node-state') {
				addMissingReference(
					findings,
					sets.storyNodes,
					'story-node',
					consideration.storyNodeId,
					context,
					`Reaction candidate «${candidate.id}»: Story consideration`
				);
			}
		}
	}
}

/**
 * A48 read-only validation for authored references. It does not repair or
 * delete anything; it reports references that no longer resolve so Story Brain
 * and future destructive-editing flows can explain why an authoring operation
 * would be unsafe.
 */
export function validateNarrativeProjectReferences(
	project: NarrativeProject
): NarrativeReferenceValidation {
	const findings: NarrativeReferenceFinding[] = [];
	const sets: ReferenceSets = {
		characters: new Set(project.characters.map(entity => entity.id)),
		locations: new Set(project.locations.map(entity => entity.id)),
		behaviorProfiles: new Set(project.behaviorProfiles.map(entity => entity.id)),
		periods: new Set(project.template.periods.map(entity => entity.id)),
		facts: new Set(project.objectiveFacts.map(entity => entity.id)),
		claims: new Set(project.claims.map(entity => entity.id)),
		itemDefinitions: new Set(project.itemDefinitions.map(entity => entity.id)),
		itemInstances: new Set(project.itemInstances.map(entity => entity.id)),
		storyNodes: new Set(project.storyNodes.map(entity => entity.id)),
		narrativeMoves: new Set(project.narrativeMoves.map(entity => entity.id))
	};

	for (const character of project.characters) {
		addMissingReference(
			findings,
			sets.behaviorProfiles,
			'behavior-profile',
			character.defaultBehaviorProfileId,
			{
				ownerKind: 'character',
				ownerId: character.id,
				characterId: character.id
			},
			`Character «${character.name}»: default behavior profile`
		);
	}

	for (const scene of project.scenes) {
		addMissingReference(findings, sets.locations, 'location', scene.locationId, {
			ownerKind: 'scene',
			ownerId: scene.id
		}, `Scene «${scene.name}»`);
	}
	if (project.playerStart) {
		const context: FindingContext = {
			ownerKind: 'player-start',
			ownerId: 'player-start',
			characterId: project.playerStart.characterId
		};
		addMissingReference(
			findings,
			sets.characters,
			'character',
			project.playerStart.characterId,
			context,
			'Player start: character'
		);
		addMissingReference(
			findings,
			sets.locations,
			'location',
			project.playerStart.locationId,
			context,
			'Player start: location'
		);
		for (const [characterId, locationId] of Object.entries(
			project.playerStart.initialActualPresenceByCharacter ?? {}
		)) {
			const presenceContext: FindingContext = {
				ownerKind: 'player-start',
				ownerId: `player-start:${characterId}`,
				characterId
			};
			addMissingReference(
				findings,
				sets.characters,
				'character',
				characterId,
				presenceContext,
				'Player start: initial Actual Presence character'
			);
			addMissingReference(
				findings,
				sets.locations,
				'location',
				locationId,
				presenceContext,
				'Player start: initial Actual Presence location'
			);
		}
	}
	for (const option of project.sleepOptions ?? []) {
		addMissingReference(
			findings,
			sets.locations,
			'location',
			option.locationId,
			{ownerKind: 'sleep-option', ownerId: option.id},
			`Sleep option «${option.label}»: location`
		);
	}
	for (const route of project.travelRoutes ?? []) {
		const context: FindingContext = {
			ownerKind: 'travel-route',
			ownerId: route.id
		};
		addMissingReference(
			findings,
			sets.locations,
			'location',
			route.originLocationId,
			context,
			`Travel route «${route.label}»: origin`
		);
		addMissingReference(
			findings,
			sets.locations,
			'location',
			route.destinationLocationId,
			context,
			`Travel route «${route.label}»: destination`
		);
	}
	for (const profile of project.behaviorProfiles) {
		addMissingReference(findings, sets.characters, 'character', profile.characterId, {
			ownerKind: 'behavior-profile',
			ownerId: profile.id,
			characterId: profile.characterId
		}, `Behavior Profile «${profile.name}»`);
	}
	for (const rule of project.routineRules) {
		const context: FindingContext = {
			ownerKind: 'routine-rule',
			ownerId: rule.id,
			characterId: rule.characterId
		};
		addMissingReference(findings, sets.characters, 'character', rule.characterId, context, `Routine «${rule.id}»: персонаж`);
		addMissingReference(findings, sets.behaviorProfiles, 'behavior-profile', rule.behaviorProfileId, context, `Routine «${rule.id}»: behavior profile`);
		addMissingReference(findings, sets.locations, 'location', rule.targetLocationId, context, `Routine «${rule.id}»: локация`);
		const periodId = rule.timeWindow?.type === 'period' ? rule.timeWindow.periodId : rule.periodId;
		addMissingReference(findings, sets.periods, 'period', periodId, context, `Routine «${rule.id}»: период`);
	}
	for (const exception of project.scheduleExceptions) {
		const context: FindingContext = {
			ownerKind: 'schedule-exception',
			ownerId: exception.id,
			characterId: exception.characterId
		};
		addMissingReference(findings, sets.characters, 'character', exception.characterId, context, `Schedule exception «${exception.id}»: персонаж`);
		addMissingReference(findings, sets.locations, 'location', exception.targetLocationId, context, `Schedule exception «${exception.id}»: локация`);
		const periodId = exception.timeWindow?.type === 'period' ? exception.timeWindow.periodId : exception.periodId;
		addMissingReference(findings, sets.periods, 'period', periodId, context, `Schedule exception «${exception.id}»: период`);
	}
	for (const claim of project.claims) {
		addMissingReference(findings, sets.facts, 'objective-fact', claim.aboutFactId, {
			ownerKind: 'claim',
			ownerId: claim.id
		}, `Claim «${claim.text}»`);
	}
	for (const seed of project.initialKnowledge) {
		const context: FindingContext = {
			ownerKind: 'initial-knowledge',
			ownerId: seed.id,
			characterId: seed.characterId
		};
		addMissingReference(findings, sets.characters, 'character', seed.characterId, context, `Initial Knowledge «${seed.id}»: персонаж`);
		addMissingReference(findings, sets.claims, 'claim', seed.claimId, context, `Initial Knowledge «${seed.id}»: Claim`);
		if (seed.source.type === 'told') {
			addMissingReference(findings, sets.characters, 'character', seed.source.sourceCharacterId, context, `Initial Knowledge «${seed.id}»: источник`);
		}
	}
	for (const item of project.itemInstances) {
		const context: FindingContext = {
			ownerKind: 'item-instance',
			ownerId: item.id
		};
		addMissingReference(findings, sets.itemDefinitions, 'item-definition', item.definitionId, context, `Item «${item.id}»: definition`);
		if (item.placement.type === 'location') {
			addMissingReference(findings, sets.locations, 'location', item.placement.locationId, context, `Item «${item.id}»: placement`);
		} else if (item.placement.type === 'character') {
			addMissingReference(findings, sets.characters, 'character', item.placement.characterId, context, `Item «${item.id}»: owner`);
		}
	}
	for (const node of project.storyNodes) {
		const context: FindingContext = {
			ownerKind: 'story-node',
			ownerId: node.id,
			storyNodeId: node.id,
			characterId: node.primaryCharacterId
		};
		addMissingReference(findings, sets.characters, 'character', node.primaryCharacterId, context, `Story «${node.title}»: primary character`);
		for (const participantId of node.participantIds) {
			addMissingReference(findings, sets.characters, 'character', participantId, context, `Story «${node.title}»: participant`);
		}
		addMissingReference(findings, sets.locations, 'location', node.placement?.locationId, context, `Story «${node.title}»: placement`);
	}
	for (const connection of project.storyConnections) {
		const context: FindingContext = {
			ownerKind: 'story-connection',
			ownerId: connection.id,
			storyNodeId: connection.sourceNodeId
		};
		addMissingReference(findings, sets.storyNodes, 'story-node', connection.sourceNodeId, context, `Connection «${connection.id}»: source`);
		addMissingReference(findings, sets.storyNodes, 'story-node', connection.targetNodeId, context, `Connection «${connection.id}»: target`);
	}
	for (const move of project.narrativeMoves) {
		validateMove(findings, sets, move);
	}
	for (const set of project.reactionCandidateSets) {
		validateReactionCandidateSet(findings, sets, set);
	}

	return {findings};
}
