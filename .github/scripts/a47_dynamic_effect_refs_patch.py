from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Expected fragment missing: {label}')
    return text.replace(old, new, 1)


path = Path('src/components/narrative/workspace/outcome-effects-panel.tsx')
text = path.read_text()

text = replace_once(
    text,
    "import {useNarrativeProject} from '../../../store/narrative-project';\n",
    "import {useNarrativeProject} from '../../../store/narrative-project';\nimport {\n\tCharacterReferenceSelect,\n\tcharacterReferenceValueToDefinition\n} from './character-reference-select';\n",
    'helper import'
)

text = replace_once(
    text,
    "\tconst [fromCharacterId, setFromCharacterId] = React.useState('');\n\tconst [toCharacterId, setToCharacterId] = React.useState('');\n",
    "\tconst [fromCharacterReference, setFromCharacterReference] = React.useState('');\n\tconst [toCharacterReference, setToCharacterReference] = React.useState('');\n",
    'relationship state'
)
text = replace_once(
    text,
    "\tconst [moodCharacterId, setMoodCharacterId] = React.useState('');\n",
    "\tconst [moodCharacterReference, setMoodCharacterReference] = React.useState('');\n",
    'mood state'
)
text = replace_once(
    text,
    "\tconst [itemDestinationId, setItemDestinationId] = React.useState('');\n",
    "\tconst [itemLocationId, setItemLocationId] = React.useState('');\n\tconst [itemCharacterReference, setItemCharacterReference] = React.useState('');\n",
    'item state'
)
text = replace_once(
    text,
    "\tconst [memoryCharacterId, setMemoryCharacterId] = React.useState('');\n",
    "\tconst [memoryCharacterReference, setMemoryCharacterReference] = React.useState('');\n",
    'memory state'
)

old_relationship = '''\t\t\tcase 'relationship-adjust':
\t\t\t\tif (
\t\t\t\t\t!fromCharacterId ||
\t\t\t\t\t!toCharacterId ||
\t\t\t\t\t!relationshipAxis.trim() ||
\t\t\t\t\t!Number.isFinite(relationshipDelta)
\t\t\t\t) {
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\teffect = {
\t\t\t\t\tid: createId('relationship-effect'),
\t\t\t\t\ttype: 'relationship-adjust',
\t\t\t\t\tfrom: {type: 'character', characterId: fromCharacterId},
\t\t\t\t\tto: {type: 'character', characterId: toCharacterId},
\t\t\t\t\taxis: relationshipAxis.trim(),
\t\t\t\t\tdelta: relationshipDelta
\t\t\t\t};
\t\t\t\tbreak;
'''
new_relationship = '''\t\t\tcase 'relationship-adjust': {\n\t\t\t\tconst from = characterReferenceValueToDefinition(fromCharacterReference, move);\n\t\t\t\tconst to = characterReferenceValueToDefinition(toCharacterReference, move);\n\t\t\t\tif (!from || !to || !relationshipAxis.trim() || !Number.isFinite(relationshipDelta)) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\teffect = {\n\t\t\t\t\tid: createId('relationship-effect'),\n\t\t\t\t\ttype: 'relationship-adjust',\n\t\t\t\t\tfrom,\n\t\t\t\t\tto,\n\t\t\t\t\taxis: relationshipAxis.trim(),\n\t\t\t\t\tdelta: relationshipDelta\n\t\t\t\t};\n\t\t\t\tbreak;\n\t\t\t}\n'''
text = replace_once(text, old_relationship, new_relationship, 'relationship effect')

old_mood = '''\t\t\tcase 'character-mood-set':
\t\t\t\tif (!moodCharacterId || !mood.trim()) {
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\teffect = {
\t\t\t\t\tid: createId('mood-effect'),
\t\t\t\t\ttype: 'character-mood-set',
\t\t\t\t\tcharacter: {type: 'character', characterId: moodCharacterId},
\t\t\t\t\tmood: mood.trim()
\t\t\t\t};
\t\t\t\tbreak;
'''
new_mood = '''\t\t\tcase 'character-mood-set': {\n\t\t\t\tconst character = characterReferenceValueToDefinition(moodCharacterReference, move);\n\t\t\t\tif (!character || !mood.trim()) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\teffect = {\n\t\t\t\t\tid: createId('mood-effect'),\n\t\t\t\t\ttype: 'character-mood-set',\n\t\t\t\t\tcharacter,\n\t\t\t\t\tmood: mood.trim()\n\t\t\t\t};\n\t\t\t\tbreak;\n\t\t\t}\n'''
text = replace_once(text, old_mood, new_mood, 'mood effect')

