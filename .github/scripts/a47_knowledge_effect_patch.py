from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected fragment not found in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


panel = 'src/components/narrative/workspace/outcome-effects-panel.tsx'

replace_once(
    panel,
    "import {StoryNodeActivationState} from '../../../domain/narrative/story';\n",
    "import {KnowledgeAttitude} from '../../../domain/narrative/knowledge';\nimport {StoryNodeActivationState} from '../../../domain/narrative/story';\n"
)

replace_once(
    panel,
    "type EffectMode =\n\t| 'relationship-adjust'\n",
    "type EffectMode =\n\t| 'character-learns-claim'\n\t| 'relationship-adjust'\n"
)

replace_once(
    panel,
    "type ItemDestination = 'unplaced' | 'character' | 'location';\n",
    "type KnowledgeRecipientMode = 'character' | 'move-target';\ntype KnowledgeClaimMode = 'claim' | 'communicated-claim';\ntype KnowledgeSourceMode = 'authored' | 'move-actor' | 'observed' | 'inferred';\ntype ItemDestination = 'unplaced' | 'character' | 'location';\n"
)

replace_once(
    panel,
    "const storyStates: StoryNodeActivationState[] = [\n",
    "const knowledgeAttitudeLabels: Record<KnowledgeAttitude, string> = {\n\tknows: 'Знает / уверен',\n\tbelieves: 'Верит',\n\tdoubts: 'Сомневается',\n\tdisbelieves: 'Не верит'\n};\n\nconst storyStates: StoryNodeActivationState[] = [\n"
)

replace_once(
    panel,
    "\tconst [effectMode, setEffectMode] = React.useState<EffectMode>('relationship-adjust');\n\tconst [fromCharacterId, setFromCharacterId] = React.useState('');\n",
    "\tconst [effectMode, setEffectMode] = React.useState<EffectMode>('relationship-adjust');\n\tconst [knowledgeRecipientMode, setKnowledgeRecipientMode] =\n\t\tReact.useState<KnowledgeRecipientMode>('character');\n\tconst [knowledgeCharacterId, setKnowledgeCharacterId] = React.useState('');\n\tconst [knowledgeTargetIndex, setKnowledgeTargetIndex] = React.useState(0);\n\tconst [knowledgeClaimMode, setKnowledgeClaimMode] =\n\t\tReact.useState<KnowledgeClaimMode>('claim');\n\tconst [knowledgeClaimId, setKnowledgeClaimId] = React.useState('');\n\tconst [knowledgeAttitude, setKnowledgeAttitude] =\n\t\tReact.useState<KnowledgeAttitude>('believes');\n\tconst [knowledgeConfidence, setKnowledgeConfidence] = React.useState(0.75);\n\tconst [knowledgeSource, setKnowledgeSource] =\n\t\tReact.useState<KnowledgeSourceMode>('authored');\n\tconst [fromCharacterId, setFromCharacterId] = React.useState('');\n"
)

replace_once(
    panel,
    "\tReact.useEffect(() => {\n\t\tconst selectedMove = project.narrativeMoves.find(candidate => candidate.id === moveId);\n\t\tsetOutcomeId(selectedMove?.outcomes[0]?.id ?? '');\n\t\tsetMessage('');\n\t}, [moveId, project.narrativeMoves]);\n",
    "\tReact.useEffect(() => {\n\t\tconst selectedMove = project.narrativeMoves.find(candidate => candidate.id === moveId);\n\t\tsetOutcomeId(selectedMove?.outcomes[0]?.id ?? '');\n\t\tsetKnowledgeTargetIndex(0);\n\t\tif (!selectedMove?.communicatedClaimId) {\n\t\t\tsetKnowledgeClaimMode('claim');\n\t\t}\n\t\tif (!selectedMove?.actorCharacterId) {\n\t\t\tsetKnowledgeSource('authored');\n\t\t}\n\t\tsetMessage('');\n\t}, [moveId, project.narrativeMoves]);\n"
)

