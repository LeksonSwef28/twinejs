import {act, render, screen} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {axe} from 'jest-axe';
import * as React from 'react';
import {Helmet} from 'react-helmet';
import {Route, Router} from 'react-router-dom';
import {Story, useStoriesContext} from '../../../store/stories';
import {
	fakeLoadedStoryFormat,
	FakeStateProvider,
	FakeStateProviderProps,
	fakeStory,
	StoryInspector
} from '../../../test-util';
import {InnerStoryEditRoute} from '../story-edit-route';

const TestStoryEditRoute: React.FC = () => {
	const {stories} = useStoriesContext();

	return (
		<Router
			history={createMemoryHistory({
				initialEntries: [`/stories/${stories[0].id}`]
			})}
		>
			<Route path="/stories/:storyId">
				<InnerStoryEditRoute />
				<StoryInspector />
			</Route>
		</Router>
	);
};

describe('<StoryEditRoute>', () => {
	async function renderComponent(
		story: Story,
		contexts?: FakeStateProviderProps
	) {
		const format = fakeLoadedStoryFormat();

		format.name = story.storyFormat;
		format.version = story.storyFormatVersion;

		jest.useFakeTimers();

		const result = render(
			<FakeStateProvider
				{...contexts}
				stories={[story]}
				storyFormats={[format]}
			>
				<TestStoryEditRoute />
			</FakeStateProvider>
		);

		act(() => {
			jest.runAllTimers();
		});

		jest.useRealTimers();

		await act(async () => Promise.resolve());
		return result;
	}

	it('sets the document title to the story name', async () => {
		const story = fakeStory();

		await renderComponent(story);
		expect(Helmet.peek().title).toBe(story.name);
	});

	it('opens the narrative workspace for the story', async () => {
		const story = fakeStory();

		await renderComponent(story);
		expect(screen.getByText('Narrative Editor')).toBeInTheDocument();
		expect(screen.getByRole('heading', {name: story.name})).toBeInTheDocument();
		expect(screen.getByText(/93 Days/)).toBeInTheDocument();
		expect(screen.getByText(/День 1/)).toBeInTheDocument();
	});

	it('shows the 93 Days period controls', async () => {
		await renderComponent(fakeStory());
		expect(screen.getByRole('button', {name: 'Утро'})).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'День'})).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Вечер'})).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Ночь'})).toBeInTheDocument();
	});

	it('is accessible', async () => {
		const {container} = await renderComponent(fakeStory());

		expect(await axe(container)).toHaveNoViolations();
	});
});
