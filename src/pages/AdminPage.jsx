import { useEffect, useState } from 'react';
import * as store from '../lib/store';

export default function AdminPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    store
      .adminOverview()
      .then(setRows)
      .catch((e) => setErr(e.message || '불러오지 못했어요.'));
  }, []);

  async function exportCsv() {
    const entries = await store.adminAllEntries();
    const byId = {};
    (rows || []).forEach((r) => (byId[r.id] = r.nickname));
    const head = [
      'nickname',
      'user_id',
      'date',
      'surge',
      'none',
      'kept_count',
      'encounter_minutes',
      'encounter_count',
      'tight_count',
      'release_count',
    ];
    const lines = [head.join(',')];
    entries.forEach((e) => {
      const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      lines.push(
        [
          cell(byId[e.user_id] || ''),
          cell(e.user_id),
          cell(e.local_date),
          e.surge,
          e.no_stillness,
          e.kept_count || 0,
          e.encounter_minutes || 0,
          e.encounter_count || 0,
          e.tight_count || 0,
          e.release_count || 0,
        ].join(','),
      );
    });
    const blob = new Blob(['﻿' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'goyosujip-entries.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="page on">
      <div className="card">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="eyebrow">관리자</div>
            <h2 className="serif" style={{ fontSize: 20, margin: '8px 0 2px' }}>
              참가자 한눈에 보기
            </h2>
          </div>
          <button
            className="btn ghost"
            style={{ marginLeft: 'auto', padding: '9px 16px', fontSize: 13.5 }}
            onClick={exportCsv}
          >
            CSV 내려받기
          </button>
        </div>

        {err && (
          <div className="autherr" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}
        {!rows && !err && (
          <p className="muted" style={{ marginTop: 16 }}>
            불러오는 중…
          </p>
        )}

        {rows && (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table className="dtable">
              <thead>
                <tr>
                  <th>닉네임</th>
                  <th>가입</th>
                  <th>기록일수</th>
                  <th>평균 몰아침</th>
                  <th>들인 고요</th>
                  <th>찾아온(분)</th>
                  <th>고요 없던 날</th>
                  <th>마지막 기록</th>
                  <th>구독</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.nickname}</b>
                    </td>
                    <td className="muted">{r.joined}</td>
                    <td>{r.days}일</td>
                    <td>{r.avgSurge}%</td>
                    <td>{r.keptTotal}번</td>
                    <td>{r.metMin}분</td>
                    <td>{r.noneDays}일</td>
                    <td className="muted">{r.lastEntry}</td>
                    <td>{r.subscribed ? '✓' : '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="muted"
                      style={{ textAlign: 'center', padding: 20 }}
                    >
                      아직 참가자가 없어요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="authnote" style={{ marginTop: 16, textAlign: 'left' }}>
          참가자별 상세 기록은 CSV로 내려받아 보거나, Supabase 대시보드의{' '}
          <code>entries</code> 테이블에서 볼 수 있어요. 구독을 열어주려면{' '}
          <code>profiles.subscribed</code>를 true로 바꾸세요(README 참고).
        </p>
      </div>
    </section>
  );
}