old_item = '''\t\t\tcase 'item-set-placement':
\t\t\t\tif (!itemInstanceId) {
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\tif (itemDestination === 'character' && !itemDestinationId) {
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\tif (itemDestination === 'location' && !itemDestinationId) {
\t\t\t\t\treturn;
\t\t\t\t}
\t\t\t\teffect = {
\t\t\t\t\tid: createId('item-effect'),
\t\t\t\t\ttype: 'item-set-placement',
\t\t\t\t\titemInstanceId,
\t\t\t\t\tplacement:
\t\t\t\t\t\titemDestination === 'unplaced'
\t\t\t\t\t\t\t? {type: 'unplaced'}
\t\t\t\t\t\t\t: itemDestination === 'location'
\t\t\t\t\t\t\t\t? {type: 'location', locationId: itemDestinationId}
\t\t\t\t\t\t\t\t: {
\t\t\t\t\t\t\t\t\t\ttype: 'character',
\t\t\t\t\t\t\t\t\t\tcharacter: {
\t\t\t\t\t\t\t\t\t\t\ttype: 'character',
\t\t\t\t\t\t\t\t\t\t\tcharacterId: itemDestinationId
\t\t\t\t\t\t\t\t\t\t}
\t\t\t\t\t\t\t\t\t  }
\t\t\t\t};
\t\t\t\tbreak;
'''
new_item = '''\t\t\tcase 'item-set-placement': {\n\t\t\t\tconst characterPlacement =\n\t\t\t\t\titemDestination === 'character'\n\t\t\t\t\t\t? characterReferenceValueToDefinition(itemCharacterReference, move)\n\t\t\t\t\t\t: undefined;\n\t\t\t\tif (!itemInstanceId) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\tif (itemDestination === 'character' && !characterPlacement) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\tif (itemDestination === 'location' && !itemLocationId) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\teffect = {\n\t\t\t\t\tid: createId('item-effect'),\n\t\t\t\t\ttype: 'item-set-placement',\n\t\t\t\t\titemInstanceId,\n\t\t\t\t\tplacement:\n\t\t\t\t\t\titemDestination === 'unplaced'\n\t\t\t\t\t\t\t? {type: 'unplaced'}\n\t\t\t\t\t\t\t: itemDestination === 'location'\n\t\t\t\t\t\t\t\t? {type: 'location', locationId: itemLocationId}\n\t\t\t\t\t\t\t\t: {type: 'character', character: characterPlacement!}\n\t\t\t\t};\n\t\t\t\tbreak;\n\t\t\t}\n'''
text = replace_once(text, old_item, new_item, 'item effect')

old_memory_start = '''\t\t\tcase 'character-remembers': {
\t\t\t\tif (
\t\t\t\t\t!memoryCharacterId ||
'''
new_memory_start = '''\t\t\tcase 'character-remembers': {\n\t\t\t\tconst character = characterReferenceValueToDefinition(memoryCharacterReference, move);\n\t\t\t\tif (\n\t\t\t\t\t!character ||\n'''
text = replace_once(text, old_memory_start, new_memory_start, 'memory validation')
text = replace_once(
    text,
    "\t\t\t\t\tcharacter: {type: 'character', characterId: memoryCharacterId},\n",
    "\t\t\t\t\tcharacter,\n",
    'memory effect character'
)

old_relationship_ui = '''\t\t\t\t{effectMode === 'relationship-adjust' && (
\t\t\t\t\t<>
\t\t\t\t\t\t<select aria-label="Отношение от персонажа" value={fromCharacterId} onChange={event => setFromCharacterId(event.target.value)}>
\t\t\t\t\t\t\t<option value="">Кто меняет отношение</option>
\t\t\t\t\t\t\t{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
\t\t\t\t\t\t</select>
\t\t\t\t\t\t<select aria-label="Отношение к персонажу" value={toCharacterId} onChange={event => setToCharacterId(event.target.value)}>
\t\t\t\t\t\t\t<option value="">К кому</option>
\t\t\t\t\t\t\t{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
\t\t\t\t\t\t</select>
'''
new_relationship_ui = '''\t\t\t\t{effectMode === 'relationship-adjust' && (\n\t\t\t\t\t<>\n\t\t\t\t\t\t<CharacterReferenceSelect\n\t\t\t\t\t\t\tariaLabel="Отношение от персонажа"\n\t\t\t\t\t\t\tvalue={fromCharacterReference}\n\t\t\t\t\t\t\tonChange={setFromCharacterReference}\n\t\t\t\t\t\t\tcharacters={project.characters}\n\t\t\t\t\t\t\tmove={move}\n\t\t\t\t\t\t/>\n\t\t\t\t\t\t<CharacterReferenceSelect\n\t\t\t\t\t\t\tariaLabel="Отношение к персонажу"\n\t\t\t\t\t\t\tvalue={toCharacterReference}\n\t\t\t\t\t\t\tonChange={setToCharacterReference}\n\t\t\t\t\t\t\tcharacters={project.characters}\n\t\t\t\t\t\t\tmove={move}\n\t\t\t\t\t\t/>\n'''
text = replace_once(text, old_relationship_ui, new_relationship_ui, 'relationship UI')

