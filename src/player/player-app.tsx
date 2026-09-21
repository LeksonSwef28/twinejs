import * as React from 'react';
import {executeNarrativePlayerAction} from '../application/narrative/player-action';
import {bootstrapNarrativePlayerHost} from '../application/narrative/player-host';
import {executeNarrativePlayerSleep} from '../application/narrative/player-sleep';
import {executeNarrativePlayerStoryWork} from '../application/narrative/player-story-work';
import {executeNarrativePlayerTravel} from '../application/narrative/player-travel';
import {executeNarrativePlayerWait} from '../application/narrative/player-wait';
import {deriveNarrativePlayerPresentation} from '../application/narrative/player-presentation';
import {NarrativePlayerSession} from '../application/narrative/player-runtime';
import {NarrativePlayerArtifactSource} from './artifact-source';
import './player-app.css';

function formatMinute(minuteOfDay: number) {
	const hours = Math.floor(minuteOfDay / 60)
		.toString()
		.padStart(2, '0');
	const minutes = (minuteOfDay % 60).toString().padStart(2, '0');
	return `${hours}:${minutes}`;
}

function percent(value: number) {
	return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function travelModeLabel(mode: string) {
	switch (mode) {
		case 'walk':
			return 'пешком';
		case 'city-bus':
			return 'автобус';
		case 'route-taxi':
			return 'маршрутка';
		case 'taxi':
			return 'такси';
		default:
			return 'дорога';
	}
}

function actionStateLabel(state: string) {
	switch (state) {
		case 'input-required':
			return 'нужна проверка';
		case 'blocked':
			return 'недоступно';
		case 'unknown':
			return 'не хватает данных';
		default:
			return '';
	}
}

export interface PlayerAppProps {
	artifactSource: NarrativePlayerArtifactSource;
}

export const PlayerApp: React.FC<PlayerAppProps> = ({artifactSource}) => {
	const bootstrap = React.useMemo(
		() =>
			bootstrapNarrativePlayerHost(
				artifactSource.status === 'found'
					? artifactSource.serializedArtifact
					: undefined
			),
		[artifactSource]
	);
	const [session, setSession] = React.useState<
		NarrativePlayerSession | undefined
	>(bootstrap.status === 'ready' ? bootstrap.session : undefined);
	const [feedback, setFeedback] = React.useState<
		{title: string; summary: string; tone: 'result' | 'notice'} | undefined
	>();

	if (bootstrap.status === 'rejected' || !session) {
		const summary =
			bootstrap.status === 'rejected'
				? bootstrap.summary
				: 'Player session was not initialized.';
		const code =
			bootstrap.status === 'rejected' ? bootstrap.code : 'session-unavailable';
		return (
			<main className="narrative-player narrative-player--error">
				<p className="narrative-player__eyebrow">93 ДНЯ</p>
				<h1>Не удалось запустить игру</h1>
				<p role="alert">{summary}</p>
				<code>{code}</code>
				{artifactSource.status === 'missing' && (
					<small>{artifactSource.summary}</small>
				)}
			</main>
		);
	}

	const project = session.currentProject;
	const view = deriveNarrativePlayerPresentation(project);

	const executeWait = (durationMinutes: number) => {
		const result = executeNarrativePlayerWait(session, durationMinutes);
		if (result.status === 'applied') {
			setSession(result.session);
			setFeedback({
				title: 'Подождали',
				summary: `Прошло ${result.durationMinutes} мин.`,
				tone: 'result'
			});
			return;
		}
		setFeedback({
			title: 'Не удалось подождать',
			summary: result.summary,
			tone: 'notice'
		});
	};

	const executeTravel = (routeId: string) => {
		if (view.perspective.status !== 'resolved') {
			return;
		}
		const result = executeNarrativePlayerTravel(
			session,
			routeId,
			view.perspective.character.id
		);
		if (result.status === 'applied') {
			setSession(result.session);
			setFeedback({
				title: result.destinationName,
				summary: `${result.routeLabel} · ${result.durationMinutes} мин.`,
				tone: 'result'
			});
			return;
		}
		setFeedback({
			title: 'Не удалось добраться',
			summary: result.summary,
			tone: 'notice'
		});
	};

	const executeStoryWork = (
		workId: string,
		decision: 'execute' | 'miss'
	) => {
		if (view.perspective.status !== 'resolved') {
			return;
		}
		const result = executeNarrativePlayerStoryWork(
			session,
			workId,
			decision,
			view.perspective.character.id
		);
		if (result.status === 'applied') {
			setSession(result.session);
			setFeedback({
				title:
					decision === 'miss'
						? 'Возможность пропущена'
						: 'Событие принято',
				summary: result.summary,
				tone: 'result'
			});
			return;
		}
		setFeedback({
			title: 'Событие недоступно',
			summary: result.summary,
			tone: 'notice'
		});
	};

	const executeSleep = (optionId: string) => {
		if (view.perspective.status !== 'resolved') {
			return;
		}
		const result = executeNarrativePlayerSleep(
			session,
			optionId,
			view.perspective.character.id
		);
		if (result.status === 'applied') {
			setSession(result.session);
			setFeedback({
				title: `День ${result.wakeDay}`,
				summary: `${result.label} · подъём в ${formatMinute(result.wakeMinuteOfDay)}`,
				tone: 'result'
			});
			return;
		}
		setFeedback({
			title: 'Не удалось уснуть',
			summary: result.summary,
			tone: 'notice'
		});
	};

	const executeAction = (moveId: string) => {
		if (view.perspective.status !== 'resolved') {
			return;
		}
		const result = executeNarrativePlayerAction(
			session,
			moveId,
			view.perspective.character.id
		);
		if (result.status === 'applied') {
			setSession(result.session);
			setFeedback({
				title: result.outcomeLabel,
				summary: result.resolutionSummary,
				tone: 'result'
			});
			return;
		}
		setFeedback({
			title: 'Действие не выполнено',
			summary: result.summary,
			tone: 'notice'
		});
	};

	return (
		<main className="narrative-player" data-player-status="ready">
			<header className="narrative-player__topbar">
				<div>
					<p className="narrative-player__eyebrow">93 ДНЯ ДО КОНЦА НАШЕГО ЛЕТА</p>
					<h1>{project.name}</h1>
				</div>
				<div className="narrative-player__clock" aria-label="Игровое время">
					<span>День {view.day}</span>
					<strong>{formatMinute(view.minuteOfDay)}</strong>
				</div>
			</header>

			{view.perspective.status === 'unresolved' ? (
				<section className="narrative-player__empty" data-player-view="setup">
					<p className="narrative-player__section-kicker">Подготовка мира</p>
					<h2>Игровой персонаж не определён</h2>
					<p>{view.perspective.summary}</p>
					<p className="narrative-player__muted">
						Player не выбирает протагониста и не придумывает стартовую
						локацию самостоятельно.
					</p>
				</section>
			) : (
				<div className="narrative-player__layout" data-player-view="world">
					<section className="narrative-player__scene" aria-labelledby="scene-title">
						<p className="narrative-player__section-kicker">Сейчас</p>
						<h2 id="scene-title">
							{view.location?.name ?? 'Местоположение не определено'}
						</h2>
						{view.scene ? (
							<p className="narrative-player__scene-name">{view.scene.name}</p>
						) : view.sceneState === 'ambiguous' ? (
							<p className="narrative-player__muted">
								В этой локации несколько сцен; активная сцена runtime пока не
								определена.
							</p>
						) : (
							<p className="narrative-player__muted">
								Сцена для этой локации пока не задана.
							</p>
						)}

						{feedback && (
							<div
								className={`narrative-player__feedback narrative-player__feedback--${feedback.tone}`}
								role="status"
							>
								<strong>{feedback.title}</strong>
								<p>{feedback.summary}</p>
							</div>
						)}

						<section className="narrative-player__panel" aria-labelledby="people-title">
							<div className="narrative-player__panel-heading">
								<h3 id="people-title">Здесь</h3>
								<span>{view.localCharacters.length}</span>
							</div>
							{view.locationState !== 'resolved' ? (
								<p className="narrative-player__muted">
									Actual Presence игрока ещё не указывает на известную локацию.
								</p>
							) : view.localCharacters.length === 0 ? (
								<p className="narrative-player__muted">Рядом никого нет.</p>
							) : (
								<ul className="narrative-player__people">
									{view.localCharacters.map(character => (
										<li key={character.id}>
											<span className="narrative-player__presence-dot" aria-hidden="true" />
											{character.name}
										</li>
									))}
								</ul>
							)}
						</section>

						{view.storyOpportunities.length > 0 && (
							<section
								className="narrative-player__panel"
								aria-labelledby="story-opportunities-title"
							>
								<div className="narrative-player__panel-heading">
									<h3 id="story-opportunities-title">Событие рядом</h3>
									<span>{view.storyOpportunities.length}</span>
								</div>
								<ul className="narrative-player__story-opportunities">
									{view.storyOpportunities.map(opportunity => (
										<li key={opportunity.id}>
											<strong>{opportunity.title}</strong>
											<small>
												День {opportunity.scheduledDay} ·{' '}
												{formatMinute(opportunity.scheduledMinuteOfDay)}
												{opportunity.locationName
													? ` · ${opportunity.locationName}`
													: ''}
											</small>
											<div className="narrative-player__story-buttons">
												<button
													type="button"
													disabled={opportunity.state !== 'ready'}
													onClick={() =>
														executeStoryWork(opportunity.id, 'execute')
													}
												>
													Участвовать
												</button>
												<button
													type="button"
													onClick={() =>
														executeStoryWork(opportunity.id, 'miss')
													}
												>
													{opportunity.state === 'expired'
														? 'Зафиксировать пропуск'
														: 'Пропустить'}
												</button>
											</div>
											{opportunity.state !== 'ready' && (
												<p>{opportunity.summary}</p>
											)}
										</li>
									))}
								</ul>
							</section>
						)}

						<section className="narrative-player__panel" aria-labelledby="travel-title">
							<div className="narrative-player__panel-heading">
								<h3 id="travel-title">Куда дальше</h3>
								<span>{view.travelOptions.length}</span>
							</div>
							<div className="narrative-player__wait-actions" aria-label="Ожидание">
								<button type="button" onClick={() => executeWait(5)}>
									Подождать 5 минут
								</button>
								<button type="button" onClick={() => executeWait(15)}>
									Подождать 15 минут
								</button>
							</div>
							{view.travelOptions.length === 0 ? (
								<p className="narrative-player__muted">
									Отсюда пока нет authored маршрутов.
								</p>
							) : (
								<ul className="narrative-player__travel">
									{view.travelOptions.map(option => (
										<li key={option.id}>
											<button
												type="button"
												disabled={option.state !== 'ready'}
												onClick={() => executeTravel(option.id)}
												data-travel-state={option.state}
											>
												<span>{option.label}</span>
												<small>
													{option.destinationName} · {travelModeLabel(option.mode)} ·{' '}
													{option.durationMinutes} мин.
												</small>
											</button>
											{option.state === 'blocked' && <p>{option.summary}</p>}
										</li>
									))}
								</ul>
							)}
						</section>

						{(view.sleepOptions.length > 0 || view.sleepWait) && (
							<section
								className="narrative-player__panel"
								aria-labelledby="sleep-title"
							>
								<div className="narrative-player__panel-heading">
									<h3 id="sleep-title">Отдых</h3>
									<span>{view.sleepOptions.length}</span>
								</div>
								{view.sleepWait && (
									<div className="narrative-player__wait-actions">
										<button
											type="button"
											onClick={() =>
												executeWait(view.sleepWait!.durationMinutes)
											}
										>
											Подождать до {formatMinute(view.sleepWait.targetMinuteOfDay)}
										</button>
									</div>
								)}
								{view.sleepOptions.length > 0 && (
									<ul className="narrative-player__sleep-options">
										{view.sleepOptions.map(option => (
											<li key={option.id}>
												<button
													type="button"
													onClick={() => executeSleep(option.id)}
												>
													<span>{option.label}</span>
													<small>
														Подъём в {formatMinute(option.wakeMinuteOfDay)}
													</small>
												</button>
											</li>
										))}
									</ul>
								)}
							</section>
						)}

						<section className="narrative-player__panel" aria-labelledby="actions-title">
							<div className="narrative-player__panel-heading">
								<h3 id="actions-title">Действия</h3>
								<span>{view.actions.length}</span>
							</div>
							{view.actions.length === 0 ? (
								<p className="narrative-player__muted">
									Сейчас нет действий, доступных этому персонажу.
								</p>
							) : (
								<ul className="narrative-player__actions">
									{view.actions.map(action => (
										<li key={action.id}>
											<button
												type="button"
												disabled={action.state !== 'ready'}
												onClick={() => executeAction(action.id)}
												data-action-state={action.state}
											>
												<span>{action.label}</span>
												<small>
													{action.dialogue ? 'диалог' : action.storyTitle}
												</small>
											</button>
											{action.state !== 'ready' && (
												<p>
													{actionStateLabel(action.state)}
													{action.state !== 'input-required' &&
													action.summary
														? ` · ${action.summary}`
														: ''}
												</p>
											)}
										</li>
									))}
								</ul>
							)}
						</section>
					</section>

					<aside className="narrative-player__sidebar" aria-label="Состояние игрока">
						<section className="narrative-player__panel">
							<div className="narrative-player__panel-heading">
								<h3>{view.perspective.character.name}</h3>
								<span>состояние</span>
							</div>
							{view.body && (
								<dl className="narrative-player__stats">
									<div>
										<dt>Усталость</dt>
										<dd>{percent(view.body.fatigue)}</dd>
									</div>
									<div>
										<dt>Сытость</dt>
										<dd>{percent(view.body.satiety)}</dd>
									</div>
									<div>
										<dt>Недосып</dt>
										<dd>{Math.round(view.body.sleepDebtMinutes)} мин.</dd>
									</div>
									{view.body.digestionRemainingMinutes > 0 && (
										<div>
											<dt>После еды</dt>
											<dd>{Math.ceil(view.body.digestionRemainingMinutes)} мин.</dd>
										</div>
									)}
								</dl>
							)}
						</section>

						<section className="narrative-player__panel">
							<div className="narrative-player__panel-heading">
								<h3>С собой</h3>
								<span>{view.inventoryItems.length}</span>
							</div>
							{view.inventoryItems.length === 0 ? (
								<p className="narrative-player__muted">Ничего.</p>
							) : (
								<ul className="narrative-player__inventory">
									{view.inventoryItems.map(item => (
										<li key={item.id}>
											<span>{item.name}</span>
											{item.placement === 'contained' && <small>внутри</small>}
										</li>
									))}
								</ul>
							)}
							{view.carryLoad && (
								<p className="narrative-player__footnote">
									Вес: {view.carryLoad.totalWeightKg.toFixed(1)} кг · рук занято:{' '}
									{view.carryLoad.handsOccupied}/2
								</p>
							)}
						</section>

						<section className="narrative-player__panel">
							<div className="narrative-player__panel-heading">
								<h3>Деньги</h3>
								<span>—</span>
							</div>
							<p className="narrative-player__muted">{view.economy.summary}</p>
						</section>
					</aside>
				</div>
			)}
		</main>
	);
};
