import { useEffect, useMemo, useState } from 'react';
import * as store from '../lib/store';
import { SOLUTION_SCORES } from '../lib/data';

const CATEGORY_LABELS = {
  tight: '조임',
  flow: '흐름',
  release: '풀림',
  ease: '풀림',
};

function countValues(rows, selector) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = selector(row);
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function Metric({ label, value, detail }) {
  return (
    <div className="admin-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function FrequencyList({ title, rows, empty = '아직 기록이 없습니다.' }) {
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return (
    <section className="admin-analysis-section">
      <h3>{title}</h3>
      {rows.length ? (
        <div className="admin-frequency-list">
          {rows.map(([label, count]) => (
            <div className="admin-frequency-row" key={label}>
              <span className="admin-frequency-label" title={label}>
                {label}
              </span>
              <span className="admin-frequency-track">
                <i style={{ width: `${Math.max(5, (count / max) * 100)}%` }} />
              </span>
              <b>{count}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

export default function AdminPage() {
  const [dataset, setDataset] = useState(null);
  const [selectedUser, setSelectedUser] = useState('all');
  const [error, setError] = useState('');
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => {
    store
      .adminResearchDataset()
      .then(setDataset)
      .catch((reason) =>
        setError(reason.message || '관리자 데이터를 불러오지 못했어요.'),
      );
  }, []);

  const analysis = useMemo(() => {
    if (!dataset) return null;
    const { profiles, entries, promises } = dataset;
    const sensations = entries.flatMap((entry) =>
      entry.sensations.map((item) => ({
        ...item,
        nickname: entry.nickname,
        local_date: entry.local_date,
      })),
    );
    const encounters = entries.flatMap((entry) =>
      entry.encounters.map((item) => ({
        ...item,
        nickname: entry.nickname,
        local_date: entry.local_date,
      })),
    );
    const observedEntries = entries.filter((entry) => entry.observation);
    const noStillness = entries.filter((entry) => entry.no_stillness).length;
    const surgeValues = entries
      .filter((entry) => Number.isFinite(entry.surge))
      .map((entry) => entry.surge);
    const promiseGroups = new Map();
    promises.forEach((promise) => {
      const key = `${promise.user_id}:${promise.month}:${promise.text_raw.trim().toLocaleLowerCase('ko-KR')}`;
      const group = promiseGroups.get(key) || {
        ...promise,
        promiseIds: new Set(),
      };
      group.promiseIds.add(promise.id);
      if (promise.is_active) group.is_active = true;
      promiseGroups.set(key, group);
    });
    const promiseStats = [...promiseGroups.values()]
      .map((promise) => {
        const loggedEntries = entries.filter(
          (entry) =>
            entry.user_id === promise.user_id &&
            entry.local_date.startsWith(promise.month.slice(0, 7)),
        );
        const keptEntries = loggedEntries.filter((entry) =>
          entry.promises.some(
            (item) => promise.promiseIds.has(item.id) && item.done,
          ),
        );
        return {
          ...promise,
          nickname:
            profiles.find((profile) => profile.id === promise.user_id)
              ?.nickname || '알 수 없음',
          loggedDays: loggedEntries.length,
          keptDays: keptEntries.length,
          keptDates: keptEntries.map((entry) => entry.local_date.slice(5)),
        };
      })
      .filter((promise) => promise.loggedDays > 0);

    return {
      profiles,
      entries,
      scheduleEventCount: entries.reduce(
        (sum, entry) => sum + entry.forecastEvents.length,
        0,
      ),
      sensations,
      encounters,
      observedEntries,
      noStillness,
      averageSurge: surgeValues.length
        ? Math.round(
            surgeValues.reduce((sum, value) => sum + value, 0) /
              surgeValues.length,
          )
        : 0,
      categoryCounts: countValues(
        sensations,
        (item) => CATEGORY_LABELS[item.category] || item.category,
      ),
      sensationCounts: countValues(
        sensations,
        (item) => item.text_raw || item.option_key,
      ),
      needCounts: countValues(
        observedEntries.flatMap((entry) => entry.observation.needs || []),
        (item) => item,
      ),
      desiredChanges: countValues(observedEntries, (entry) =>
        entry.observation.desiredCalm?.trim(),
      ),
      solutionCounts: countValues(observedEntries, (entry) => {
        const score = Number(entry.observation.solutionScore);
        return score ? `${score} · ${SOLUTION_SCORES[score - 1] || ''}` : null;
      }),
      bodyResponses: countValues(
        encounters.flatMap((encounter) => encounter.responses),
        (item) => item,
      ),
      unexpectedCalm: countValues(
        encounters,
        (encounter) => encounter.text_raw,
      ),
      promiseStats,
    };
  }, [dataset]);

  const visibleEntries = useMemo(() => {
    if (!analysis) return [];
    return selectedUser === 'all'
      ? analysis.entries
      : analysis.entries.filter((entry) => entry.user_id === selectedUser);
  }, [analysis, selectedUser]);

  function exportCsv() {
    if (!analysis) return;
    const consentedProfiles = analysis.profiles.filter(
      (profile) => profile.research_consent,
    );
    if (!consentedProfiles.length) {
      setExportNotice(
        '연구 데이터 내보내기에는 참가자의 연구 동의가 필요합니다. 동의한 참가자가 아직 없습니다.',
      );
      return;
    }
    setExportNotice('연구 동의한 참가자의 가명 데이터만 내보냅니다.');
    const consentedIds = new Set(
      consentedProfiles.map((profile) => profile.id),
    );
    const profilesById = Object.fromEntries(
      consentedProfiles.map((profile) => [profile.id, profile]),
    );
    const headings = [
      'nickname',
      'analysis_id',
      'local_date',
      'forecast_percent',
      'forecast_events',
      'surge_percent',
      'no_stillness',
      'day_note',
      'body_tight',
      'body_flow',
      'body_release',
      'kept_promises',
      'missed_promises',
      'unexpected_calm',
      'calm_minutes',
      'body_responses',
      'needs',
      'desired_change',
      'solution_score',
    ];
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [headings.join(',')];
    analysis.entries
      .filter((entry) => consentedIds.has(entry.user_id))
      .forEach((entry) => {
        const profile = profilesById[entry.user_id] || {};
        const categoryValues = (category) =>
          entry.sensations
            .filter(
              (item) =>
                item.category === category ||
                (category === 'release' && item.category === 'ease'),
            )
            .map((item) => item.text_raw || item.option_key)
            .join(' | ');
        const kept = entry.promises
          .filter((item) => item.done)
          .map((item) => item.text_raw)
          .join(' | ');
        const missed = entry.promises
          .filter((item) => !item.done)
          .map((item) => item.text_raw)
          .join(' | ');
        lines.push(
          [
            escape(entry.nickname),
            escape(profile.analysis_id),
            escape(entry.local_date),
            entry.forecastScore ?? '',
            escape(
              entry.forecastEvents
                .map((item) =>
                  item.note ? `${item.label}: ${item.note}` : item.label,
                )
                .join(' | '),
            ),
            entry.surge ?? '',
            entry.no_stillness,
            escape(entry.day_note),
            escape(categoryValues('tight')),
            escape(categoryValues('flow')),
            escape(categoryValues('release')),
            escape(kept),
            escape(missed),
            escape(entry.encounters.map((item) => item.text_raw).join(' | ')),
            entry.encounters.reduce(
              (sum, item) => sum + (item.minutes || 0),
              0,
            ),
            escape(
              entry.encounters.flatMap((item) => item.responses).join(' | '),
            ),
            escape((entry.observation?.needs || []).join(' | ')),
            escape(entry.observation?.desiredCalm),
            entry.observation?.solutionScore ?? '',
          ].join(','),
        );
      });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'goyosujip-research-daily.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (error)
    return (
      <section className="page on">
        <div className="autherr">{error}</div>
      </section>
    );
  if (!analysis)
    return (
      <section className="page on">
        <p className="muted">관리자 분석 데이터를 불러오는 중…</p>
      </section>
    );

  return (
    <section className="page on admin-page">
      <div className="admin-page-header">
        <div>
          <div className="eyebrow">운영 · 데이터 탐색</div>
          <h2 className="serif">참가자의 기록과 몸의 신호</h2>
        </div>
        <button className="btn ghost admin-export" onClick={exportCsv}>
          가명 CSV 내보내기
        </button>
      </div>
      {exportNotice && (
        <p className="admin-export-notice" role="status">
          {exportNotice}
        </p>
      )}

      <div className="admin-metrics">
        <Metric label="참가자" value={analysis.profiles.length} />
        <Metric label="일일 기록" value={analysis.entries.length} />
        <Metric label="평균 몰아침" value={`${analysis.averageSurge}%`} />
        <Metric label="예보한 일정" value={analysis.scheduleEventCount} />
        <Metric
          label="고요 없던 기록"
          value={analysis.noStillness}
          detail={`${analysis.entries.length ? Math.round((analysis.noStillness / analysis.entries.length) * 100) : 0}% of logged days`}
        />
        <Metric
          label="뜻밖의 고요"
          value={analysis.encounters.length}
          detail={`${analysis.encounters.reduce((sum, item) => sum + (item.minutes || 0), 0)}분 기록`}
        />
      </div>

      <div className="admin-analysis-grid">
        <FrequencyList title="몸 감각의 결" rows={analysis.categoryCounts} />
        <FrequencyList
          title="자주 기록한 몸 감각"
          rows={analysis.sensationCounts.slice(0, 10)}
        />
        <FrequencyList title="오늘 필요한 변화" rows={analysis.needCounts} />
        <FrequencyList
          title="어떤 도움을 원하는가 (직접 응답)"
          rows={analysis.desiredChanges}
        />
        <FrequencyList title="해결감 응답" rows={analysis.solutionCounts} />
        <FrequencyList
          title="뜻밖에 찾아온 고요"
          rows={analysis.unexpectedCalm.slice(0, 8)}
        />
        <FrequencyList
          title="고요 뒤 몸의 응답"
          rows={analysis.bodyResponses}
        />
      </div>

      <section className="admin-analysis-section admin-promises">
        <h3>월간 고요 약속을 얼마나 지켰나</h3>
        {analysis.promiseStats.length ? (
          <div className="admin-table-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>참가자</th>
                  <th>약속</th>
                  <th>약속 월</th>
                  <th>실천한 날짜</th>
                  <th>지킨 날 / 기록일</th>
                  <th>실천률</th>
                </tr>
              </thead>
              <tbody>
                {analysis.promiseStats.map((promise) => (
                  <tr
                    key={`${promise.user_id}:${promise.month}:${promise.text_raw}`}
                  >
                    <td>{promise.nickname}</td>
                    <td>{promise.text_raw}</td>
                    <td>{promise.month.slice(0, 7)}</td>
                    <td>
                      {promise.keptDates.length
                        ? promise.keptDates
                            .map((date) => `${Number(date.slice(0, 2))}일`)
                            .join(', ')
                        : '—'}
                    </td>
                    <td>
                      {promise.keptDays} / {promise.loggedDays}
                    </td>
                    <td>
                      {Math.round(
                        (promise.keptDays / promise.loggedDays) * 100,
                      )}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">아직 약속과 일일 기록이 함께 쌓이지 않았어요.</p>
        )}
      </section>

      <section className="admin-analysis-section">
        <div className="admin-detail-header">
          <div>
            <h3>참가자별 날짜 기록</h3>
            <p className="muted">
              현지 날짜, 몰아침, 메모, 몸 감각, 실천한 약속, 뜻밖의 고요와
              니즈를 날짜별로 확인합니다.
            </p>
          </div>
          <select
            aria-label="참가자 선택"
            value={selectedUser}
            onChange={(event) => setSelectedUser(event.target.value)}
          >
            <option value="all">전체 참가자</option>
            {analysis.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.nickname}
              </option>
            ))}
          </select>
        </div>
        {visibleEntries.length ? (
          <div className="admin-entry-list">
            {visibleEntries.map((entry) => (
              <details className="admin-entry" key={entry.id}>
                <summary>
                  <b>{entry.nickname}</b>
                  <span>{entry.local_date}</span>
                  <span>
                    예보 {entry.forecastScore ?? '—'}% → 실제{' '}
                    {entry.surge ?? '—'}%
                  </span>
                  <span>
                    {entry.no_stillness
                      ? '고요 없음'
                      : `몸 감각 ${entry.sensations.length}개`}
                  </span>
                </summary>
                <div className="admin-entry-details">
                  <p>
                    <b>예보한 일정:</b>{' '}
                    {entry.forecastEvents.length
                      ? entry.forecastEvents
                          .map((item) =>
                            item.note
                              ? `${item.label} (${item.note})`
                              : item.label,
                          )
                          .join(' · ')
                      : '일정 없음'}
                  </p>
                  {entry.day_note && (
                    <p>
                      <b>오늘 있었던 일:</b> {entry.day_note}
                    </p>
                  )}
                  <p>
                    <b>고요 없음:</b> {entry.no_stillness ? '예' : '아니오'}
                  </p>
                  <p>
                    <b>몸 감각:</b>{' '}
                    {entry.sensations.length
                      ? entry.sensations
                          .map(
                            (item) =>
                              `${CATEGORY_LABELS[item.category] || item.category}: ${item.text_raw || item.option_key}`,
                          )
                          .join(' · ')
                      : '기록 없음'}
                  </p>
                  <p>
                    <b>들인 고요:</b>{' '}
                    {entry.promises
                      .filter((item) => item.done)
                      .map((item) => item.text_raw)
                      .join(' · ') || '없음'}
                  </p>
                  <p>
                    <b>이번 달 약속 중 미실천:</b>{' '}
                    {entry.promises
                      .filter((item) => !item.done)
                      .map((item) => item.text_raw)
                      .join(' · ') || '없음'}
                  </p>
                  {entry.encounters.map((encounter) => (
                    <p key={encounter.id}>
                      <b>뜻밖에 찾아온 고요:</b> {encounter.text_raw} (
                      {encounter.minutes || 0}분)
                      {encounter.responses.length
                        ? ` · 몸의 응답: ${encounter.responses.join(', ')}`
                        : ''}
                    </p>
                  ))}
                  {entry.observation && (
                    <p>
                      <b>필요했던 변화:</b>{' '}
                      {(entry.observation.needs || []).join(' · ') ||
                        '선택 없음'}
                      {entry.observation.desiredCalm
                        ? ` · 바람: ${entry.observation.desiredCalm}`
                        : ''}
                      {entry.observation.solutionScore
                        ? ` · 해결감 ${entry.observation.solutionScore}/5`
                        : ''}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="muted">
            선택한 범위에 아직 저장된 일일 기록이 없습니다.
          </p>
        )}
      </section>

      <section className="admin-analysis-section">
        <h3>동의·참여 상태</h3>
        <div className="admin-table-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>닉네임</th>
                <th>코호트</th>
                <th>가입</th>
                <th>연구 동의</th>
                <th>이메일 계정 전환</th>
              </tr>
            </thead>
            <tbody>
              {analysis.profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <b>{profile.nickname}</b>
                  </td>
                  <td>{profile.cohort || '—'}</td>
                  <td>{profile.created_at.slice(0, 10)}</td>
                  <td>{profile.research_consent ? '동의' : '미동의'}</td>
                  <td>{profile.is_anonymous ? '익명' : '이메일 계정'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="authnote">
        관리자 화면은 참가자별 기록을 운영 목적으로 보여줍니다. 연구 CSV는 연구
        동의한 참가자만 포함하며 이메일 대신 가명 분석 ID를 사용합니다. 몸
        감각과 자유 응답은 민감할 수 있으니 동의 범위와 보관 기준에 맞춰
        다뤄주세요.
      </p>
    </section>
  );
}