old_mood_ui = '''\t\t\t\t{effectMode === 'character-mood-set' && (
\t\t\t\t\t<>
\t\t\t\t\t\t<select aria-label="Персонаж для mood" value={moodCharacterId} onChange={event => setMoodCharacterId(event.target.value)}>
\t\t\t\t\t\t\t<option value="">Выбери персонажа</option>
\t\t\t\t\t\t\t{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
\t\t\t\t\t\t</select>
'''
new_mood_ui = '''\t\t\t\t{effectMode === 'character-mood-set' && (\n\t\t\t\t\t<>\n\t\t\t\t\t\t<CharacterReferenceSelect\n\t\t\t\t\t\t\tariaLabel="Персонаж для mood"\n\t\t\t\t\t\t\tvalue={moodCharacterReference}\n\t\t\t\t\t\t\tonChange={setMoodCharacterReference}\n\t\t\t\t\t\t\tcharacters={project.characters}\n\t\t\t\t\t\t\tmove={move}\n\t\t\t\t\t\t/>\n'''
text = replace_once(text, old_mood_ui, new_mood_ui, 'mood UI')

old_item_select = '''\t\t\t\t\t\t<select aria-label="Куда переместить предмет" value={itemDestination} onChange={event => {setItemDestination(event.target.value as ItemDestination); setItemDestinationId('');}}>
'''
new_item_select = '''\t\t\t\t\t\t<select aria-label="Куда переместить предмет" value={itemDestination} onChange={event => {setItemDestination(event.target.value as ItemDestination); setItemLocationId(''); setItemCharacterReference('');}}>
'''
text = replace_once(text, old_item_select, new_item_select, 'item destination reset')

old_item_character_ui = '''\t\t\t\t\t\t{itemDestination === 'character' && (
\t\t\t\t\t\t\t<select aria-label="Получатель предмета" value={itemDestinationId} onChange={event => setItemDestinationId(event.target.value)}>
\t\t\t\t\t\t\t\t<option value="">Выбери персонажа</option>
\t\t\t\t\t\t\t\t{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
\t\t\t\t\t\t\t</select>
\t\t\t\t\t\t)}
'''
new_item_character_ui = '''\t\t\t\t\t\t{itemDestination === 'character' && (\n\t\t\t\t\t\t\t<CharacterReferenceSelect\n\t\t\t\t\t\t\t\tariaLabel="Получатель предмета"\n\t\t\t\t\t\t\t\tvalue={itemCharacterReference}\n\t\t\t\t\t\t\t\tonChange={setItemCharacterReference}\n\t\t\t\t\t\t\t\tcharacters={project.characters}\n\t\t\t\t\t\t\t\tmove={move}\n\t\t\t\t\t\t\t/>\n\t\t\t\t\t\t)}\n'''
text = replace_once(text, old_item_character_ui, new_item_character_ui, 'item character UI')
text = replace_once(
    text,
    '<select aria-label="Локация предмета" value={itemDestinationId} onChange={event => setItemDestinationId(event.target.value)}>',
    '<select aria-label="Локация предмета" value={itemLocationId} onChange={event => setItemLocationId(event.target.value)}>',
    'item location UI'
)

old_memory_ui = '''\t\t\t\t{effectMode === 'character-remembers' && (
\t\t\t\t\t<>
\t\t\t\t\t\t<select aria-label="Персонаж для воспоминания" value={memoryCharacterId} onChange={event => setMemoryCharacterId(event.target.value)}>
\t\t\t\t\t\t\t<option value="">Кто запомнит</option>
\t\t\t\t\t\t\t{project.characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
\t\t\t\t\t\t</select>
'''
new_memory_ui = '''\t\t\t\t{effectMode === 'character-remembers' && (\n\t\t\t\t\t<>\n\t\t\t\t\t\t<CharacterReferenceSelect\n\t\t\t\t\t\t\tariaLabel="Персонаж для воспоминания"\n\t\t\t\t\t\t\tvalue={memoryCharacterReference}\n\t\t\t\t\t\t\tonChange={setMemoryCharacterReference}\n\t\t\t\t\t\t\tcharacters={project.characters}\n\t\t\t\t\t\t\tmove={move}\n\t\t\t\t\t\t/>\n'''
text = replace_once(text, old_memory_ui, new_memory_ui, 'memory UI')

path.write_text(text)
