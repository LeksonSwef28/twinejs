import {CognitionTier} from '../../domain/narrative/entities';
import {ItemDefinition} from '../../domain/narrative/items';
import {ClaimTruthStance} from '../../domain/narrative/knowledge';
import {NarrativeProject} from '../../domain/narrative/project';

export type CanonicalEntityAuthoringCommand =
	| {type: 'location/update'; id: string; name: string}
	| {
			type: 'character/update';
			id: string;
			name: string;
			cognitionTier: CognitionTier;
	  }
	| {
			type: 'fact/update';
			id: string;
			title: string;
			description?: string;
			tags: string[];
	  }
	| {
			type: 'claim/update';
			id: string;
			text: string;
			aboutFactId?: string;
			stance: ClaimTruthStance;
			tags: string[];
	  }
	| {
			type: 'item/updateDefinition';
			id: string;
			name: string;
			description?: string;
			tags: string[];
	  };

export function isCanonicalEntityAuthoringCommand(
	command: {type: string}
): command is CanonicalEntityAuthoringCommand {
	return (
		command.type === 'location/update' ||
		command.type === 'character/update' ||
		command.type === 'fact/update' ||
		command.type === 'claim/update' ||
		command.type === 'item/updateDefinition'
	);
}

function normalizeTags(tags: string[]) {
	const seen = new Set<string>();
	const normalized: string[] = [];
	for (const tag of tags) {
		const value = tag.trim();
		if (value && !seen.has(value)) {
			seen.add(value);
			normalized.push(value);
		}
	}
	return normalized;
}

function touched(project: NarrativeProject): NarrativeProject {
	return {...project, updatedAt: new Date().toISOString()};
}

export function applyCanonicalEntityAuthoringCommand(
	project: NarrativeProject,
	command: CanonicalEntityAuthoringCommand
): NarrativeProject {
	switch (command.type) {
		case 'location/update': {
			const name = command.name.trim();
			if (!name || !project.locations.some(location => location.id === command.id)) {
				return project;
			}
			return touched({
				...project,
				locations: project.locations.map(location =>
					location.id === command.id ? {...location, name} : location
				)
			});
		}
		case 'character/update': {
			const name = command.name.trim();
			if (!name || !project.characters.some(character => character.id === command.id)) {
				return project;
			}
			return touched({
				...project,
				characters: project.characters.map(character =>
					character.id === command.id
						? {...character, name, cognitionTier: command.cognitionTier}
						: character
				)
			});
		}
		case 'fact/update': {
			const title = command.title.trim();
			if (!title || !project.objectiveFacts.some(fact => fact.id === command.id)) {
				return project;
			}
			return touched({
				...project,
				objectiveFacts: project.objectiveFacts.map(fact =>
					fact.id === command.id
						? {
								...fact,
								title,
								description: command.description?.trim() || undefined,
								tags: normalizeTags(command.tags)
						  }
						: fact
				)
			});
		}
		case 'claim/update': {
			const text = command.text.trim();
			if (
				!text ||
				!project.claims.some(claim => claim.id === command.id) ||
				(command.aboutFactId !== undefined &&
					!project.objectiveFacts.some(fact => fact.id === command.aboutFactId))
			) {
				return project;
			}
			return touched({
				...project,
				claims: project.claims.map(claim =>
					claim.id === command.id
						? {
								...claim,
								text,
								aboutFactId: command.aboutFactId,
								stance: command.stance,
								tags: normalizeTags(command.tags)
						  }
						: claim
				)
			});
		}
		case 'item/updateDefinition': {
			const name = command.name.trim();
			if (
				!name ||
				!project.itemDefinitions.some(definition => definition.id === command.id)
			) {
				return project;
			}
			return touched({
				...project,
				itemDefinitions: project.itemDefinitions.map(definition =>
					definition.id === command.id
						? ({
								...definition,
								name,
								description: command.description?.trim() || undefined,
								tags: normalizeTags(command.tags)
						  } as ItemDefinition)
						: definition
				)
			});
		}
	}
}
