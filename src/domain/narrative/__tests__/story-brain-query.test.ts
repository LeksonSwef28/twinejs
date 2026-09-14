import {
	queryStoryBrain,
	queryStoryBrainProjectDiagnostics
} from '../../../application/narrative/story-brain-query';
import {createNarrativeProject} from '../project-factory';
import {characterKnowledgeStateId} from '../knowledge';
import {ninetyThreeDaysTemplate} from '../templates/93-days';

function projectWithGuardedMove(knowsClaim: boolean) {
	const project = createNarrativeProject(
		'story-brain',
		'Story Brain',
		ninetyThreeDaysTemplate
	);
	return {
		...project,
		characters: [
			{
				id: 'player',
				name: 'Игрок',
				cognitionTier: 'full' as const,
				defaultBehaviorProfileId: 'player-profile'
			},
			{
				id: 'guard',
				name: 'Охранник',
				cognitionTier: 'full' as const,
				defaultBehaviorProfileId: 'guard-profile'
			}
		],
		claims: [
			{
				id: 'claim-code',
				text: 'Кодовое слово — север',
				stance: 'unresolved' as const,
				tags: []
			}
		],
		storyNodes: [
			{
				id: 'door',
				kind: 'dialogue' as const,
				title: 'Разговор у двери',
				participantIds: ['player', 'guard'],
				activationState: 'available' as const
			}
		],
		narrativeMoves: [
			{
				id: 'say-code',
				storyNodeId: 'door',
				kind: 'inform' as const,
				label: 'Назвать кодовое слово',
				actorCharacterId: 'player',
				targetCharacterIds: ['guard'],
				communicatedClaimId: 'claim-code',
				guards: [
					{
						id: 'knows-code',
						label: 'Игрок знает код',
						condition: {
							type: 'character-knows-claim' as const,
							characterId: 'player',
							claimId: 'claim-code'
						}
					}
				],
				resolution: {type: 'automatic' as const, outcomeId: 'continue'},
				outcomes: [
					{
						id: 'continue',
						key: 'continue',
						label: 'Охранник отвечает',
						effectStoryNodeIds: [],
						effects: []
					}
				]
			}
		],
		simulation: {
			...project.simulation,
			characterKnowledge: knowsClaim
				? [
						{
							id: characterKnowledgeStateId('player', 'claim-code'),
							characterId: 'player',
							claimId: 'claim-code',
							attitude: 'knows' as const,
							confidence: 1,
							source: {type: 'authored' as const},
							timesHeard: 1
						}
				  ]
				: []
		}
	};
}

describe('Story Brain WHY query', () => {
	test('explains a blocked move from the current preview knowledge state', () => {
		const result = queryStoryBrain(projectWithGuardedMove(false), {
			kind: 'story-node',
			id: 'door'
		});

		expect(result.why.moves).toHaveLength(1);
		expect(result.why.moves[0].availability).toBe('blocked');
		expect(result.why.moves[0].guardTraces[0]).toEqual(
			expect.objectContaining({status: 'unmet', guardId: 'knows-code'})
		);
	});

	test('reuses the same runtime guard evaluator when the move becomes available', () => {
		const result = queryStoryBrain(projectWithGuardedMove(true), {
			kind: 'story-node',
			id: 'door'
		});

		expect(result.why.moves[0].availability).toBe('available');
		expect(result.why.moves[0].guardTraces[0].status).toBe('met');
		expect(result.why.moves[0].resolutionSummary).toContain('Без проверки');
	});

	test('Claim focus reaches the move that depends on that Claim', () => {
		const result = queryStoryBrain(projectWithGuardedMove(true), {
			kind: 'claim',
			id: 'claim-code'
		});

		expect(result.why.moves.map(move => move.moveId)).toContain('say-code');
		expect(result.impact.hits.map(hit => `${hit.entity.kind}:${hit.entity.id}`)).toContain(
			'move:say-code'
		);
	});

	test('exposes project-wide diagnostics outside the current Focus', () => {
		const base = projectWithGuardedMove(true);
		const project = {
			...base,
			claims: [
				...base.claims,
				{
					id: 'orphan-claim',
					text: 'Ссылка на исчезнувший факт',
					stance: 'unresolved' as const,
					tags: [],
					aboutFactId: 'missing-fact'
				}
			]
		};
		const focused = queryStoryBrain(project, {kind: 'story-node', id: 'door'});
		const diagnostics = queryStoryBrainProjectDiagnostics(project);

		expect(focused.coverage.findings.some(finding => finding.id.includes('orphan-claim'))).toBe(false);
		expect(focused.projectDiagnostics.findings.some(finding => finding.id.includes('orphan-claim'))).toBe(true);
		expect(diagnostics.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'broken-authored-reference',
					ownerKind: 'claim',
					ownerId: 'orphan-claim',
					targetKind: 'objective-fact',
					targetId: 'missing-fact'
				})
			])
		);
		expect(diagnostics.findingCount).toBe(diagnostics.findings.length);
	});
});
