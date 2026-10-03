export default function GuidePage() {
  return (
    <section className="page on">
      <div className="card">
        <div className="eyebrow">고요수집의 방향성 · 靜中動</div>
        <h2 className="serif" style={{ fontSize: 22, margin: '8px 0 8px' }}>
          몰아침을 없애지 않아요. 그 사이에 고요를 넣습니다
        </h2>
        <p className="lead">
          고요수집은 '더 하기'가 아니라 '고요 넣기'예요. 갓생 트래커가 아니라{' '}
          <b>감각 트래커</b>입니다. 그래서 먼저, 고요가 무엇인지 몸으로
          정의합니다.
        </p>
        <div className="gdef">
          <p className="q">
            고요란, 바깥으로 향하던 주의를 거두어 지금의 몸과 감각으로 돌아오는 시간입니다.
          </p>
          <ul className="cond">
            <li><b>①</b>외부 자극을 잠시 낮추고, 주의를 몸과 지금으로 돌린다</li>
            <li>
              <b>②</b>한 가지에만 머문다 — 걷기든, 읽기든, 설거지든
            </li>
            <li>
              <b>③</b>끝났을 때 숨이 들어올 자리가 넓어져 있다. 식도에서
              콩팥까지, 몸 안의 공간이 아까보다 넓게 느껴진다
            </li>
          </ul>
        </div>
        <p className="lead" style={{ marginTop: 16 }}>
          무엇을 했는지는 중요하지 않습니다. <br />
          몸이 이렇게 대답하면, 그것이 고요였습니다.
          <br /> 걷기·독서·설거지·명상은 고요를 담는 <b>그릇</b>일 뿐이고,
          그릇은 사람마다 다릅니다.
        </p>
      </div>

      <div className="card">
        <div className="eyebrow">이렇게 씁니다</div>
        <h2 className="serif" style={{ fontSize: 20, margin: '8px 0 6px' }}>
          한 달 100분으로, 지속가능한 생산성을
        </h2>
        <p className="lead" style={{ marginBottom: 14 }}>
          몰아침을 없애는 게 아니라, 몸 감각을 <b>메타인지</b>하며 몸 안의
          에너지 저장소를 다시 채웁니다. 본업으로 돌아갔을 떄 진짜 생산성은
          거기서 나와요.
        </p>
        <div className="ghow">
          <div className="gt">
            <div className="gname">이번 달</div>
            <div className="gtime">월초 · 15분</div>
          </div>
          <div className="gbody">
            달력에 매주, 혹은 매달 한 번씩 앞으로 밀려올{' '}
            <b>물리적·정신적 스케줄의 농도</b>를 미리 적어둡니다.
            <br /> 이걸 <b>물때 예보</b>라 불러요. <br />
            날짜를 누를수록 물이 차오르고, 가장 몰아치는 날은 칸의 절반까지
            채워집니다. <br />
            그리고 이 달에 지킬 <b>고요 1~3가지</b>를 정해요. <br />
            아주 사소해도 좋습니다.
            <div className="gex">
              예를 들어 — 샤워할 때 음악 안 듣기 · 커피 마실 때 휴대폰 안 보기 ·
              잠든 아이 얼굴 보기 · 하루 한 번, 시간 상관없이 하늘·구름 보기 ·
              혼자 엘리베이터 탈 때 잠깐 눈 감기.
            </div>
          </div>
        </div>
        <div className="ghow">
          <div className="gt">
            <div className="gname">오늘</div>
            <div className="gtime">매일 · 2분</div>
          </div>
          <div className="gbody">
            매일 입력하는 페이지예요. <br /> 몰아침을 <b>물결 게이지</b>로
            그리고, 실행한 고요 약속을 체크하고, 예상치 못하게{' '}
            <b>찾아온 고요</b>의 순간을 기록합니다. <br />
            고요가 늘 있을 필요는 없어요.
            <br /> 쉴 새 없이 몰아친 날도 그대로 표기해주세요.
          </div>
        </div>
        <div className="ghow">
          <div className="gt">
            <div className="gname">이번 주</div>
            <div className="gtime">주 1회 · 5분</div>
          </div>
          <div className="gbody">
            한 주의 몰아침이 하나의 파도로 이어집니다. <br />
            모임 전, 이번 주에 고요를 <b>몇 번 들였고 몇 번 놓쳤는지</b> 한눈에
            훑어봐요.
          </div>
        </div>
        <div className="ghow">
          <div className="gt">
            <div className="gname">흐름</div>
            <div className="gtime">차트 · 보기만</div>
          </div>
          <div className="gbody">
            쌓인 기록이 그래프가 됩니다.
            <br /> 예보한 몰아침과 실제가 맞았는지,{' '}
            <b>몰아친 주에 고요가 지켜졌는지</b>를 눈으로 확인해요.
          </div>
        </div>
        <div className="gpill">
          고요가 없는 날은 실패가 아니라, 물결의 일부를 만들어요.
        </div>
      </div>

    </section>
  );
}
