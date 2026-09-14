from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Expected fragment missing: {label}')
    return text.replace(old, new, 1)


analysis_path = Path('src/domain/narrative/story-analysis.ts')
text = analysis_path.read_text()
text = replace_once(
    text,
    """export type StoryCoverageFindingKind =\n\t| 'terminal-story-node'\n\t| 'early-terminal-story-node'\n\t| 'outcome-without-consequence'\n\t| 'asymmetric-outcomes'\n\t| 'character-frontier';\n""",
    """export type StoryCoverageFindingKind =\n\t| 'terminal-story-node'\n\t| 'early-terminal-story-node'\n\t| 'isolated-story-node'\n\t| 'unreachable-story-node'\n\t| 'outcome-without-consequence'\n\t| 'asymmetric-outcomes'\n\t| 'character-frontier';\n""",
    'coverage finding kinds'
)
text = replace_once(
    text,
    """export interface StoryCoverageAnalysis {\n\tfindings: StoryCoverageFinding[];\n\tterminalNodeIds: string[];\n\tearlyTerminalNodeIds: string[];\n\toutcomeWithoutConsequenceIds: string[];\n\tasymmetricMoveIds: string[];\n\tcharacterFrontierIds: string[];\n}\n""",
    """export interface StoryCoverageAnalysis {\n\tfindings: StoryCoverageFinding[];\n\tterminalNodeIds: string[];\n\tearlyTerminalNodeIds: string[];\n\tisolatedNodeIds: string[];\n\tunreachableNodeIds: string[];\n\toutcomeWithoutConsequenceIds: string[];\n\tasymmetricMoveIds: string[];\n\tcharacterFrontierIds: string[];\n}\n""",
    'coverage analysis fields'
)
text = replace_once(
    text,
    """\tconst causalConnections = continuityConnections(connections);\n\tconst outgoingByNode = new Map<string, Set<string>>();\n\tfor (const node of nodes) {\n\t\toutgoingByNode.set(node.id, new Set());\n\t}\n\tfor (const connection of causalConnections) {\n\t\toutgoingByNode\n\t\t\t.get(connection.sourceNodeId)\n\t\t\t?.add(connection.targetNodeId);\n\t}\n\tfor (const move of moves) {\n\t\tconst outgoing = outgoingByNode.get(move.storyNodeId);\n\t\tif (!outgoing) {\n\t\t\tcontinue;\n\t\t}\n\t\tfor (const outcome of move.outcomes) {\n\t\t\tfor (const targetNodeId of outcome.effectStoryNodeIds) {\n\t\t\t\toutgoing.add(targetNodeId);\n\t\t\t}\n\t\t}\n\t}\n\n\tconst findings: StoryCoverageFinding[] = [];\n""",
    """\tconst causalConnections = continuityConnections(connections);\n\tconst nodeIds = new Set(nodes.map(node => node.id));\n\tconst outgoingByNode = new Map<string, Set<string>>();\n\tconst incomingByNode = new Map<string, Set<string>>();\n\tfor (const node of nodes) {\n\t\toutgoingByNode.set(node.id, new Set());\n\t\tincomingByNode.set(node.id, new Set());\n\t}\n\tfunction addCausalLink(sourceNodeId: string, targetNodeId: string) {\n\t\tif (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) {\n\t\t\treturn;\n\t\t}\n\t\toutgoingByNode.get(sourceNodeId)!.add(targetNodeId);\n\t\tincomingByNode.get(targetNodeId)!.add(sourceNodeId);\n\t}\n\tfor (const connection of causalConnections) {\n\t\taddCausalLink(connection.sourceNodeId, connection.targetNodeId);\n\t}\n\tfor (const move of moves) {\n\t\tif (!nodeIds.has(move.storyNodeId)) {\n\t\t\tcontinue;\n\t\t}\n\t\tfor (const outcome of move.outcomes) {\n\t\t\tfor (const targetNodeId of outcome.effectStoryNodeIds) {\n\t\t\t\taddCausalLink(move.storyNodeId, targetNodeId);\n\t\t\t}\n\t\t}\n\t}\n\n\tconst findings: StoryCoverageFinding[] = [];\n""",
    'coverage causal maps'
)