replace_once(
    panel,
    "\t\tlet effect: NarrativeEffectDefinition | undefined;\n\t\tswitch (effectMode) {\n\t\t\tcase 'relationship-adjust':\n",
    "\t\tlet effect: NarrativeEffectDefinition | undefined;\n\t\tswitch (effectMode) {\n\t\t\tcase 'character-learns-claim':\n\t\t\t\tif (\n\t\t\t\t\t(knowledgeRecipientMode === 'character' && !knowledgeCharacterId) ||\n\t\t\t\t\t(knowledgeRecipientMode === 'move-target' &&\n\t\t\t\t\t\t!move.targetCharacterIds[knowledgeTargetIndex]) ||\n\t\t\t\t\t(knowledgeClaimMode === 'claim' && !knowledgeClaimId) ||\n\t\t\t\t\t(knowledgeClaimMode === 'communicated-claim' && !move.communicatedClaimId) ||\n\t\t\t\t\t(knowledgeSource === 'move-actor' && !move.actorCharacterId) ||\n\t\t\t\t\t!Number.isFinite(knowledgeConfidence) ||\n\t\t\t\t\tknowledgeConfidence < 0 ||\n\t\t\t\t\tknowledgeConfidence > 1\n\t\t\t\t) {\n\t\t\t\t\treturn;\n\t\t\t\t}\n\t\t\t\teffect = {\n\t\t\t\t\tid: createId('knowledge-effect'),\n\t\t\t\t\ttype: 'character-learns-claim',\n\t\t\t\t\trecipient:\n\t\t\t\t\t\tknowledgeRecipientMode === 'character'\n\t\t\t\t\t\t\t? {type: 'character', characterId: knowledgeCharacterId}\n\t\t\t\t\t\t\t: {type: 'move-target', targetIndex: knowledgeTargetIndex},\n\t\t\t\t\tclaim:\n\t\t\t\t\t\tknowledgeClaimMode === 'claim'\n\t\t\t\t\t\t\t? {type: 'claim', claimId: knowledgeClaimId}\n\t\t\t\t\t\t\t: {type: 'communicated-claim'},\n\t\t\t\t\tattitude: knowledgeAttitude,\n\t\t\t\t\tconfidence: knowledgeConfidence,\n\t\t\t\t\tsource: {type: knowledgeSource}\n\t\t\t\t};\n\t\t\t\tbreak;\n\t\t\tcase 'relationship-adjust':\n"
)

replace_once(
    panel,
    "\t\t\t<p>\n\t\t\t\tПоследствия типизированы отдельно от Outcome: отношение, настроение,\n\t\t\t\t предмет, Story state и память. Редактирование здесь не меняет текущий preview.\n\t\t\t</p>\n",
    "\t\t\t<p>\n\t\t\t\tПоследствия типизированы отдельно от Outcome: знания, отношения, настроение,\n\t\t\t\t предмет, Story state и память. Редактирование здесь не меняет текущий preview.\n\t\t\t</p>\n"
)

replace_once(
    panel,
    "\t\t\t\t<select aria-label=\"Тип Outcome effect\" value={effectMode} onChange={event => setEffectMode(event.target.value as EffectMode)}>\n\t\t\t\t\t<option value=\"relationship-adjust\">Изменить отношение</option>\n",
    "\t\t\t\t<select aria-label=\"Тип Outcome effect\" value={effectMode} onChange={event => setEffectMode(event.target.value as EffectMode)}>\n\t\t\t\t\t<option value=\"character-learns-claim\">Персонаж узнаёт / принимает Claim</option>\n\t\t\t\t\t<option value=\"relationship-adjust\">Изменить отношение</option>\n"
)

knowledge_ui = r'''
				{effectMode === 'character-learns-claim' && (
					<>
						<select
							aria-label="Получатель знания"
							value={knowledgeRecipientMode}
							onChange={event =>
								setKnowledgeRecipientMode(event.target.value as KnowledgeRecipientMode)
							}
						>
							<option value="character">Конкретный персонаж</option>
							<option value="move-target">Цель текущего Move</option>
						</select>
						{knowledgeRecipientMode === 'character' ? (
							<select
								aria-label="Персонаж получает Claim"
								value={knowledgeCharacterId}
								onChange={event => setKnowledgeCharacterId(event.target.value)}
							>
								<option value="">Выбери персонажа</option>
								{project.characters.map(character => (
									<option key={character.id} value={character.id}>
										{character.name}
									</option>
								))}
							</select>
						) : (
							<select
								aria-label="Цель Move получает Claim"
								value={knowledgeTargetIndex}
								onChange={event => setKnowledgeTargetIndex(Number(event.target.value))}
							>
								{move.targetCharacterIds.length === 0 ? (
									<option value={0}>У Move нет целей</option>
								) : (
									move.targetCharacterIds.map((characterId, index) => (
										<option key={`${characterId}:${index}`} value={index}>
											Цель {index + 1}:{' '}
											{project.characters.find(character => character.id === characterId)?.name ??
												characterId}
										</option>
									))
								)}
							</select>
						)}
						<select
							aria-label="Claim для knowledge effect"
							value={knowledgeClaimMode}
							onChange={event =>
								setKnowledgeClaimMode(event.target.value as KnowledgeClaimMode)
							}
						>
							<option value="claim">Конкретный Claim</option>
							<option value="communicated-claim" disabled={!move.communicatedClaimId}>
								Claim, который передаёт текущий Move
							</option>
						</select>
						{knowledgeClaimMode === 'claim' && (
							<select
								aria-label="Конкретный Claim knowledge effect"
								value={knowledgeClaimId}
								onChange={event => setKnowledgeClaimId(event.target.value)}
							>
								<option value="">Выбери Claim</option>
								{project.claims.map(claim => (
									<option key={claim.id} value={claim.id}>
										{claim.text}
									</option>
								))}
							</select>
						)}
						<select
							aria-label="Отношение к Claim"
							value={knowledgeAttitude}
							onChange={event =>
								setKnowledgeAttitude(event.target.value as KnowledgeAttitude)
							}
						>
							{Object.entries(knowledgeAttitudeLabels).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
						<label>
							Уверенность 0–1
							<input
								aria-label="Уверенность в Claim"
								type="number"
								min={0}
								max={1}
								step={0.05}
								value={knowledgeConfidence}
								onChange={event => setKnowledgeConfidence(Number(event.target.value))}
							/>
						</label>
						<select
							aria-label="Источник knowledge effect"
							value={knowledgeSource}
							onChange={event =>
								setKnowledgeSource(event.target.value as KnowledgeSourceMode)
							}
						>
							<option value="authored">Авторское знание / убеждение</option>
							<option value="move-actor" disabled={!move.actorCharacterId}>
								Актор текущего Move
							</option>
							<option value="observed">Наблюдение</option>
							<option value="inferred">Вывод персонажа</option>
						</select>
					</>
				)}

'''
replace_once(
    panel,
    "\n\t\t\t\t{effectMode === 'relationship-adjust' && (\n",
    "\n" + knowledge_ui + "\t\t\t\t{effectMode === 'relationship-adjust' && (\n"
)

