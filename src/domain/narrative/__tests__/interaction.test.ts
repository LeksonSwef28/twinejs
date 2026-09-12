import {
	NarrativeResolutionDefinition,
	resolveNarrativeSkillCheck
} from '../interaction';

function skillCheckResolution(): Extract<
	NarrativeResolutionDefinition,
	{type: 'skill-check'}
> {
	return {
		type: 'skill-check',
		check: {
			skillKey: 'persuasion',
			difficulty: 12,
			rollRule: {type: 'dice', diceCount: 2, dieSides: 6},
			modifiers: [{id: 'trust', label: 'Доверие', value: 1}],
			successOutcomeId: 'success',
			failureOutcomeId: 'failure',
			retryPolicy: 'never'
		}
	};
}

describe('Narrative skill checks', () => {
	test('resolves success deterministically without rolling inside the domain', () => {
		const result = resolveNarrativeSkillCheck(skillCheckResolution(), {
			skillValue: 4,
			rollTotal: 7
		});

		expect(result).toEqual({
			skillKey: 'persuasion',
			difficulty: 12,
			rollTotal: 7,
			skillValue: 4,
			modifierTotal: 1,
			total: 12,
			succeeded: true,
			outcomeId: 'success'
		});
	});

	test('routes failure to a separate authored outcome', () => {
		const result = resolveNarrativeSkillCheck(skillCheckResolution(), {
			skillValue: 1,
			rollTotal: 5
		});

		expect(result.succeeded).toBe(false);
		expect(result.outcomeId).toBe('failure');
		expect(result.total).toBe(7);
	});

	test('rejects a roll impossible for the authored dice rule', () => {
		expect(() =>
			resolveNarrativeSkillCheck(skillCheckResolution(), {
				skillValue: 3,
				rollTotal: 13
			})
		).toThrow(RangeError);
	});
});
