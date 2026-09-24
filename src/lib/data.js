// 고요수집 공용 데이터 · 순수 로직 (아티팩트에서 이식)

export const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const startOfWeek = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
};
export const surgeLabel = (v) =>
  v < 25
    ? '잔잔'
    : v < 50
      ? '물결'
      : v < 72
        ? '일렁임'
        : v < 88
          ? '몰아침'
          : '큰 파도';

// forecast_event_types 시드와 같은 값 — DB를 못 불러왔을 때의 폴백, 데모 데이터 생성용
export const FORECAST_EVENT_TYPES = [
  { key: 'deadline', label_ko: '마감', weight: 85, sort_order: 10 },
  { key: 'trip', label_ko: '출장', weight: 60, sort_order: 20 },
  { key: 'kids', label_ko: '아이 일정', weight: 55, sort_order: 30 },
  { key: 'other', label_ko: '기타', weight: 40, sort_order: 40 },
];

// 급증 점수 = 그날 표시된 일정 유형의 weight 합, 100 캡.
// public.v_forecast_score 뷰와 동일한 공식이다.
export const scoreFromEvents = (types, eventTypes) => {
  const weightByType = Object.fromEntries(
    (eventTypes || []).map((t) => [t.key, t.weight]),
  );
  return Math.min(
    100,
    (types || []).reduce((sum, t) => sum + (weightByType[t] || 0), 0),
  );
};

// 정중동 — 매일 랜덤 문구 (50)
export const MSGS = [
  '폭풍의 눈은 폭풍 한가운데 있습니다. 오늘의 눈을 찾아보세요.',
  '고요는 멈춤이 아니라, 움직임 속의 중심입니다.',
  '잔잔한 물에도 물결은 흐릅니다. 아무 일 없는 날은 없어요.',
  '가장 바쁜 손끝에도, 잠깐의 정지가 삽니다.',
  '몰아침을 없앨 순 없지만, 그 사이에 고요를 끼워 넣을 순 있어요.',
  '오늘 몸의 어디가 조이나요? 그 자리에 숨을 보내보세요.',
  '식도에서 콩팥까지, 몸 안의 공간을 한 번 느껴보세요.',
  '고요가 없던 날도, 그 없음을 아는 것이 이미 고요의 시작입니다.',
  '빠르게 흐르는 하루 속, 2분만 물살을 거슬러보세요.',
  '무엇을 했는지가 아니라, 몸이 어떻게 답했는지가 오늘의 기록입니다.',
  '어깨를 1cm 내려보세요. 그게 오늘의 정중동입니다.',
  '고요는 활동이 아니라 상태예요. 그릇은 당신이 고릅니다.',
  '파도가 높은 날일수록, 중심은 더 깊은 곳에 있습니다.',
  '채우기 전에, 오늘은 한 가지를 덜어내 보는 건 어때요.',
  '지금 이 순간, 화면 너머로 숨 한 번.',
  '고요는 크게 오지 않아요. 커피 향 30초에도 있습니다.',
  '몸은 정직합니다. 턱에 힘이 들어갔다면, 그건 신호예요.',
  '멈추면 비로소 들리는 것들이 있어요. 오늘은 무엇이 들리나요.',
  '느리게 가는 것과 멈춘 것은 다릅니다. 오늘은, 느리게.',
  '밀려올 파도를 아는 것만으로, 덜 휩쓸립니다.',
  '완벽한 고요를 찾지 마세요. 틈새의 고요를 모으세요.',
  '조인 뒤엔 풀 자리를 두세요. 긴장과 이완은 한 몸입니다.',
  '오늘의 물결을 그대로 두세요. 판단은 내려놓고, 기록만.',
  '숨이 들어올 자리를, 오늘 한 뼘만 넓혀두세요.',
  '고요는 도착이 아니라 방향이에요. 오늘 그쪽으로 한 걸음.',
  '숨을 참고 있진 않나요? 지금 길게 한 번 내쉬어요.',
  '바쁨은 속도가 아니라 밀도의 문제예요. 오늘의 밀도를 봐요.',
  '몸의 한 곳에 손을 얹어보세요. 거기가 오늘의 시작점이에요.',
  "고요는 '내는' 게 아니라 '들이는' 거예요. 이미 있던 걸 들여요.",
  '잘 쉬는 것도 연습이에요. 오늘은 쉬는 연습을 해요.',
  '몰아침 속에서도 발끝은 땅에 있어요. 그걸 느껴봐요.',
  '생각이 많을 땐 몸으로 내려와요. 머리에서 배로.',
  '고요는 조용함이 아니에요. 시끄러워도 중심이 있으면 고요예요.',
  '오늘 딱 한 번, 아무것도 하지 않는 30초를 가져요.',
  '몸이 보내는 신호는 늦게 오지 않아요. 지금 듣고 있나요?',
  '완벽하게 비우려 하지 마세요. 조금 덜 채우는 걸로 충분해요.',
  '파도는 지나가요. 오늘의 파도도 결국 지나가요.',
  '긴장한 어깨는 미래를 걱정하는 중이에요. 지금으로 돌아와요.',
  '고요는 사치가 아니라 연료예요. 몸의 저장소를 채워요.',
  '천천히 마시는 물 한 잔도 고요가 될 수 있어요.',
  '몸을 다그치지 말고, 오늘은 몸의 속도에 맞춰요.',
  '숨이 얕아졌다면, 그건 몸이 도와달라는 말이에요.',
  '고요를 못 지킨 날도 데이터예요. 그 하루도 소중해요.',
  '지금 이 문장을 읽는 동안, 어깨 힘을 슬쩍 빼봐요.',
  '몸 안에 방 하나를 비워둬요. 숨이 들어올 방.',
  '고요는 혼자만의 것이 아니에요. 잠든 아이 얼굴에도 있어요.',
  '오늘의 몰아침을 미워하지 마세요. 그냥 표시만 해둬요.',
  '정중동 — 멈춘 듯 보여도, 안에서는 흐르고 있어요.',
  '가장 작은 고요부터. 눈 한 번 감았다 뜨기.',
  '몸으로 아는 것은 잊히지 않아요. 오늘도 몸으로 알아가요.',
];

