import {act, renderHook} from '@testing-library/react-hooks';
import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {Story} from '../stories';
import {
	useStoryFormatsContext
} from '../story-formats';
import {fakeLoadedStoryFormat} from '../../test-util';
import {publishStoryWithFormat} from '../../util/publish';
import {
	narrativeRuntimeProofStoryFormatName,
	narrativeRuntimeProofStoryFormatSource,
	narrativeRuntimeProofStoryFormatVersion
} from '../../application/narrative/runtime-proof';
import {useNarrativePublishing} from '../use-narrative-publishing';

jest.mock('../../util/publish');
jest.mock('../story-formats', () => ({
	...jest.requireActual('../story-formats'),
	useStoryFormatsContext: jest.fn()
}));

const useStoryFormatsContextMock = useStoryFormatsContext as jest.Mock;
const publishStoryWithFormatMock = publishStoryWithFormat as jest.Mock;

function project() {
	const value = createNarrativeProject(
		'narrative-host',
		'Narrative export',
		ninetyThreeDaysTemplate
	);
	value.projectId = 'project-export';
	return value;
}

function hostStory(formatName: string, formatVersion: string): Story {
	return {
		id: 'narrative-host',
		ifid: 'IFID-NARRATIVE',
		lastUpdate: new Date('2026-09-18T00:00:00.000Z'),
		name: 'Legacy host',
		passages: [
			{
				id: 'legacy',
				story: 'narrative-host',
				name: 'Legacy',
				tags: [],
				text: 'LEGACY CONTENT',
				top: 0,
				left: 0,
				width: 100,
				height: 100,
				selected: false,
				highlighted: false
			}
		],
		script: 'legacy-script',
		selected: false,
		snapToGrid: true,
		startPassage: 'legacy',
		storyFormat: formatName,
		storyFormatVersion: formatVersion,
		stylesheet: 'legacy-style',
		tags: [],
		tagColors: {},
		zoom: 1
	};
}

describe('useNarrativePublishing', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		const format = fakeLoadedStoryFormat(
			{name: 'SugarCube', version: '2.37.3'},
			{name: 'SugarCube', version: '2.37.3', source: '<html>{{STORY_DATA}}</html>'}
		);
		useStoryFormatsContextMock.mockReturnValue({
			dispatch: jest.fn(),
			formats: [format]
		});
		publishStoryWithFormatMock.mockReturnValue('<html>published</html>');
	});

	test('binds the transient generated Story through the existing generic publisher', async () => {
		const {result} = renderHook(() => useNarrativePublishing());
		let published: Awaited<
			ReturnType<typeof result.current.publishNarrativeProject>
		>;

		await act(async () => {
			published = await result.current.publishNarrativeProject(
				project(),
				hostStory('SugarCube', '2.37.3')
			);
		});

		expect(published!.status).toBe('published');
		if (published!.status !== 'published') {
			throw new Error('Expected published result');
		}
		expect(published!.html).toBe('<html>published</html>');
		expect(published!.story.passages).toHaveLength(1);
		expect(published!.story.passages[0].text).not.toContain('LEGACY CONTENT');
		expect(publishStoryWithFormatMock).toHaveBeenCalledTimes(1);
		expect(publishStoryWithFormatMock.mock.calls[0][0]).toBe(published!.story);
		expect(publishStoryWithFormatMock.mock.calls[0][1]).toBe(
			'<html>{{STORY_DATA}}</html>'
		);
	});

	test('builds compiler proof without loading or depending on the host Story Format', () => {
		useStoryFormatsContextMock.mockReturnValue({
			dispatch: jest.fn(),
			formats: []
		});
		publishStoryWithFormatMock.mockReturnValue('<html>proof</html>');
		const {result} = renderHook(() => useNarrativePublishing());

		const proof = result.current.publishNarrativeProof(
			project(),
			hostStory('MissingHostFormat', '99.0.0')
		);

		expect(proof.status).toBe('ready');
		if (proof.status !== 'ready') {
			throw new Error('Expected ready compiler proof');
		}
		expect(proof.html).toBe('<html>proof</html>');
		expect(proof.story.storyFormat).toBe(narrativeRuntimeProofStoryFormatName);
		expect(proof.story.storyFormatVersion).toBe(
			narrativeRuntimeProofStoryFormatVersion
		);
		expect(publishStoryWithFormatMock).toHaveBeenCalledTimes(1);
		expect(publishStoryWithFormatMock.mock.calls[0][1]).toBe(
			narrativeRuntimeProofStoryFormatSource
		);
	});

	test('returns compiler blockers without calling the generic publisher', async () => {
		const value = project();
		value.template = {...value.template, periods: []};
		const {result} = renderHook(() => useNarrativePublishing());
		let published: Awaited<
			ReturnType<typeof result.current.publishNarrativeProject>
		>;

		await act(async () => {
			published = await result.current.publishNarrativeProject(
				value,
				hostStory('SugarCube', '2.37.3')
			);
		});

		expect(published!.status).toBe('blocked');
		expect(publishStoryWithFormatMock).not.toHaveBeenCalled();
	});

	test('returns adapter blockers without loading or publishing a mismatched host Story', async () => {
		const value = project();
		const host = {...hostStory('SugarCube', '2.37.3'), id: 'wrong-host'};
		const {result} = renderHook(() => useNarrativePublishing());
		let published: Awaited<
			ReturnType<typeof result.current.publishNarrativeProject>
		>;

		await act(async () => {
			published = await result.current.publishNarrativeProject(value, host);
		});

		expect(published!.status).toBe('blocked');
		expect(
			published!.diagnostics.some(
				diagnostic =>
					diagnostic.source === 'adapter' &&
					diagnostic.code === 'host-story-mismatch'
			)
		).toBe(true);
		expect(publishStoryWithFormatMock).not.toHaveBeenCalled();
	});
});