replace_once(
    'src/components/narrative/workspace/story-workspace.tsx',
    "\t\t\t\t\t\t<strong>Факты / знания</strong>\n\t\t\t\t\t\t<small>раздельные модели — следующий слой</small>",
    "\t\t\t\t\t\t<strong>Факты / знания</strong>\n\t\t\t\t\t\t<small>Objective Facts · Claims · Initial Knowledge — в Project Library</small>"
)

audit = '93DAYS_A47_EDITOR_PRODUCT_AUDIT.md'
p = Path(audit)
text = p.read_text()
old = '''## Remaining A47 cleanup / explicitly deferred work

### P2 — Story left-rail cognition copy is stale

The Story left rail still says `Факты / знания — раздельные модели — следующий слой`, although Objective Facts, Claims and Initial Knowledge already exist in the global Project Library. This is stale product copy, not a missing domain or authoring capability.

**Disposition:** small UI-copy cleanup. It does not block A48.

### P2 — typed Outcome effect authoring is not yet consolidated into one surface

`OutcomeEffectsPanel` directly authors relationship, mood, item placement, Story-state and memory effects. `character-learns-claim` is still primarily reached through the Narrative Move authoring shortcut rather than the same general Outcome effect picker.

**Disposition:** UX consolidation candidate. The effect exists in the authored/runtime model, so this is not a simulation gap and does not block A48.

### P2 — destructive canonical-entity deletion remains intentionally conservative
'''
new = '''## A47 cleanup closed after the audit

The two non-destructive UX tails identified by this audit are now closed:

- the Story left rail points authors to the existing Objective Facts / Claims / Initial Knowledge models in Project Library instead of calling cognition a future layer;
- `OutcomeEffectsPanel` exposes `character-learns-claim` alongside the other typed Outcome effects, including fixed-character or Move-target recipients, fixed or communicated Claims, attitude, confidence and source.

The original Narrative Move shortcut remains useful for the common "target learns the communicated Claim" case, while the general Outcome picker now exposes the complete authored effect family without requiring JSON/code.

## Remaining A47 cleanup / explicitly deferred work

### P2 — destructive canonical-entity deletion remains intentionally conservative
'''
if old not in text:
    raise SystemExit('A47 cleanup section not found')
text = text.replace(old, new, 1)
old_transition = '''The first A48 addition should therefore not duplicate those diagnostics. The highest-leverage next slice is **broken authored-reference validation**: deterministic read-only findings for references to canonical/story entities that no longer exist or cannot resolve, surfaced through Story Brain before destructive entity deletion is expanded.

## Status

**A47: CORE NON-DESTRUCTIVE AUTHORING CLOSED.** The editor can complete the main authored loops through UI without JSON/code. Remaining A47 items are explicitly classified as P2 copy/UX/destructive-editing cleanup and do not block the start of A48 validation work.
'''
new_transition = '''A48 is now underway. Broken authored-reference validation is implemented as deterministic read-only diagnostics for canonical/story references, including nested Narrative Move references and Reaction Candidate Set dependencies. These findings are surfaced through Story Brain before destructive entity deletion is expanded.

## Status

**A47: NON-DESTRUCTIVE AUTHORING + IDENTIFIED UX CONSOLIDATION CLOSED.** The editor can complete the main authored loops through UI without JSON/code. Broad destructive canonical-entity deletion remains deliberately deferred behind A48 reference diagnostics/repair UX rather than being treated as an unfinished ordinary CRUD button.
'''
if old_transition not in text:
    raise SystemExit('A47 transition/status section not found')
p.write_text(text.replace(old_transition, new_transition, 1))