terminal_marker = """\tfor (const node of nodes) {\n\t\tif (!terminalSet.has(node.id)) {\n\t\t\tcontinue;\n\t\t}\n\t\tfindings.push({\n\t\t\tid: `coverage:terminal:${node.id}`,\n\t\t\tkind: earlyTerminalSet.has(node.id)\n\t\t\t\t? 'early-terminal-story-node'\n\t\t\t\t: 'terminal-story-node',\n\t\t\tseverity: earlyTerminalSet.has(node.id) ? 'warning' : 'info',\n\t\t\tstoryNodeId: node.id,\n\t\tsummary: earlyTerminalSet.has(node.id)\n\t\t\t\t? `Ветка заканчивается на «${node.title}» раньше конца 93-дневного окна.`\n\t\t\t\t: `«${node.title}» — текущий конец исполняемой ветки.`\n\t\t});\n\t}\n\n"""
# Actual file has a tab before summary; use exact source fragment loaded from repo more defensively via anchor.
anchor = "\tconst outcomeWithoutConsequenceIds: string[] = [];\n"
if anchor not in text:
    raise SystemExit('Expected fragment missing: outcome coverage anchor')
structural = """\tconst isolatedNodeIds =\n\t\tnodes.length <= 1\n\t\t\t? []\n\t\t\t: nodes\n\t\t\t\t\t.filter(\n\t\t\t\t\t\tnode =>\n\t\t\t\t\t\t\t(incomingByNode.get(node.id)?.size ?? 0) === 0 &&\n\t\t\t\t\t\t\t(outgoingByNode.get(node.id)?.size ?? 0) === 0\n\t\t\t\t\t)\n\t\t\t\t\t.map(node => node.id);\n\tfor (const nodeId of isolatedNodeIds) {\n\t\tconst node = nodes.find(candidate => candidate.id === nodeId)!;\n\t\tfindings.push({\n\t\t\tid: `coverage:isolated:${node.id}`,\n\t\t\tkind: 'isolated-story-node',\n\t\t\tseverity: 'warning',\n\t\t\tstoryNodeId: node.id,\n\t\t\tsummary: `«${node.title}» изолирован: у узла нет исполняемых входящих или исходящих Story-связей/продолжений.`\n\t\t});\n\t}\n\n\tconst entryNodeIds = nodes\n\t\t.filter(node => (incomingByNode.get(node.id)?.size ?? 0) === 0)\n\t\t.map(node => node.id);\n\tconst unreachableNodeIds: string[] = [];\n\tif (entryNodeIds.length === 1) {\n\t\tconst entryNodeId = entryNodeIds[0];\n\t\tconst reachable = new Set<string>([entryNodeId]);\n\t\tconst queue = [entryNodeId];\n\t\twhile (queue.length > 0) {\n\t\t\tconst current = queue.shift()!;\n\t\t\tfor (const targetNodeId of outgoingByNode.get(current) ?? []) {\n\t\t\t\tif (!reachable.has(targetNodeId)) {\n\t\t\t\t\treachable.add(targetNodeId);\n\t\t\t\t\tqueue.push(targetNodeId);\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t\tconst entryNode = nodes.find(node => node.id === entryNodeId)!;\n\t\tfor (const node of nodes) {\n\t\t\tif (reachable.has(node.id)) {\n\t\t\t\tcontinue;\n\t\t\t}\n\t\t\tunreachableNodeIds.push(node.id);\n\t\t\tfindings.push({\n\t\t\t\tid: `coverage:unreachable:${node.id}`,\n\t\t\t\tkind: 'unreachable-story-node',\n\t\t\t\tseverity: 'warning',\n\t\t\t\tstoryNodeId: node.id,\n\t\t\t\tsummary: `«${node.title}» недостижим из единственной точки входа «${entryNode.title}» по исполняемому Story-графу.`\n\t\t\t});\n\t\t}\n\t}\n\n"""
text = text.replace(anchor, structural + anchor, 1)
text = replace_once(
    text,
    """\treturn {\n\t\tfindings,\n\t\tterminalNodeIds,\n\t\tearlyTerminalNodeIds,\n\t\toutcomeWithoutConsequenceIds,\n\t\tasymmetricMoveIds,\n\t\tcharacterFrontierIds\n\t};\n""",
    """\treturn {\n\t\tfindings,\n\t\tterminalNodeIds,\n\t\tearlyTerminalNodeIds,\n\t\tisolatedNodeIds,\n\t\tunreachableNodeIds,\n\t\toutcomeWithoutConsequenceIds,\n\t\tasymmetricMoveIds,\n\t\tcharacterFrontierIds\n\t};\n""",
    'coverage result fields'
)
analysis_path.write_text(text)

