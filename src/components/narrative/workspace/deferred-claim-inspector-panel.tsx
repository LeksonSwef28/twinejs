import * as React from 'react';
import {
	createDeferredClaimInspectorSnapshot,
	DeferredClaimInspectorEntry
} from '../../../application/narrative/deferred-claim-inspector';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {NarrativeProject} from '../../../domain/narrative/project';

export interface DeferredClaimInspectorPanelProps {
	project: NarrativeProject;
}

function momentLabel(moment: {day: number; minuteOfDay: number}) {
	return `\`День \${moment.day} · \${formatMinuteOfDay(moment.minuteOfDay)}\``;
}

function expiryLabel(reason: DeferredClaimInspectorEntry['reason']) {
	switch (reason) {
		case 'past-project-end':
			return 'Срок за пределами истории: Claim не доставлен.';
		case 'missing-definition':
			return 'Исходный Outcome или эффект отсутствует либо не соответствует событию.';
		case 'changed-definition':
			return 'Исходная настройка изменилась после постановки события.';
		case 'missing-reference':
			return 'Отсутствует персонаж, Claim или исходная сцена.';
		case 'unverifiable-definition':
			return 'Старая запись: исходную настройку нельзя подтвердить.';
		default:
			return 'Причина отказа не записана.';
	}
}

function EventRow({event}: {event: DeferredClaimInspectorEntry}) {
	const verified = event.definitionState === 'current';
	return (
		<li>
			<strong>
				{verified && event.recipientName && event.claimText
					? `\`\${event.recipientName} · «\${event.claimText}»\``
					: 'Исходные получатель и Claim не подтверждены'}
			</strong>
			<div>Срок: {momentLabel(event.dueMoment)} · {event.status === 'scheduled'
				? event.overdue ? 'Срок прошёл, ожидает шага симуляции' : 'Ожидается'
				: event.status === 'applied' ? 'Исполнено' : 'Отклонено'}</div>
			{event.scheduledAt && <div>После выбора: {momentLabel(event.scheduledAt)}</div>}
			{event.completedAt && <div>Запись результата: {momentLabel(event.completedAt)}</div>}
			{verified ? (
				<div>Причина: {event.storyTitle} · {event.moveLabel} → {event.outcomeLabel}.
					Источник: {event.sourceLabel ?? 'неизвестен'}.</div>
			) : (
				<p className="simulation-debug__hint">
					{event.definitionState === 'legacy-unverifiable'
						? 'В старой записи нет снимка исходного эффекта; текущие имена и Claim могли измениться.'
						: 'Настройка или ссылки изменились; текущие данные нельзя считать первоначальными.'}
				</p>
			)}
			{event.status === 'expired' && <p>{expiryLabel(event.reason)}</p>}
			<details>
				<summary>Техническая причина и идентификаторы</summary>
				<dl>
					<dt>Story</dt><dd><code>{event.storyNodeId}</code></dd>
					<dt>Move</dt><dd><code>{event.moveId}</code></dd>
					<dt>Outcome</dt><dd><code>{event.outcomeId}</code></dd>
					<dt>Effect</dt><dd><code>{event.effectId}</code></dd>
					<dt>Причинное событие</dt><dd><code>{event.causeOccurrenceId}</code></dd>
					<dt>Запись журнала</dt><dd><code>{event.id}</code></dd>
				</dl>
			</details>
		</li>
	);
}

/** A86: inspection only. Does not call runtime commands, edit effects or move the Playhead. */
export const DeferredClaimInspectorPanel: React.FC<DeferredClaimInspectorPanelProps> = ({
	project
}) => {
	const snapshot = React.useMemo(() => createDeferredClaimInspectorSnapshot(project), [project]);
	return (
		<section className="simulation-debug__card is-wide" aria-label="Отложенные Claim-события">
			<h3>Отложенные знания · Claim</h3>
			<p className="simulation-debug__hint">
				Здесь показаны последствия реально сделанных выборов, а не календарь авторских сцен.
				Просмотр не изменяет время и состояние истории. Отмена и перенос пока недоступны.
			</p>
			<details open>
				<summary>Ожидают · {snapshot.pendingTotal}</summary>
				{snapshot.pendingTotal === 0 ? <p className="simulation-debug__empty">Ожидающих событий нет.</p> : (
					<ol>{snapshot.pending.map(event => <EventRow key={event.id} event={event} />)}</ol>
				)}
				{snapshot.pendingTotal > snapshot.pending.length &&
					<p className="simulation-debug__hint">Показаны первые {snapshot.pending.length} из {snapshot.pendingTotal} по сроку.</p>}
			</details>
			<details>
				<summary>Завершены · {snapshot.appliedTotal} исполнено / {snapshot.expiredTotal} отклонено</summary>
				{snapshot.appliedTotal + snapshot.expiredTotal === 0 ? (
					<p className="simulation-debug__empty">Завершённых событий ещё нет.</p>
				) : (
					<ol>{snapshot.completed.map(event => <EventRow key={event.id} event={event} />)}</ol>
				)}
				{snapshot.appliedTotal + snapshot.expiredTotal > snapshot.completed.length &&
					<p className="simulation-debug__hint">Показаны последние {snapshot.completed.length} из {snapshot.appliedTotal + snapshot.expiredTotal}.</p>}
			</details>
		</section>
	);
};
