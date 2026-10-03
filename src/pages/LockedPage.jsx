const TITLES = {
  week: '이번 주 — 일주일의 파도',
  chart: '흐름 — 월간 그래프',
};

function WeekPreview() {
  const heights = [38, 62, 48, 82, 54, 72, 44];
  return (
    <div className="week-preview-art" aria-hidden="true">
      <div className="preview-wave">
        <svg viewBox="0 0 640 170" preserveAspectRatio="none">
          <path d="M0 118 C55 96 68 65 125 80 S210 136 270 97 350 47 410 82 500 133 560 82 610 61 640 70" />
          <path
            className="preview-wave-secondary"
            d="M0 139 C65 128 95 104 150 112 S250 146 310 119 395 95 450 112 555 145 640 116"
          />
        </svg>
      </div>
      <div className="preview-week-days">
        {heights.map((height, index) => (
          <div className="preview-day" key={index}>
            <span>{['일', '월', '화', '수', '목', '금', '토'][index]}</span>
            <i style={{ height: `${height}%` }} />
            <b />
          </div>
        ))}
      </div>
      <div className="preview-stats">
        <div>
          <i />
          기록한 날
        </div>
        <div>
          <i />
          들인 고요
        </div>
        <div>
          <i />
          평균 몰아침
        </div>
      </div>
    </div>
  );
}

function ChartPreview() {
  return (
    <div className="chart-preview-art" aria-hidden="true">
      <div className="preview-chart-grid">
        {[0, 1, 2, 3].map((line) => (
          <i key={line} />
        ))}
        <svg viewBox="0 0 640 230" preserveAspectRatio="none">
          <path
            className="preview-chart-forecast"
            d="M0 175 C70 150 82 90 150 110 S230 164 300 100 390 72 445 115 535 174 590 93 620 85 640 67"
          />
          <path
            className="preview-chart-actual"
            d="M0 192 C48 170 90 135 145 142 S220 78 282 111 360 182 423 133 500 64 555 103 610 135 640 91"
          />
        </svg>
      </div>
      <div className="preview-chart-legend">
        <i /> 실제 몰아침 <i /> 예보 <i /> 고요
      </div>
      <div className="preview-insight" />
    </div>
  );
}

export default function LockedPage({ tab, pilot = false }) {
  const title = TITLES[tab] || '이 기능';
  return (
    <section className="page on">
      <div className="card locked-page">
        <div className="eyebrow">{pilot ? '2주 실험실' : '돌아보기'}</div>
        <div className="locked-heading">
          <div>
            <h2 className="serif">{title}</h2>
            <p className="lead">
              {pilot
                ? '이번 주와 흐름은 곧 런칭됩니다. 지금은 오늘과 이번 달 기록을 이용해주세요.'
                : '구독하면 쌓인 기록의 주간 흐름과 월간 차트를 확인할 수 있어요.'}
            </p>
          </div>
          <span className="coming-label">
            {pilot ? '곧 런칭' : '구독 기능'}
          </span>
        </div>
        <div className="locked-preview" aria-label={`${title} 화면 미리보기`}>
          {tab === 'week' ? <WeekPreview /> : <ChartPreview />}
          <div className="preview-overlay">
            <span>{pilot ? '곧 런칭' : '미리보기'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