test_path = Path('src/domain/narrative/__tests__/story-coverage.test.ts')
text = test_path.read_text()
new_tests = """\n\ttest('flags isolated nodes without pretending a multi-entry story has one canonical root', () => {\n\t\tconst nodes = [node('entry', 1), node('next', 2), node('lonely', 3)];\n\t\tconst connections: StoryConnectionDefinition[] = [\n\t\t\t{\n\t\t\t\tid: 'entry-next',\n\t\t\t\tsourceNodeId: 'entry',\n\t\t\t\ttargetNodeId: 'next',\n\t\t\t\tkind: 'flow',\n\t\t\t\tmode: 'executable',\n\t\t\t\tsourcePortId: 'flow-out',\n\t\t\t\ttargetPortId: 'flow-in'\n\t\t\t}\n\t\t];\n\n\t\tconst result = analyzeStoryCoverage(nodes, connections, [], 93);\n\n\t\texpect(result.isolatedNodeIds).toEqual(['lonely']);\n\t\texpect(result.unreachableNodeIds).toEqual([]);\n\t\texpect(\n\t\t\tresult.findings.some(\n\t\t\t\tfinding => finding.kind === 'isolated-story-node' && finding.storyNodeId === 'lonely'\n\t\t\t)\n\t\t).toBe(true);\n\t});\n\n\ttest('flags a disconnected causal cycle when the story has one unambiguous entry', () => {\n\t\tconst nodes = [\n\t\t\tnode('root', 1),\n\t\t\tnode('end', 2),\n\t\t\tnode('cycle-a', 3),\n\t\t\tnode('cycle-b', 4)\n\t\t];\n\t\tconst connections: StoryConnectionDefinition[] = [\n\t\t\t{\n\t\t\t\tid: 'root-end',\n\t\t\t\tsourceNodeId: 'root',\n\t\t\t\ttargetNodeId: 'end',\n\t\t\t\tkind: 'flow',\n\t\t\t\tmode: 'executable',\n\t\t\t\tsourcePortId: 'flow-out',\n\t\t\t\ttargetPortId: 'flow-in'\n\t\t\t},\n\t\t\t{\n\t\t\t\tid: 'cycle-a-b',\n\t\t\t\tsourceNodeId: 'cycle-a',\n\t\t\t\ttargetNodeId: 'cycle-b',\n\t\t\t\tkind: 'flow',\n\t\t\t\tmode: 'executable',\n\t\t\t\tsourcePortId: 'flow-out',\n\t\t\t\ttargetPortId: 'flow-in'\n\t\t\t},\n\t\t\t{\n\t\t\t\tid: 'cycle-b-a',\n\t\t\t\tsourceNodeId: 'cycle-b',\n\t\t\t\ttargetNodeId: 'cycle-a',\n\t\t\t\tkind: 'flow',\n\t\t\t\tmode: 'executable',\n\t\t\t\tsourcePortId: 'flow-out',\n\t\t\t\ttargetPortId: 'flow-in'\n\t\t\t}\n\t\t];\n\n\t\tconst result = analyzeStoryCoverage(nodes, connections, [], 93);\n\n\t\texpect(result.unreachableNodeIds.sort()).toEqual(['cycle-a', 'cycle-b']);\n\t\texpect(\n\t\t\tresult.findings.filter(finding => finding.kind === 'unreachable-story-node')\n\t\t).toHaveLength(2);\n\t});\n"""
if not text.endswith('});\n'):
    raise SystemExit('Expected fragment missing: Story Coverage test suite ending')
text = text[:-4] + new_tests + '});\n'
test_path.write_text(text)

roadmap_path = Path('93DAYS_ROADMAP_A47_A52_EDITOR_PRODUCT.md')
text = roadmap_path.read_text()
old_status = '**Status:** IN PROGRESS. Broken authored-reference diagnostics, Reaction Candidate Set validation and project-wide visibility are implemented. This branch adds the first actionable jump-to-source path for diagnostics whose authoring owner is represented by Story Brain / STORY canvas; unsupported owner kinds remain text-only instead of receiving misleading navigation.'
new_status = '**Status:** IN PROGRESS. Broken authored-reference diagnostics, Reaction Candidate Set validation, project-wide visibility and the first actionable Story-side jump-to-source path are merged. This branch adds conservative isolated/unreachable Story diagnostics: strict reachability is reported only when the executable graph has one unambiguous entry root.'
text = replace_once(text, old_status, new_status, 'A48 roadmap status')
roadmap_path.write_text(text)