// 몸 감각 3카테고리
export const BODY = {
  tense: {
    label: '조임',
    sub: '긴장·수축',
    cls: 'col-tense',
    dot: 'd-tense',
    items: [
      '어깨가 딱딱',
      '턱에 힘',
      '목 뒤가 뻣뻣',
      '명치 조임',
      '미간 찌푸림',
      '주먹 쥠',
      '호흡이 얕음',
      '위가 딱딱',
      '가슴이 답답',
    ],
  },
  flow: {
    label: '흐름',
    sub: '움직이는 에너지',
    cls: 'col-flow',
    dot: 'd-flow',
    items: [
      '손끝이 저릿',
      '심장이 빨리',
      '다리가 들썩',
      '열이 오름',
      '생각이 질주',
      '말이 빨라짐',
      '안절부절',
      '배가 간질',
    ],
  },
  ease: {
    label: '풀림',
    sub: '돌아온 감각',
    cls: 'col-ease',
    dot: 'd-ease',
    items: [
      '어깨가 내려감',
      '숨이 깊어짐',
      '배가 따뜻함',
      '식도에서 콩팥까지 넓어짐',
      '턱이 느슨',
      '눈이 부드러움',
      '몸이 노곤',
      '발바닥이 땅에',
    ],
  },
};

// 찾아온 고요 — 그때 몸의 응답 (객관식)
export const MET_FEEL = [
  '숨이 트였다',
  '어깨가 내려갔다',
  '속이 따뜻해졌다',
  '머리가 조용해졌다',
  '시간이 느려졌다',
  '잘 모르겠다',
];

// 분석용 일상 니즈와 해결감 선택지
export const NEEDS = [
  '숨 돌릴 틈',
  '몸의 긴장 풀기',
  '생각 정리',
  '집중 회복',
  '감정 가라앉히기',
  '관계에서 거리두기',
  '잠과 회복',
];
export const SOLUTION_SCORES = [
  '전혀 아니었다',
  '조금 나아졌다',
  '반쯤 풀렸다',
  '꽤 해결됐다',
  '분명히 해결됐다',
];

// 데모용 한 달치 샘플 (2026-08)
export function demoSeed() {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const s = {
    promises: [
      '아침에 창밖 5분 보기',
      '설거지하며 물소리만 듣기',
      '자기 전 폰 끄고 3분 눕기',
    ],
    forecast: {},
    forecastEvents: {},
    entries: {},
  };
  const Y = 2026,
    M = 7,
    days = new Date(Y, M + 1, 0).getDate(),
    surgeWeeks = [
      [11, 15],
      [25, 29],
    ];
  const EVENTS_BY_TIER = { 1: ['other'], 2: ['trip'], 3: ['deadline'], 4: ['deadline', 'trip'] };
  for (let d = 1; d <= days; d++) {
    const key = `${Y}-${pad(M + 1)}-${pad(d)}`;
    let tier = 1;
    surgeWeeks.forEach(([a, b]) => {
      if (d >= a && d <= b) tier = d === a || d === b ? 3 : 4;
      else if (d === a - 1 || d === b + 1) tier = Math.max(tier, 2);
    });
    s.forecastEvents[key] = EVENTS_BY_TIER[tier];
    s.forecast[key] = scoreFromEvents(EVENTS_BY_TIER[tier], FORECAST_EVENT_TYPES);
  }
  for (let d = 1; d <= 30; d++) {
    const key = `${Y}-${pad(M + 1)}-${pad(d)}`;
    const f = s.forecast[key];
    let surge =
      f >= 100
        ? rnd(72, 92)
        : f >= 85
          ? rnd(55, 72)
          : f >= 60
            ? rnd(38, 54)
            : rnd(14, 40);
    const heavy = f >= 100;
    const none = heavy ? Math.random() < 0.5 : Math.random() < 0.12;
    let kept = [],
      met = null,
      body = [];
    if (none) {
      body = [BODY.tense.items[rnd(0, 4)]];
      if (f >= 85) body.push(BODY.flow.items[rnd(0, 4)]);
    } else {
      const nk = f >= 100 ? rnd(0, 1) : f >= 85 ? rnd(1, 2) : rnd(1, 3);
      body = [];
      kept = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, nk);
      if (!heavy && Math.random() < 0.55) {
        const moments = [
          '빨래 개며 손끝만 보기',
          '엘리베이터에서 눈 감기',
          '커피 향에 30초',
          '비 오는 창가',
          '산책 중 발소리만',
          '설거지 물소리',
          '아이 잠든 얼굴 보기',
        ];
        met = {
          moment: moments[rnd(0, moments.length - 1)],
          min: rnd(3, 25),
          feel: [],
        };
      }
      if (f <= 60) {
        body = [BODY.ease.items[rnd(0, 5)]];
        if (Math.random() < 0.5) body.push(BODY.ease.items[rnd(0, 5)]);
      } else {
        body = [BODY.flow.items[rnd(0, 4)]];
        if (Math.random() < 0.6) body.push(BODY.tense.items[rnd(0, 4)]);
        if (Math.random() < 0.4) body.push(BODY.ease.items[rnd(0, 4)]);
      }
    }
    body = [...new Set(body)];
    s.entries[key] = { surge, kept, met, body, none };
  }
  return s;
}
