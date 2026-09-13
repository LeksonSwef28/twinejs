import {NarrativeMoveDefinition} from '../interaction';
import {analyzeStoryCoverage} from '../story-analysis';
import {StoryConnectionDefinition, StoryNodeDefinition} from '../story';

function node(
	id: string,
	day: number,
	participantIds: string[] = []
): StoryNodeDefinition {
	return {
		id,
		kind: 'event',
		title: id,
		participantIds,
		placement: {day, minuteOfDay: 600},
		activationState: 'draft'
	};
}

describe('Story Brain Coverage', () => {
	test('detects an empty skill-check outcome and asymmetric branch consequences', () => {
		const nodes = [node('door', 10), node('success', 11)];
		const move: NarrativeMoveDefinition = {
			id: 'persuade',
			storyNodeId: 'door',
			kind: 'persuade',
			label: 'Убедить охранника',
			targetCharacterIds: [],
			guards: [],
			resolution: {
				type: 'skill-check',
				check: {
					skillKey: 'persuasion',
					difficulty: 12,
					rollRule: {type: 'dice', diceCount: 2, dieSides: 6},
					modifiers: [],
					successOutcomeId: 'success-outcome',
					failureOutcomeId: 'failure-outcome'
				}
			},
			outcomes: [
				{
					id: 'success-outcome',
					key: 'success',
					label: 'Успех',
					effectStoryNodeIds: ['success'],
					effects: []
				},
				{
					id: 'failure-outcome',
					key: 'failure',
					label: 'Провал',
					effectStoryNodeIds: [],
					effects: []
				}
			]
		};

		const result = analyzeStoryCoverage(nodes, [], [move], 93);

		expect(result.outcomeWithoutConsequenceIds).toContain('failure-outcome');
		expect(result.asymmetricMoveIds).toContain('persuade');
		expect(
			result.findings.some(
				finding =>
					finding.kind === 'outcome-without-consequence' &&
					finding.outcomeId === 'failure-outcome'
			)
		).toBe(true);
	});

	test('reference edges do not keep a causal branch alive', () => {
		const nodes = [node('a', 5), node('note', 6)];
		const connections: StoryConnectionDefinition[] = [
			{
				id: 'semantic',
				sourceNodeId: 'a',
				targetNodeId: 'note',
				kind: 'semantic',
				mode: 'reference'
			}
		];

		const result = analyzeStoryCoverage(nodes, connections, [], 93);

		expect(result.terminalNodeIds).toContain('a');
		expect(result.earlyTerminalNodeIds).toContain('a');
	});

	test('flags a placed character line whose latest authored nodes are terminal', () => {
		const nodes = [
			node('katya-early', 7, ['katya']),
			node('katya-late', 42, ['katya'])
		];
		const connections: StoryConnectionDefinition[] = [
			{
				id: 'flow',
				sourceNodeId: 'katya-early',
				targetNodeId: 'katya-late',
				kind: 'flow',
				mode: 'executable',
				sourcePortId: 'out',
				targetPortId: 'in'
			}
		];

		const result = analyzeStoryCoverage(nodes, connections, [], 93);

		expect(result.characterFrontierIds).toContain('katya');
		expect(
			result.findings.some(finding => finding.kind === 'character-frontier')
		).toBe(true);
	});
});
