const TITLES = {
  week: '이번 주 — 일주일의 파도',
  chart: '흐름 — 월간 그래프',
};

export default function LockedPage({ tab }) {
  return (
    <section className="page on">
      <div
        className="card"
        style={{ textAlign: 'center', padding: '44px 26px' }}
      >
        <div style={{ fontSize: 34, marginBottom: 8 }}>🔒</div>
        <div className="eyebrow">돌아보기</div>
        <h2 className="serif" style={{ fontSize: 22, margin: '10px 0 8px' }}>
          {TITLES[tab] || '이 기능'}은 구독하면 열려요
        </h2>
        <p className="lead" style={{ maxWidth: 460, margin: '0 auto 8px' }}>
          매일 기록하고(<b>오늘</b>) 물때를 예보하는 건(<b>이번 달</b>) 늘
          무료예요. 쌓인 기록을 <b>돌아보는</b> 이번 주·흐름 차트와 전체
          히스토리는 구독으로 열립니다.
        </p>
        <button
          className="btn"
          disabled
          title="결제 준비 중"
          style={{ opacity: 0.7 }}
        >
          구독하기 — 곧 열려요
        </button>
      </div>
    </section>
  );
}
