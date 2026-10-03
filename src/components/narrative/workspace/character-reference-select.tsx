import * as React from 'react';
import {
	NarrativeCharacterReferenceDefinition,
	NarrativeMoveDefinition
} from '../../../domain/narrative/interaction';

export interface CharacterReferenceOptionCharacter {
	id: string;
	name: string;
}

interface CharacterReferenceSelectProps {
	ariaLabel: string;
	value: string;
	onChange: (value: string) => void;
	characters: CharacterReferenceOptionCharacter[];
	move?: NarrativeMoveDefinition;
}

export function characterReferenceValueToDefinition(
	value: string,
	move: Pick<NarrativeMoveDefinition, 'actorCharacterId' | 'targetCharacterIds'>
): NarrativeCharacterReferenceDefinition | undefined {
	if (value === 'move-actor') {
		return move.actorCharacterId ? {type: 'move-actor'} : undefined;
	}
	if (value.startsWith('move-target:')) {
		const targetIndex = Number(value.slice('move-target:'.length));
		return Number.isInteger(targetIndex) && targetIndex >= 0 && move.targetCharacterIds[targetIndex]
			? {type: 'move-target', targetIndex}
			: undefined;
	}
	if (value.startsWith('character:')) {
		const characterId = value.slice('character:'.length);
		return characterId ? {type: 'character', characterId} : undefined;
	}
	return undefined;
}

export const CharacterReferenceSelect: React.FC<CharacterReferenceSelectProps> = ({
	ariaLabel,
	value,
	onChange,
	characters,
	move
}) => (
	<select aria-label={ariaLabel} value={value} onChange={event => onChange(event.target.value)}>
		<option value="">Выбери персонажа / роль Move</option>
		<optgroup label="Контекст текущего Move">
			<option value="move-actor" disabled={!move?.actorCharacterId}>
				Актор Move
				{move?.actorCharacterId
					? ` · ${characters.find(character => character.id === move.actorCharacterId)?.name ?? move.actorCharacterId}`
					: ' · не назначен'}
			</option>
			{move?.targetCharacterIds.length ? (
				move.targetCharacterIds.map((characterId, targetIndex) => (
					<option key={`${characterId}:${targetIndex}`} value={`move-target:${targetIndex}`}>
						Цель Move {targetIndex + 1} ·{' '}
						{characters.find(character => character.id === characterId)?.name ?? characterId}
					</option>
				))
			) : (
				<option value="move-target:0" disabled>
					Цели Move не назначены
				</option>
			)}
		</optgroup>
		<optgroup label="Фиксированный персонаж">
			{characters.map(character => (
				<option key={character.id} value={`character:${character.id}`}>
					{character.name}
				</option>
			))}
		</optgroup>
	</select>
);
