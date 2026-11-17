/* J 메이커 — 오늘만 J가 되어보자
   순수 JS(빌드 없음). 시간은 Date.now() 타임스탬프로 계산하므로 탭이 잠시 멈춰도 오차가 쌓이지 않습니다. */
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const layer = $('#layer');
  const ICON = window.JM_ICON || 'icons/icon-192.png';
  const MEDIA = window.JM_MEDIA || {};

  /* ------------------------------------------------------------------ 저장소 */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('jm.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('jm.' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
    del(k) { try { localStorage.removeItem('jm.' + k); } catch (e) { /* noop */ } },
  };
  // 사용자가 올린 영상·이미지는 용량이 커서 IndexedDB에 둡니다.
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        try {
          const q = indexedDB.open('jmaker', 1);
          q.onupgradeneeded = () => q.result.createObjectStore('media');
          q.onsuccess = () => { this.db = q.result; res(this.db); };
          q.onerror = () => rej(q.error);
        } catch (e) { rej(e); }
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('media', mode); const st = t.objectStore('media');
        const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error);
      });
    },
    get(k) { return this.tx('readonly', (s) => s.get(k)); },
    put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)); },
    del(k) { return this.tx('readwrite', (s) => s.delete(k)); },
    keys() { return this.tx('readonly', (s) => s.getAllKeys()); },
  };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ------------------------------------------------------------------ 행동 라이브러리 */
  const LIB = [
    { e: '🚿', m: 'shower', l: '샤워' }, { e: '🧼', m: 'wash', l: '세수' }, { e: '🪥', m: 'brush', l: '양치' },
    { e: '🧴', m: 'spray', l: '스킨케어' }, { e: '💄', m: 'makeup', l: '메이크업' }, { e: '💇‍♀️', m: 'dry', l: '머리 말리기' },
    { e: '👕', m: 'dress', l: '옷 입기' }, { e: '👟', m: 'run', l: '신발·출발' }, { e: '🏃‍♀️', m: 'run', l: '뛰기' },
    { e: '🧽', m: 'scrub', l: '닦기' }, { e: '🚽', m: 'scrub', l: '변기' }, { e: '🧹', m: 'scrub', l: '쓸기·청소기' },
    { e: '🪟', m: 'dry', l: '환기' }, { e: '🎒', m: 'pack', l: '가방·짐' }, { e: '🧺', m: 'pack', l: '정리' },
    { e: '🗑️', m: 'pack', l: '쓰레기' }, { e: '🍚', m: 'eat', l: '식사' }, { e: '🍳', m: 'eat', l: '요리' },
    { e: '🧘‍♀️', m: 'stretch', l: '스트레칭' }, { e: '🛌', m: 'rest', l: '눕기' }, { e: '👧', m: 'dress', l: '아이 챙기기' },
    { e: '📚', m: 'generic', l: '공부' }, { e: '💻', m: 'generic', l: '업무' }, { e: '⏱️', m: 'generic', l: '기타' },
  ];
  const KEYWORDS = [
    [/청소기/, '🧹'], [/샤워|목욕|머리 ?감/, '🚿'], [/양치/, '🪥'], [/세수|고양이/, '🧼'],
    [/선크림|스킨|로션|세제/, '🧴'], [/화장|메이크업/, '💄'], [/말리|드라이/, '💇‍♀️'], [/환기|창문/, '🪟'],
    [/변기|세면대/, '🚽'], [/닦|솔질|청소|걸레/, '🧽'], [/쓸|먼지/, '🧹'], [/신발/, '👟'],
    [/뛰|달리|출발|나가/, '🏃‍♀️'], [/아이|등원/, '👧'], [/옷|입히|입기|입고/, '👕'], [/짐|가방|챙기/, '🎒'],
    [/쓰레기|영수증|버리/, '🗑️'], [/정리|제자리|외투/, '🧺'], [/식사|밥|먹/, '🍚'], [/요리/, '🍳'],
    [/스트레칭|요가|운동/, '🧘‍♀️'], [/누워|눕|잠|침대|자기/, '🛌'], [/공부|책|독서/, '📚'], [/업무|메일|일하/, '💻'],
  ];
  // 예전 버전에서 저장된 이모지도 같은 동작으로 인식
  const ALIAS = { '🏃': 'run', '🧘': 'stretch', '💨': 'dry', '🧒': 'dress', '🏃‍♂️': 'run', '🧘‍♂️': 'stretch', '💇': 'dry' };
  const motionOf = (emoji) => (LIB.find((x) => x.e === emoji) || { m: ALIAS[emoji] || 'generic' }).m;
  const guessEmoji = (name) => { for (const [re, e] of KEYWORDS) if (re.test(name)) return e; return '⏱️'; };
  const PARTICLES = {
    shower: ['drop', 14], wash: ['bub', 10], brush: ['bub', 6], spray: ['bub', 8], scrub: ['spark', 6],
    makeup: ['spark', 4], dry: ['wind', 5], run: ['dust', 3], rest: ['z', 3], stretch: ['spark', 3], dress: ['spark', 2],
  };

  /* ------------------------------------------------------------------ 프리셋 */
  const S = (name, min, e) => ({ id: uid(), name, min, emoji: e, motion: motionOf(e) });
  const PRESETS = () => [
    { id: 'p-late15', name: '지각 위기 15분 컷', deadline: null,
      startLine: '지각 위기 15분 컷 가동. 생각은 버스에서 하세요. 당장 세면대로!',
      endLine: '15분 컷 성공! 지금 뛰면 아직 안 늦었습니다. 출발!',
      steps: [S('고양이 세수', 3, '🧼'), S('퀵 메이크업 · 선크림', 7, '💄'), S('옷 꿰어 입고 뛰기', 5, '🏃‍♀️')] },
    { id: 'p-morning30', name: '아침 30분 컷 출근 준비', deadline: '08:30',
      startLine: 'J 메이커 가동. 30분 뒤 {n}은 완벽한 모습으로 현관문을 나섭니다. 당장 화장실로 가세요.',
      endLine: '축하합니다! 오늘 아침만큼은 완벽한 파워 J셨습니다. 당당하게 출근하세요.',
      steps: [S('샤워 & 양치', 10, '🚿'), S('스킨케어', 5, '🧴'), S('메이크업', 10, '💄'), S('옷 입고 가방 챙기기', 5, '👕')] },
    { id: 'p-bath30', name: '미루고 미룬 욕실 청소', deadline: null,
      startLine: '미루고 미룬 욕실 청소, 오늘 끝냅니다. 고무장갑부터 끼세요.',
      endLine: '욕실 청소 완료! 미루던 P는 오늘 퇴장했습니다.',
      steps: [S('세제 뿌리고 불리기', 5, '🧴'), S('변기 · 세면대 박박 닦기', 10, '🚽'), S('바닥 솔질', 10, '🧹'), S('물 뿌리고 환기', 5, '🪟')] },
    { id: 'p-night40', name: '퇴근 후 뻗기 방지 루틴', deadline: null,
      startLine: '{n}, 눕는 순간 끝입니다. 눕기 전에 샤워부터!',
      endLine: '완벽합니다. 내일의 {n}이 오늘의 {n}에게 고마워할 거예요. 푹 자요.',
      steps: [S('눕기 전에 샤워부터', 15, '🚿'), S('스킨케어 · 머리 말리기', 10, '💇‍♀️'), S('내일 짐 싸두기', 5, '🎒'), S('이제 누워도 됨', 10, '🛌')] },
    { id: 'p-kids45', name: '아이 등원 전투 루틴', deadline: '08:50',
      startLine: '등원 전투 45분 시작. 오늘도 이길 수 있습니다. 아이부터 깨우세요.',
      endLine: '등원 전투 승리! 커피 한 잔 하실 자격 있습니다.',
      steps: [S('아이 깨우고 화장실 보내기', 10, '👧'), S('아침 식사 먹이기', 15, '🍚'), S('세수하고 옷 입히기', 10, '👕'), S('가방 챙기고 신발 신기', 10, '👟')] },
    { id: 'p-tidy20', name: '외출 후 퀵 정리', deadline: null,
      startLine: '소파에 앉는 순간 끝입니다. 앉기 전에 딱 20분만.',
      endLine: '정리 끝! 이제 앉아도 됩니다. 진짜로.',
      steps: [S('외투 정리 · 가방 비우기', 3, '🧺'), S('영수증 · 쓰레기 버리기', 2, '🗑️'), S('책상 · 식탁 위 제자리', 5, '📚'), S('바닥 청소기 돌리기', 10, '🧹')] },
  ];

  /* ------------------------------------------------------------------ 말투 3종
     변수: {n} 호칭, {s} 지금 단계, {d} 단계 시간, {prev} 이전 단계, {t} 전체 분, {m} 연장 분, {c} 연장 횟수, {left} 아낀 시간, {p} 압축 비율 */
  const TONES = {
    kind: {
      label: '친절', desc: '다정하게 응원해요', voice: { rate: 1.0, pitch: 1.15 },
      sample: '{n}, 잘하고 있어요. 이제 머리 말릴 시간이에요.',
      greet: ['{n}, 늦게까지 깨어 있네요. 짧은 루틴 하나 하고 푹 자요.', '{n}, 좋은 아침이에요. 오늘 준비 <b>같이 해볼까요?</b>', '{n}, 미뤄둔 일 있으면 <b>하나만</b> 같이 끝내봐요.', '{n}, 오늘도 수고했어요. <b>눕기 전에</b> 루틴 하나만 해요.'],
      start: ['좋아요, {n}! 오늘도 같이 해봐요. 첫 번째는 {s}예요.', '{n}, 시작했어요. {t}분이면 충분해요. 먼저 {s}부터 해볼까요?'],
      next: ['{prev} 잘 끝냈어요! 이제 {s} 할 차례예요. {d} 드릴게요.', '잘하고 있어요, {n}. 다음은 {s}예요.', '벌써 하나 끝! 이번엔 {s}, 할 수 있어요.'],
      half: ['절반 왔어요. 지금 페이스 좋아요.', '{n}, 반 지났어요. {s} 마저 해볼까요?'],
      oneMin: ['1분 남았어요. 슬슬 마무리해 볼까요?', '조금만 더! {s} 1분 남았어요.'],
      ten: ['10초 남았어요.'],
      ext1: ['괜찮아요, {m}분 더 드릴게요. 천천히 하되 멈추지만 마요.'],
      ext2: ['{m}분 더 했어요. 오늘 몸이 좀 무겁죠? 그래도 잘하고 있어요.'],
      ext3: ['연장 {c}번째예요. 괜찮아요, 끝까지만 가봐요.'],
      early: ['와, 빨리 끝냈네요! {left} 벌었어요. 다음은 {s}예요.'],
      pause: ['잠깐 쉬어요. 준비되면 다시 눌러주세요.'],
      resume: ['다시 시작해요. 잘할 수 있어요.'],
      quit: ['오늘은 여기까지 해도 괜찮아요. 그래도 조금만 더 해보면 어때요?'],
      restart: ['{s}, 처음부터 다시 {d}이에요. 괜찮아요, 다시 해봐요.'],
      back: ['다시 왔네요! {s}부터 이어서 해요.'],
      startNow: ['{n}, 지금 시작하면 딱 맞아요. 시작해 볼까요?'],
      squeeze: ['시간이 조금 빠듯해서 단계마다 {p}%로 줄였어요. 괜찮아요, 할 수 있어요.'],
      grades: ['완벽했어요! 오늘의 {n}은 진짜 J였어요.', '끝까지 해냈어요. 정말 잘했어요!', '조금 밀렸지만 완주했어요. 그게 제일 중요해요.', '완주한 것만으로도 대단해요. 내일은 더 쉬울 거예요.'],
    },
    fact: {
      label: '팩폭', desc: '뼈 때리는 기본 말투', voice: { rate: 1.08, pitch: 1.0 },
      sample: '{n}, 딴짓 금지. 당장 머리 말리세요!',
      greet: ['{n}, 이 시간에 깨어 있는 것부터 P입니다. 루틴 하나만 하고 자요.', '{n}, 오늘 아침도 지각 위기죠? 하나 골라서 <b>바로 시작</b>하세요.', '{n}, 미뤄둔 거 있죠? <b>딱 하나만</b> 끝내봅시다.', '{n}, 눕는 순간 끝입니다. <b>눕기 전에</b> 루틴 하나.'],
      start: ['J 메이커 가동. {t}분 뒤 {n}은 다른 사람이 되어 있습니다. 첫 단계, {s}. 당장 시작하세요.', '{n}, 폰 내려놓고 {s}부터. 시간 갑니다.'],
      next: ['{prev} 끝! 폰 그만 보고 나오세요. {s} {d} 컷 돌아갑니다.', '{n}, 딴짓 금지. 당장 {s} 하세요!', '다음은 {s}. 생각하지 말고 몸부터 움직이세요.', '{prev} 종료. 이제 {s} 시간입니다. 미루면 지는 겁니다.'],
      half: ['반 지났습니다. 지금 {s} 하고 있는 거 맞죠?', '{n}, 혹시 지금 폰 보고 있나요? 정답은 {s}입니다.', '절반 경과. 딴짓 감지 시스템이 {n}을 지켜보고 있습니다.'],
      oneMin: ['삐빅. P의 본성이 올라오고 있습니다. {s} 1분 남았습니다. 서두르세요!', '1분 남았습니다. 마무리 모드로 전환하세요.'],
      ten: ['10초!', '10초 남았습니다.'],
      ext1: ['특별히 {m}분 연장해 드립니다. 침대에서 일어나셨길 바랍니다.', '{m}분 연장. 이번엔 진짜 움직이는 겁니다.'],
      ext2: ['또 미루시게요? 이번 {m}분은 진짜 움직이세요.', '두 번째 연장입니다. 슬슬 P력이 새어 나오네요.'],
      ext3: ['연장 {c}번째. P력이 J력을 이기고 있습니다. 이번이 마지막이길.', '{c}번째 연장. 이쯤 되면 타이머가 아니라 양심이 울립니다.'],
      early: ['벌써 끝? 이게 바로 J의 속도죠. {s}로 바로 갑니다.', '{left} 아꼈습니다. 남은 시간은 다음 단계에 쓰세요. 다음은 {s}.'],
      pause: ['일시정지. 쉬는 거 아닙니다, 잠깐 멈춘 겁니다.', '멈췄습니다. 오래 멈추면 P로 돌아갑니다.'],
      resume: ['다시 갑니다. 아까 하던 거 마저 하세요.'],
      quit: ['진짜 포기하시게요? 여기까지 온 게 아깝잖아요.'],
      restart: ['{s}, 처음부터 다시 {d}입니다. 이번엔 진짜로.'],
      back: ['다시 왔군요. 시간은 기다려주지 않았습니다. {s} 계속합니다.'],
      startNow: ['{n}, 지금 시작 안 하면 지각입니다. 당장 시작하세요!'],
      squeeze: ['이미 늦었습니다. 단계마다 {p}%로 압축합니다. 대충이라도 끝내는 게 J입니다.'],
      grades: ['축하합니다! 오늘만큼은 완벽한 파워 J셨습니다.', '완주! 연장은 좀 했지만 이 정도면 J 꿈나무입니다.', '끝내긴 했습니다. 다음엔 연장 버튼을 덜 사랑해 보세요.', '완주는 했으니 칭찬합니다. 다만 오늘의 P는 꽤 강했습니다.'],
    },
    drill: {
      label: '교관', desc: '군기 바짝, 제일 세게', voice: { rate: 1.18, pitch: 0.8 },
      sample: '{n}! 동작 그만. 머리 말리기 실시!',
      greet: ['{n}! 취침 시간이다. 루틴 하나 끝내고 즉시 취침!', '{n}! 기상했으면 루틴 선택. <b>지금 당장!</b>', '{n}! 미룬 임무가 있다. <b>즉시 처리</b>한다!', '{n}! 눕는 건 임무 완수 후다. <b>루틴 실시!</b>'],
      start: ['기상! {n}, 지금부터 {t}분 작전 개시. 첫 목표 {s}. 실시!', '정신 차려라 {n}! {s}부터 간다. 실시!'],
      next: ['{prev} 종료! 다음 {s}, {d}. 뛰어!', '동작 그만! {s}로 전환. 실시!', '{n}! 꾸물대지 마라. {s}, 지금 당장!'],
      half: ['반 지났다! 아직도 {s} 중인가? 속도 올려!', '{n}, 폰 내려놔라. 다 보인다!'],
      oneMin: ['1분 전! 마무리 동작 실시!', '남은 시간 1분! {s} 끝내라! 빨리!'],
      ten: ['10초 전!', '10초! 서둘러!'],
      ext1: ['{m}분 연장, 이번 한 번만 봐준다. 움직여!'],
      ext2: ['또 연장인가? {m}분이다. 정신 똑바로 차려라!'],
      ext3: ['연장 {c}회째! 이 정도면 얼차려 감이다!', '{c}번째 연장. 실망이다, {n}!'],
      early: ['좋아! {left} 단축. 그 기세로 {s}, 실시!'],
      pause: ['누가 멈추라고 했나! 빨리 재개해라.'],
      resume: ['재개! 다시 간다!'],
      quit: ['포기는 없다! 정말 여기서 물러날 건가?'],
      restart: ['{s}, 처음부터 다시 {d}! 이번엔 제대로 해라!'],
      back: ['돌아왔나 {n}! 시간은 기다려주지 않았다. {s} 계속!'],
      startNow: ['{n}! 지금 시작 안 하면 지각이다. 당장 시작!'],
      squeeze: ['시간 부족! 전 단계 {p}%로 압축한다. 뛰어!'],
      grades: ['훌륭하다! 오늘부로 {n}을 파워 J로 임명한다!', '임무 완수. 연장은 했지만 합격이다.', '겨우 통과다. 내일은 연장 없이 간다!', '완주는 인정한다. 하지만 오늘의 P는 강했다. 내일 재도전!'],
    },
  };
  const GRADES = [{ min: 90, title: '파워 J' }, { min: 70, title: 'J 꿈나무' }, { min: 50, title: 'J인 척하는 P' }, { min: 0, title: '자연인 P' }];

  /* ------------------------------------------------------------------ 상태 */
  const DEFAULT_SETTINGS = { nick: 'P', skin: 'neon', tone: 'fact', voice: true, sound: true, vibrate: true, notify: false };
  let settings = Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}));
  if (!TONES[settings.tone]) settings.tone = 'fact';
  let routines = store.get('routines', null);
  if (!Array.isArray(routines) || !routines.length) { routines = PRESETS(); store.set('routines', routines); }
  let history = store.get('history', []);
  const saveRoutines = () => { store.set('routines', routines); gcMedia(); };
  const saveSettings = () => store.set('settings', settings);

  let view = 'home';
  let draft = null;     // 에디터에서 고치는 중인 루틴
  let run = null;       // 실행 중인 타이머
  let lastResult = null;
  let homeTimer = null;
  let loop = null;
  const nagged = new Set();

  const tone = () => TONES[settings.tone] || TONES.fact;
  const line = (key) => pick(tone()[key] || TONES.fact[key]);
  const nick = () => (settings.nick || 'P').trim() + '님';
  const fill = (t, v = {}) => t.replace(/\{(\w+)\}/g, (_, k) => (k === 'n' ? nick() : v[k] ?? ''));
  const durSec = (s) => s.sec || s.min * 60;
  const routineSec = (r) => r.steps.reduce((a, s) => a + durSec(s), 0);
  const totalMin = (r) => Math.round(routineSec(r) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  const mmss = (sec) => pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
  const clock = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const human = (sec) => { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; return m && s ? `${m}분 ${s}초` : m ? `${m}분` : `${s}초`; };
  const minsWord = (ms) => { const m = Math.round(Math.abs(ms) / 60000); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
  const dayKey = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  /* 출발 시각 역산: 마감 시각에서 루틴 전체 시간을 빼서 '몇 시까지 시작해야 하는지' 계산 */
  function deadlineInfo(r, now = Date.now()) {
    if (!r.deadline) return null;
    const [h, m] = r.deadline.split(':').map(Number);
    const d = new Date(now); d.setHours(h, m, 0, 0);
    if (d.getTime() < now - 3600e3) d.setDate(d.getDate() + 1); // 1시간 넘게 지났으면 내일 마감으로
    const target = d.getTime(), total = routineSec(r) * 1000, startBy = target - total;
    return { target, startBy, slack: startBy - now, factor: (target - now) / total };
  }

  function applySkin() {
    document.documentElement.dataset.skin = settings.skin;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = settings.skin === 'pastel' ? '#e6f6ef' : settings.skin === 'arcade' ? '#150b30' : '#0b111c';
  }

  /* ------------------------------------------------------------------ 소리 · 음성 · 진동 */
  let actx = null;
  function audio() {
    if (!settings.sound) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function beep(freq, dur = 0.12, type = 'sine', vol = 0.18, when = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    tick: () => beep(880, 0.08, 'square', 0.08),
    last: () => beep(1320, 0.18, 'square', 0.12),
    stage: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.14, settings.skin === 'arcade' ? 'square' : 'triangle', 0.16, i * 0.09)),
    ext: () => { beep(220, 0.16, 'sawtooth', 0.1); beep(196, 0.22, 'sawtooth', 0.1, 0.14); },
    win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => beep(f, 0.18, 'triangle', 0.16, i * 0.11)),
    warn: () => { beep(988, 0.1, 'square', 0.1); beep(988, 0.1, 'square', 0.1, 0.16); },
  };
  const buzz = (p) => { if (settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* noop */ } };

  let koVoice = null;
  function loadVoices() {
    try {
      const vs = speechSynthesis.getVoices();
      koVoice = vs.find((v) => /^ko/i.test(v.lang) && /google|yuna|sora|heami/i.test(v.name)) || vs.find((v) => /^ko/i.test(v.lang)) || null;
    } catch (e) { koVoice = null; }
  }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, force) {
    if ((!settings.voice && !force) || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, '').replace(/[!?.]{2,}/g, '!'));
      const v = tone().voice;
      u.lang = 'ko-KR'; if (koVoice) u.voice = koVoice; u.rate = v.rate; u.pitch = v.pitch;
      speechSynthesis.speak(u);
    } catch (e) { /* noop */ }
  }
  function notify(title, body) {
    if (!settings.notify || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, icon: ICON, tag: 'jmaker', renotify: true };
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts));
      else new Notification(title, opts);
    } catch (e) { /* noop */ }
  }

  let wakeLock = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
  }
  function releaseAwake() { try { wakeLock && wakeLock.release(); } catch (e) { /* noop */ } wakeLock = null; }

  /* ------------------------------------------------------------------ 3D 영상 · 이미지 */
  const IS_WEBKIT = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Android|CriOS|FxiOS|Edg/.test(navigator.userAgent));
  // 투명 배경 영상: 아이폰·맥 사파리는 .mov(HEVC 알파), 그 밖은 .webm(VP9 알파)을 먼저 고릅니다.
  function pickSrc(src) {
    if (!src) return null;
    if (typeof src === 'string') return src;
    const order = IS_WEBKIT ? ['.mov', '.mp4', '.webm'] : ['.webm', '.mp4', '.mov'];
    for (const ext of order) { const f = src.find((x) => x.toLowerCase().endsWith(ext)); if (f) return f; }
    return src[0];
  }
  const isImage = (src) => /\.(png|gif|webp|jpe?g|svg|avif)(\?|$)/i.test(src);
  let actorToken = 0, actorUrl = null, hurry = null;
  async function setActor(s) {
    const actor = $('#tm-actor'), stage = $('#tm-stage'); if (!actor) return;
    const token = ++actorToken;
    actor.textContent = s.emoji; stage.classList.remove('has-media'); hurry = null;
    if (actorUrl) { URL.revokeObjectURL(actorUrl); actorUrl = null; }
    let src = null, type = null, hurrySrc = null;
    if (s.mediaId) {
      const blob = await idb.get(s.mediaId).catch(() => null);
      if (blob && token === actorToken) { src = actorUrl = URL.createObjectURL(blob); type = /^image/.test(blob.type) ? 'image' : 'video'; }
    }
    if (!src) {
      const m = MEDIA[s.motion || motionOf(s.emoji)];
      if (m) { src = pickSrc(m.loop); hurrySrc = pickSrc(m.hurry); type = src && isImage(src) ? 'image' : 'video'; }
    }
    if (!src || token !== actorToken) return;
    const el = type === 'image' ? new Image() : document.createElement('video');
    el.className = 'media';
    if (type === 'video') { el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.setAttribute('muted', ''); }
    else el.alt = s.name;
    const ready = () => {
      if (token !== actorToken) return;
      actor.textContent = ''; actor.appendChild(el); stage.classList.add('has-media');
      if (type === 'video') el.play().catch(() => {});
      if (hurrySrc && type === 'video') hurry = { el, loop: src, hurry: hurrySrc, on: false };
    };
    el.addEventListener(type === 'video' ? 'loadeddata' : 'load', ready, { once: true });
    el.addEventListener('error', () => { /* 파일이 없으면 이모지 그대로 */ }, { once: true });
    el.src = src;
  }
  function setHurry(on) {
    if (!hurry || hurry.on === on) return;
    hurry.on = on; hurry.el.src = on ? hurry.hurry : hurry.loop; hurry.el.play().catch(() => {});
  }
  async function gcMedia() {
    try {
      const used = new Set(routines.flatMap((r) => r.steps.map((s) => s.mediaId)).filter(Boolean));
      if (draft) draft.steps.forEach((s) => s.mediaId && used.add(s.mediaId));
      if (run) run.routine.steps.forEach((s) => s.mediaId && used.add(s.mediaId));
      const keys = await idb.keys();
      await Promise.all(keys.filter((k) => !used.has(k)).map((k) => idb.del(k)));
    } catch (e) { /* noop */ }
  }

  /* ------------------------------------------------------------------ 그림 (마스코트 · 7세그먼트) */
  const J_SHAPE = '<rect x="34" y="6" width="62" height="24" rx="8"/><rect x="62" y="6" width="28" height="84" rx="8"/><path d="M62 62H90V86Q90 118 54 118Q18 118 18 86V78H46V86Q46 92 54 92Q62 92 62 86Z"/>';
  function jSvg(mood = 'fierce', cls = 'j') {
    const eyes = mood === 'cheer'
      ? '<path d="M66 48q4-6 8 0M79 48q4-6 8 0" stroke="#10204a" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<circle cx="70" cy="48" r="5.5" fill="#fff"/><circle cx="83" cy="48" r="5.5" fill="#fff"/><circle cx="71" cy="49" r="2.8" fill="#10204a"/><circle cx="82" cy="49" r="2.8" fill="#10204a"/><path d="M64 39l11 4M89 39l-11 4" stroke="#10204a" stroke-width="3" stroke-linecap="round"/>';
    const mouth = mood === 'cheer' ? '<path d="M69 58q7 9 14 0z" fill="#10204a"/>' : '<path d="M71 59q5.5 4 11 0" stroke="#10204a" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    const arm = mood === 'cheer' ? '<path d="M90 66q14-8 16-30" stroke="#2350c8" stroke-width="7" fill="none" stroke-linecap="round"/>' : '';
    return `<svg class="${cls}" viewBox="0 0 112 150" aria-hidden="true">
      <path d="M44 114l-8 28h-8M64 112l6 30h8" stroke="#2350c8" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${arm}<g transform="translate(-6 6)" fill="#f08a24">${J_SHAPE}</g><g fill="#2f6df0">${J_SHAPE}</g>${eyes}${mouth}</svg>`;
  }
  function pSvg(mood = 'down') {
    const P = '<rect x="14" y="8" width="30" height="112" rx="9"/><path fill-rule="evenodd" d="M14 44a36 36 0 1 0 72 0a36 36 0 1 0 -72 0ZM44 42a11 11 0 1 0 22 0a11 11 0 1 0 -22 0Z"/>';
    const face = mood === 'smug'
      ? '<path d="M20 80q5-4 10 0M33 80q5-4 10 0" stroke="#4a3d82" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M24 92q8 6 16-2" stroke="#4a3d82" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
      : '<path d="M20 80q5 4 10 0" stroke="#4a3d82" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M38 80m-4 0a4 4 0 1 1 4 4a2 2 0 1 1 -2 -2" stroke="#4a3d82" stroke-width="2" fill="none"/><path d="M24 95q4-3 8 0t8 0" stroke="#4a3d82" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    const tf = mood === 'down' ? 'transform="translate(0 96) rotate(-90)"' : '';
    return `<svg class="pm ${mood}" viewBox="${mood === 'down' ? '0 0 150 100' : '0 0 100 150'}" aria-hidden="true"><g ${tf}><g transform="translate(5 4)" fill="#9d8fe0">${P}</g><g fill="#cfc8f4">${P}</g>${face}</g></svg>`;
  }
  function gearSvg() {
    const pts = []; const n = 10;
    for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n; const r = i % 2 ? 40 : 50; pts.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1)); }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${pts.join(' ')}" fill="currentColor"/><circle cx="50" cy="50" r="16" fill="var(--card)"/></svg>`;
  }
  const SEG = {
    a: [8, 6, 52, 'h'], b: [54, 8, 48, 'v'], c: [54, 52, 92, 'v'], d: [8, 94, 52, 'h'],
    e: [6, 52, 92, 'v'], f: [6, 8, 48, 'v'], g: [8, 50, 52, 'h'],
  };
  const DIGIT_ON = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
  function segPoly(k) {
    const [p, q, r, dir] = SEG[k];
    if (dir === 'h') { const x1 = p, cy = q, x2 = r; return `${x1},${cy} ${x1 + 5},${cy - 5} ${x2 - 5},${cy - 5} ${x2},${cy} ${x2 - 5},${cy + 5} ${x1 + 5},${cy + 5}`; }
    const cx = p, y1 = q, y2 = r; return `${cx},${y1} ${cx + 5},${y1 + 5} ${cx + 5},${y2 - 5} ${cx},${y2} ${cx - 5},${y2 - 5} ${cx - 5},${y1 + 5}`;
  }
  function digitsSvg() {
    const xs = [0, 64, 156, 220];
    const g = xs.map((x, i) => `<g data-d="${i}" transform="translate(${x} 0)">${Object.keys(SEG).map((k) => `<polygon class="s" data-s="${k}" points="${segPoly(k)}"/>`).join('')}</g>`).join('');
    return `<svg viewBox="-14 -2 300 104" role="img" aria-label="남은 시간"><g transform="skewX(-6)">${g}<circle class="s on" cx="140" cy="32" r="6"/><circle class="s on" cx="140" cy="70" r="6"/></g></svg>`;
  }
  function setDigits(text) {
    const box = $('.digits'); if (!box) return;
    const nums = text.replace(':', '').split('').map(Number);
    box.querySelectorAll('g[data-d]').forEach((g, i) => {
      const on = DIGIT_ON[nums[i]] || '';
      g.querySelectorAll('.s').forEach((p) => p.classList.toggle('on', on.includes(p.dataset.s)));
    });
    box.querySelector('svg').setAttribute('aria-label', '남은 시간 ' + text);
    const t = box.querySelector('.txt');
    if (t.textContent !== text) { t.textContent = text; t.classList.remove('roll'); void t.offsetWidth; t.classList.add('roll'); }
  }

  /* ------------------------------------------------------------------ 공통 UI: 시트 · 확인 · 토스트 */
  function openSheet(html, onMount) {
    layer.innerHTML = `<div class="scrim" data-act="sheet-close"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    const sheet = $('.sheet', layer);
    if (onMount) onMount(sheet);
    const f = sheet.querySelector('input:not([type=file]), button'); if (f) f.focus({ preventScroll: true });
    return sheet;
  }
  let settingsOpen = false;
  const closeSheet = () => { layer.innerHTML = ''; if (settingsOpen) { settingsOpen = false; if (view === 'home') renderHome(); } };
  function confirmSheet({ title, body = '', ok = '확인', cancel = '취소', danger = false }) {
    return new Promise((resolve) => {
      const s = openSheet(`<h2>${esc(title)}</h2>${body ? `<p>${esc(body)}</p>` : ''}
        <div class="btns"><button class="btn" id="cf-no" type="button">${esc(cancel)}</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" id="cf-yes" type="button">${esc(ok)}</button></div>`);
      const done = (v) => { closeSheet(); resolve(v); };
      s.querySelector('#cf-no').onclick = () => done(false);
      s.querySelector('#cf-yes').onclick = () => done(true);
      $('.scrim', layer).onclick = (e) => { if (e.target === e.currentTarget) done(false); };
    });
  }
  let toastT = null;
  function toast(msg) {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
  }

  /* ------------------------------------------------------------------ 기록 */
  function streak() {
    const days = new Set(history.map((h) => dayKey(h.at)));
    let n = 0; const d = new Date();
    if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const weekCount = () => history.filter((h) => Date.now() - h.at < 7 * 864e5).length;

  /* ================================================================== 홈 */
  function deadlineHtml(r, now) {
    const t = totalMin(r);
    const info = deadlineInfo(r, now);
    if (!info) return { meta: `<span class="eta">지금 시작하면 ${clock(now + t * 60000)} 완료</span>`, extra: '' };
    const due = `⏰ ${r.deadline} 출발`;
    if (info.target <= now) return { meta: `<span class="late">${due} · 마감 지남</span>`, extra: '' };
    if (info.slack > 60000) return { meta: `<span class="eta">${due} · <b>${clock(info.startBy)}</b>까지 시작</span><span class="chip ok">${minsWord(info.slack)} 여유</span>`, extra: '' };
    if (info.slack > -60000) return { meta: `<span class="eta">${due}</span><span class="chip late">지금 시작해야 해요</span>`, extra: '' };
    const p = Math.round(clamp(info.factor, 0.2, 1) * 100);
    return {
      meta: `<span class="late">${due} · ${minsWord(info.slack)} 늦었어요</span>`,
      extra: `<button class="btn squeeze" data-act="start-fit" data-id="${r.id}">⚡ 단계별 ${p}%로 압축해서 시작</button>`,
    };
  }
  function renderHome() {
    view = 'home'; stopLoop(); releaseAwake();
    document.documentElement.style.removeProperty('--hue');
    const h = new Date().getHours();
    const greet = tone().greet[h < 5 ? 0 : h < 11 ? 1 : h < 17 ? 2 : 3];
    const st = streak(), wk = weekCount();
    const now = Date.now();
    app.innerHTML = `<section class="view">
      <header class="home-head">
        <img src="${ICON}" alt="J 메이커 아이콘" width="56" height="56">
        <div class="grow"><h1>J 메이커</h1><p>오늘만 J가 되어보자 · ${tone().label} 모드</p></div>
        <button class="icon-btn" data-act="settings" aria-label="설정">⚙️</button>
      </header>
      <div class="card hero-line">
        <div style="width:34px;flex:none">${jSvg('fierce')}</div>
        <div class="say">${fill(greet)}
          <div class="hero-stats" style="margin-top:8px">
            ${st ? `<span class="chip hot">🔥 ${st}일 연속 J</span>` : '<span class="chip">아직 기록 없음</span>'}
            ${wk ? `<span class="chip">이번 주 ${wk}회 완주</span>` : ''}
          </div>
        </div>
      </div>
      <div class="label">내 루틴</div>
      <div class="routine-list">
        ${routines.map((r) => {
          const dl = deadlineHtml(r, now);
          return `<article class="card routine">
            <div style="min-width:0">
              <h3>${esc(r.name)}</h3>
              <div class="meta"><span>${totalMin(r)}분 · ${r.steps.length}단계</span>${dl.meta}</div>
            </div>
            <div class="actions">
              <button class="icon-btn" data-act="edit" data-id="${r.id}" aria-label="${esc(r.name)} 편집">✏️</button>
              <button class="play" data-act="start" data-id="${r.id}" aria-label="${esc(r.name)} 시작">▶</button>
            </div>
            <div class="chain">${r.steps.map((s, i) => `${i ? '<i>›</i>' : ''}<span>${s.mediaId ? '🎬' : s.emoji} ${esc(s.name)} ${s.min}분</span>`).join('')}</div>
            ${dl.extra}
          </article>`;
        }).join('')}
        <button class="card add-card" data-act="new">＋ 새 루틴 만들기</button>
      </div>
    </section>`;
    clearInterval(homeTimer);
    homeTimer = setInterval(homeTick, 20000);
    window.scrollTo(0, 0);
  }
  // 홈을 켜 둔 채로 '시작해야 하는 시각'이 되면 한 번 말로 알려줍니다.
  function homeTick() {
    if (view !== 'home' || layer.innerHTML) return;
    const now = Date.now();
    for (const r of routines) {
      const info = deadlineInfo(r, now); if (!info) continue;
      const key = r.id + '@' + info.startBy;
      if (info.slack <= 0 && info.slack > -120000 && !nagged.has(key)) {
        nagged.add(key);
        const msg = fill(line('startNow')) + ` (${r.name})`;
        toast(msg); speak(msg); buzz([200, 100, 200]); notify('⏰ ' + r.name, msg);
      }
    }
    renderHome();
  }

  /* ================================================================== 설정 */
  function openSettings() {
    const sw = (id, label, hint, on) => `<label class="toggle-row" for="${id}"><span class="grow">${label}<small>${hint}</small></span>
      <span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></span></label>`;
    settingsOpen = true;
    openSheet(`<h2>설정</h2>
      <div class="field"><label class="label" for="set-nick">팩폭 받을 호칭</label>
        <div class="row"><input class="input grow" id="set-nick" maxlength="10" value="${esc(settings.nick)}" placeholder="P"><span style="color:var(--muted)">님</span></div></div>
      <div class="field"><span class="label">말투 · 누르면 들어볼 수 있어요</span>
        <div class="tones">
          ${Object.entries(TONES).map(([k, t]) => `<button type="button" data-tone-pick="${k}" aria-pressed="${settings.tone === k}"><b>${t.label}</b><small>${t.desc}</small><q>${esc(fill(t.sample))}</q></button>`).join('')}
        </div></div>
      <div class="field"><span class="label">테마</span>
        <div class="skins">
          ${[['neon', '다크 네온'], ['pastel', '미니멀 파스텔'], ['arcade', '아케이드']].map(([k, l]) =>
            `<button type="button" data-skin-pick="${k}" aria-pressed="${settings.skin === k}"><span class="sw ${k}">05:00</span>${l}</button>`).join('')}
        </div></div>
      <div>
        ${sw('set-voice', '음성 안내 (TTS)', '단계 전환·1분 전·연장 때 말로 알려줘요', settings.voice)}
        ${sw('set-sound', '효과음', '카운트다운 삑, 단계 클리어 소리', settings.sound)}
        ${sw('set-vibrate', '진동', '안드로이드에서만 동작해요', settings.vibrate)}
        ${sw('set-notify', '화면 밖 알림', '다른 앱을 보고 있을 때 단계 전환 알림 (브라우저가 허용할 때)', settings.notify)}
      </div>
      <div class="btns"><button class="btn" type="button" id="set-test">🔊 음성 테스트</button><button class="btn" type="button" id="set-reset">기본 프리셋 복원</button></div>
      <button class="btn primary" type="button" data-act="sheet-close">닫기</button>`, (s) => {
      s.querySelector('#set-nick').addEventListener('input', (e) => {
        settings.nick = e.target.value.trim() || 'P'; saveSettings();
        s.querySelectorAll('[data-tone-pick]').forEach((b) => { b.querySelector('q').textContent = fill(TONES[b.dataset.tonePick].sample); });
      });
      s.querySelectorAll('[data-tone-pick]').forEach((b) => b.addEventListener('click', () => {
        settings.tone = b.dataset.tonePick; saveSettings();
        s.querySelectorAll('[data-tone-pick]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        speak(fill(tone().sample), true);
      }));
      s.querySelectorAll('[data-skin-pick]').forEach((b) => b.addEventListener('click', () => {
        settings.skin = b.dataset.skinPick; saveSettings(); applySkin();
        s.querySelectorAll('[data-skin-pick]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      }));
      const bind = (id, key, after) => s.querySelector('#' + id).addEventListener('change', (e) => { settings[key] = e.target.checked; saveSettings(); after && after(e); });
      bind('set-voice', 'voice'); bind('set-sound', 'sound'); bind('set-vibrate', 'vibrate');
      bind('set-notify', 'notify', async (e) => {
        if (!e.target.checked) return;
        if (!('Notification' in window)) { toast('이 브라우저는 알림을 지원하지 않아요.'); e.target.checked = settings.notify = false; saveSettings(); return; }
        try { const p = await Notification.requestPermission(); if (p !== 'granted') { toast('알림 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.'); e.target.checked = settings.notify = false; saveSettings(); } }
        catch (err) { e.target.checked = settings.notify = false; saveSettings(); }
      });
      s.querySelector('#set-test').addEventListener('click', () => {
        audio(); SFX.stage();
        if (!('speechSynthesis' in window)) { toast('이 브라우저는 음성 안내를 지원하지 않아요.'); return; }
        speak(fill(tone().sample), true);
      });
      s.querySelector('#set-reset').addEventListener('click', async () => {
        const ok = await confirmSheet({ title: '기본 프리셋을 복원할까요?', body: '내가 만든 루틴은 그대로 두고, 지우거나 고친 기본 프리셋 6개를 처음 상태로 되돌려요.', ok: '복원' });
        if (!ok) return openSettings();
        const ids = new Set(PRESETS().map((p) => p.id));
        routines = PRESETS().concat(routines.filter((r) => !ids.has(r.id)));
        saveRoutines(); renderHome(); toast('기본 프리셋을 복원했어요.');
      });
    });
  }

  /* ================================================================== 에디터 */
  function openEditor(id) {
    const src = routines.find((r) => r.id === id);
    draft = src ? JSON.parse(JSON.stringify(src)) : { id: 'u-' + uid(), name: '', target: null, deadline: null, isNew: true, steps: [{ id: uid(), name: '', min: 5, emoji: '⏱️', motion: 'generic', auto: true }] };
    view = 'edit'; renderEditor();
  }
  function renderEditor() {
    app.innerHTML = `<section class="view">
      <div class="ed-top">
        <button class="icon-btn" data-act="home" aria-label="뒤로">←</button>
        <h2>${draft.isNew ? '새 루틴' : '루틴 편집'}</h2>
        <button class="btn primary" data-act="ed-save">저장</button>
      </div>
      <div class="field"><label class="label" for="ed-name">루틴 이름</label>
        <input class="input" id="ed-name" maxlength="24" placeholder="예: 지각 위기 15분 컷" value="${esc(draft.name)}"></div>
      <div class="ed-two">
        <div class="field"><label class="label" for="ed-target">총 목표 시간</label>
          <div class="row"><input class="input grow" id="ed-target" type="number" inputmode="numeric" min="1" max="300" placeholder="선택" value="${draft.target || ''}"><span style="color:var(--muted)">분</span></div></div>
        <div class="field"><label class="label" for="ed-deadline">⏰ 출발 · 마감 시각</label>
          <div class="row"><input class="input grow" id="ed-deadline" type="time" value="${draft.deadline || ''}">${draft.deadline ? '<button class="icon-btn" data-act="ed-nodl" aria-label="마감 시각 지우기">✕</button>' : ''}</div></div>
      </div>
      <div class="card alloc" id="ed-alloc"></div>
      <div class="label">단계 <span style="font-weight:400">· 이모지를 누르면 동작이나 영상을 바꿀 수 있어요</span></div>
      <div class="steps" id="ed-steps"></div>
      <button class="btn" data-act="ed-add">＋ 단계 추가</button>
      ${draft.isNew ? '' : '<button class="btn ghost danger" data-act="ed-delete">이 루틴 삭제</button>'}
    </section>`;
    $('#ed-name').addEventListener('input', (e) => { draft.name = e.target.value; });
    $('#ed-target').addEventListener('input', (e) => { const v = parseInt(e.target.value, 10); draft.target = v > 0 ? Math.min(v, 300) : null; renderAlloc(); });
    $('#ed-deadline').addEventListener('change', (e) => { draft.deadline = e.target.value || null; renderEditor(); });
    renderSteps(); renderAlloc();
  }
  function renderAlloc() {
    const box = $('#ed-alloc'); if (!box) return;
    const sum = draft.steps.reduce((a, s) => a + s.min, 0), tgt = draft.target;
    const base = Math.max(sum, tgt || 0) || 1;
    const bar = draft.steps.map((s) => `<span style="width:${(s.min / base) * 100}%"></span>`).join('');
    let msg;
    if (!tgt) msg = `<span>단계 합계 <b>${sum}분</b></span>`;
    else if (sum === tgt) msg = `<span>목표 <b>${tgt}분</b> · 배정 <b>${sum}분</b></span><span class="good">딱 맞아요 ✓</span>`;
    else if (sum < tgt) msg = `<span>목표 <b>${tgt}분</b> · 배정 <b>${sum}분</b></span><span class="good">남은 시간 ${tgt - sum}분</span>`;
    else msg = `<span>목표 <b>${tgt}분</b> · 배정 <b>${sum}분</b></span><span class="bad">${sum - tgt}분 초과</span>`;
    const info = deadlineInfo({ deadline: draft.deadline, steps: draft.steps });
    const dl = info
      ? `<div class="alloc-text"><span>⏰ <b>${draft.deadline}</b>에 나가려면</span><span class="${info.slack >= 0 ? 'good' : 'bad'}"><b>${clock(info.startBy)}</b>까지 시작${info.slack >= 0 ? ` (${minsWord(info.slack)} 남음)` : ` (${minsWord(info.slack)} 지남)`}</span></div>`
      : `<div class="alloc-text"><span>지금 시작하면 <b>${clock(Date.now() + sum * 60000)}</b> 완료</span></div>`;
    const fix = tgt && sum !== tgt && draft.steps.length
      ? `<button class="btn" data-act="ed-fit" style="min-height:36px;font-size:13px">${sum < tgt ? `남은 ${tgt - sum}분을 마지막 단계에 더하기` : `초과한 ${sum - tgt}분을 마지막 단계에서 빼기`}</button>` : '';
    box.innerHTML = `<div class="alloc-bar">${bar}</div><div class="alloc-text">${msg}</div>${dl}${fix}`;
    if (tgt && sum > tgt) box.querySelectorAll('.alloc-bar span').forEach((sp, i) => { let acc = 0; for (let j = 0; j <= i; j++) acc += draft.steps[j].min; if (acc > tgt) sp.classList.add('over'); });
  }
  function renderSteps() {
    const n = draft.steps.length;
    $('#ed-steps').innerHTML = draft.steps.map((s, i) => `<div class="card step-row" data-i="${i}">
      <button class="emo ${s.mediaId ? 'has-media' : ''}" data-act="ed-emoji" data-i="${i}" aria-label="${i + 1}단계 동작 선택">${s.emoji}</button>
      <input class="input name" id="ed-step-${s.id}" data-i="${i}" maxlength="24" placeholder="${i + 1}단계 할 일 (예: 머리 말리기)" value="${esc(s.name)}">
      <div class="tools">
        <div class="stepper" role="group" aria-label="${i + 1}단계 시간">
          <button data-act="ed-min" data-i="${i}" data-d="-1" aria-label="1분 줄이기">−</button>
          <output>${s.min}분</output>
          <button data-act="ed-min" data-i="${i}" data-d="1" aria-label="1분 늘리기">＋</button>
        </div>
        <div class="mini">
          <button data-act="ed-move" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="위로">↑</button>
          <button data-act="ed-move" data-i="${i}" data-d="1" ${i === n - 1 ? 'disabled' : ''} aria-label="아래로">↓</button>
          <button data-act="ed-del" data-i="${i}" ${n === 1 ? 'disabled' : ''} aria-label="단계 삭제">✕</button>
        </div>
      </div>
    </div>`).join('');
    $('#ed-steps').querySelectorAll('input.name').forEach((inp) => inp.addEventListener('input', (e) => {
      const s = draft.steps[+e.target.dataset.i]; s.name = e.target.value;
      if (s.auto) { s.emoji = guessEmoji(s.name); s.motion = motionOf(s.emoji); e.target.parentNode.querySelector('.emo').textContent = s.emoji; }
    }));
  }
  function pickEmoji(i) {
    const s = draft.steps[i];
    const hasLib = !!MEDIA[s.motion || motionOf(s.emoji)];
    openSheet(`<h2>${i + 1}단계 동작 고르기</h2><p>타이머 화면 가운데에서 이 동작이 계속 움직여요.</p>
      <div class="emoji-grid">${LIB.map((x) => `<button type="button" data-e="${x.e}" aria-pressed="${x.e === s.emoji}"><span>${x.e}</span>${x.l}${MEDIA[x.m] ? '<em>🎬</em>' : ''}</button>`).join('')}</div>
      <div class="field"><label class="label" for="emo-custom">다른 이모지 직접 넣기</label>
        <div class="row"><input class="input grow" id="emo-custom" maxlength="4" placeholder="예: 🐶"><button class="btn" type="button" id="emo-ok">적용</button></div></div>
      <div class="field media-field"><span class="label">🎬 3D 영상 · 이미지</span>
        ${s.mediaId
          ? '<div class="row"><span class="grow">이 단계에 내 영상이 들어가 있어요.</span><button class="btn danger" type="button" id="media-rm">빼기</button></div>'
          : `<p>${hasLib ? '이 동작에는 앱에 기본 영상이 들어 있어요. 다른 걸 쓰고 싶으면 올려 주세요.' : '영상(MP4·WebM·MOV)이나 GIF·PNG를 올리면 이모지 대신 재생돼요. 이 기기에만 저장돼요.'}</p>
             <label class="btn" for="media-file">파일 고르기</label><input id="media-file" type="file" accept="video/*,image/*" hidden>`}
      </div>`, (sh) => {
      const set = (e) => { s.emoji = e; s.motion = motionOf(e); s.auto = false; closeSheet(); renderSteps(); };
      sh.querySelectorAll('[data-e]').forEach((b) => b.addEventListener('click', () => set(b.dataset.e)));
      sh.querySelector('#emo-ok').addEventListener('click', () => { const v = sh.querySelector('#emo-custom').value.trim(); if (v) set(v); });
      const rm = sh.querySelector('#media-rm');
      if (rm) rm.addEventListener('click', () => { s.mediaId = null; closeSheet(); renderSteps(); toast('영상을 뺐어요. 저장하면 반영돼요.'); });
      const file = sh.querySelector('#media-file');
      if (file) file.addEventListener('change', async () => {
        const f = file.files && file.files[0]; if (!f) return;
        if (f.size > 40 * 1024 * 1024) { toast('40MB 이하 파일만 올릴 수 있어요.'); return; }
        try {
          const id = 'm-' + uid(); await idb.put(id, f);
          s.mediaId = id; s.auto = false; closeSheet(); renderSteps(); toast('영상을 넣었어요. 저장을 눌러 주세요.');
        } catch (e) { toast('이 브라우저에서는 파일을 저장할 수 없어요.'); }
      });
    });
  }
  function saveDraft() {
    const r = draft;
    r.name = (r.name || '').trim() || '내 루틴';
    r.steps.forEach((s, i) => { s.name = (s.name || '').trim() || `${i + 1}단계`; s.min = clamp(Math.round(s.min), 1, 99); delete s.auto; delete s.sec; });
    delete r.isNew;
    const i = routines.findIndex((x) => x.id === r.id);
    draft = null;
    if (i >= 0) routines[i] = r; else routines.push(r);
    saveRoutines(); renderHome(); toast(`'${r.name}' 저장했어요.`);
  }

  /* ================================================================== 타이머 */
  function startRoutine(id, opts = {}) {
    const r = routines.find((x) => x.id === id); if (!r) return;
    audio(); // 사용자 터치 안에서 오디오 잠금 해제
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { /* noop */ } }
    const now = Date.now();
    const routine = JSON.parse(JSON.stringify(r));
    const info = deadlineInfo(r, now);
    let squeeze = null;
    if (opts.fit && info && info.factor < 1) {
      const f = clamp(info.factor, 0.2, 1);
      routine.steps.forEach((s) => { s.sec = Math.max(30, Math.round((s.min * 60 * f) / 5) * 5); });
      squeeze = Math.round(f * 100);
    }
    const first = durSec(routine.steps[0]);
    run = {
      routine, idx: 0, squeeze, deadline: info ? info.target : null,
      stepEnd: now + first * 1000, stepTotal: first, pausedLeft: null,
      startedAt: now, flags: {}, stats: { ext: 0, extSec: 0, pauses: 0, early: 0, savedSec: 0 }, pausedAt: null, pausedMs: 0,
    };
    renderTimer(); enterStep('start'); startLoop(); keepAwake(); saveRun();
  }
  const cur = () => run.routine.steps[run.idx];
  const leftMs = () => (run.pausedLeft != null ? run.pausedLeft : run.stepEnd - Date.now());
  const saveRun = () => { if (run) store.set('run', run); else store.del('run'); };

  function renderTimer() {
    view = 'timer';
    clearInterval(homeTimer);
    const r = run.routine;
    app.innerHTML = `<section class="view timer" id="tm">
      <div class="t-top">
        <button class="icon-btn" data-act="quit" aria-label="그만두기">✕</button>
        <div class="where" id="tm-where"></div>
        <div class="eta">완료 예정<b id="tm-eta">--:--</b><span id="tm-slack"></span></div>
      </div>
      <div class="seg-bar" id="tm-seg">${r.steps.map((s) => `<span style="--w:${durSec(s)}"><i></i></span>`).join('')}</div>
      <h2 class="step-title" id="tm-title"></h2>
      <div class="digits">${digitsSvg()}<div class="txt" aria-hidden="true">00:00</div></div>
      <div class="hp"><span class="lab">HP</span><div class="track"><div class="fill" id="tm-hp"></div></div></div>
      <div class="card stage" id="tm-stage">
        <div class="gears">${gearSvg()}${gearSvg()}</div>
        <div class="fx" id="tm-fx"></div>
        <div class="actor" id="tm-actor" role="img"></div>
        <div class="bubble" id="tm-bubble">${jSvg('fierce')}<p id="tm-line"></p></div>
      </div>
      <div class="next-up" id="tm-next"></div>
      <div class="ext-row">
        <button class="ext" data-act="ext" data-m="1"><b>+1</b><small>분</small></button>
        <button class="ext" data-act="ext" data-m="2"><b>+2</b><small>분</small></button>
        <button class="ext" data-act="ext" data-m="5"><b>+5</b><small>분</small></button>
      </div>
      <div class="ctrl-row">
        <button class="btn" data-act="pause" id="tm-pause">⏸ 멈춤</button>
        <button class="btn primary" data-act="early" id="tm-early">✓ 다 했어요</button>
        <button class="btn" data-act="restart-step" aria-label="이 단계 처음부터">↺ 다시</button>
      </div>
    </section>`;
    window.scrollTo(0, 0);
  }

  function say(text, voice = true) {
    const p = $('#tm-line'); if (p) { p.textContent = text; const b = $('#tm-bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    if (voice) speak(text);
  }

  function enterStep(reason, prevName, extra = {}) {
    const r = run.routine, s = cur(), i = run.idx;
    run.flags = {};
    $('#tm-title').textContent = s.name;
    $('#tm-where').textContent = `${i + 1} / ${r.steps.length} · ${r.name}`;
    const stage = $('#tm-stage');
    const motion = s.motion || motionOf(s.emoji);
    stage.className = 'card stage m-' + motion;
    $('#tm-actor').setAttribute('aria-label', s.name);
    setActor(s);
    spawnParticles(motion);
    const nx = r.steps[i + 1];
    $('#tm-next').innerHTML = nx ? `다음 › <b>${nx.mediaId ? '🎬' : nx.emoji} ${esc(nx.name)}</b> ${human(durSec(nx))}` : '🏁 마지막 단계예요';
    const vars = Object.assign({ s: s.name, d: human(durSec(s)), t: totalMin(r), prev: prevName || '', p: run.squeeze }, extra);
    if (reason === 'resume') { render(); return; }
    let text;
    if (reason === 'start') {
      text = fill(settings.tone === 'fact' && r.startLine ? r.startLine : line('start'), vars);
      if (run.squeeze) text = fill(line('squeeze'), vars) + ` ${s.name}부터!`;
    } else if (reason === 'early') text = fill(line('early'), vars);
    else text = fill(line('next'), vars);
    say(text);
    if (reason !== 'start') {
      SFX.stage(); buzz([180, 80, 180]);
      flash(i, s);
      notify(`${s.emoji} ${s.name} ${human(durSec(s))}`, text);
    } else { SFX.warn(); buzz(120); }
    render();
  }

  function flash(i, s) {
    const el = document.createElement('div'); el.className = 'flash';
    el.innerHTML = settings.skin === 'arcade'
      ? `<div><div class="big">STAGE ${i} CLEAR!</div><div class="sub">${s.emoji} NEXT: ${esc(s.name)}</div></div>`
      : `<div><span class="emo">${s.emoji}</span><div class="big">${esc(s.name)}</div><div class="sub">${human(durSec(s))} 컷 시작</div></div>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1600);
  }

  function spawnParticles(motion) {
    const fx = $('#tm-fx'); if (!fx) return;
    const def = PARTICLES[motion]; if (!def) { fx.innerHTML = ''; return; }
    const [kind, n] = def; let html = '';
    for (let k = 0; k < n; k++) {
      const left = 10 + Math.random() * 80, top = 15 + Math.random() * 55;
      const d = (kind === 'drop' ? 0.7 + Math.random() * 0.6 : kind === 'bub' ? 2 + Math.random() * 1.6 : 0.8 + Math.random() * 1.2).toFixed(2);
      const dl = (-Math.random() * 2.5).toFixed(2);
      const pos = kind === 'drop' || kind === 'bub' ? `left:${left}%` : kind === 'dust' ? `left:${30 + k * 14}%` : `left:${left}%;top:${top}%`;
      const inner = kind === 'spark' ? '✦' : kind === 'z' ? 'Z' : '';
      const size = kind === 'bub' ? `--s:${8 + Math.round(Math.random() * 14)}px;` : '';
      html += `<span class="p p-${kind}" style="${pos};${size}--d:${d}s;--dl:${dl}s">${inner}</span>`;
    }
    fx.innerHTML = html;
  }

  function render() {
    if (!run || view !== 'timer') return;
    const left = leftMs();
    const sec = Math.max(0, Math.ceil(left / 1000));
    setDigits(mmss(Math.min(sec, 99 * 60 + 59)));
    const frac = clamp(1 - left / (run.stepTotal * 1000), 0, 1);
    $('#tm-hp').style.width = ((1 - frac) * 100).toFixed(2) + '%';
    const segs = $('#tm-seg').children;
    for (let k = 0; k < segs.length; k++) {
      segs[k].classList.toggle('done', k < run.idx);
      segs[k].firstChild.style.setProperty('--p', k === run.idx ? (frac * 100).toFixed(1) + '%' : '0%');
    }
    const rest = run.routine.steps.slice(run.idx + 1).reduce((a, s) => a + durSec(s) * 1000, 0);
    const eta = Date.now() + Math.max(0, left) + rest;
    $('#tm-eta').textContent = clock(eta);
    const sl = $('#tm-slack');
    if (run.deadline) {
      const diff = run.deadline - eta;
      sl.className = diff >= -30000 ? 'ok' : 'late';
      sl.textContent = `마감 ${clock(run.deadline)} · ` + (Math.abs(diff) < 60000 ? '딱 맞춰요' : diff > 0 ? `${minsWord(diff)} 여유` : `${minsWord(diff)} 늦음`);
    } else sl.textContent = '';
    const tm = $('#tm');
    const warnAt = run.stepTotal >= 90 ? 60 : 10;
    const danger = sec <= 10 && run.pausedLeft == null;
    tm.classList.toggle('warn', sec <= warnAt);
    tm.classList.toggle('danger', danger);
    setHurry(danger);
    if (settings.skin === 'pastel') {
      const all = routineSec(run.routine);
      const done = run.routine.steps.slice(0, run.idx).reduce((a, s) => a + durSec(s), 0) + frac * durSec(cur());
      document.documentElement.style.setProperty('--hue', String(Math.round(165 + (done / all) * 150)));
    }
    const pb = $('#tm-pause'); if (pb) pb.textContent = run.pausedLeft != null ? '▶ 계속' : '⏸ 멈춤';
  }

  function tick() {
    if (!run) return;
    if (run.pausedLeft != null) { render(); return; }
    const now = Date.now();
    let moved = 0, prevName = '';
    while (run && now >= run.stepEnd) {
      if (run.idx >= run.routine.steps.length - 1) { finish(); return; }
      prevName = cur().name;
      run.idx++;
      const d = durSec(cur());
      run.stepEnd += d * 1000; run.stepTotal = d;
      moved++;
    }
    if (moved) { enterStep('auto', prevName); saveRun(); }
    const left = run.stepEnd - now, sec = Math.ceil(left / 1000), f = run.flags, s = cur();
    const vars = { s: s.name };
    if (!f.half && run.stepTotal >= 180 && left <= (run.stepTotal * 1000) / 2 && sec > 70) { f.half = true; say(fill(line('half'), vars)); }
    if (!f.oneMin && run.stepTotal >= 90 && sec <= 60 && sec > 12) { f.oneMin = true; say(fill(line('oneMin'), vars)); SFX.warn(); buzz([100, 60, 100]); }
    if (!f.ten && run.stepTotal >= 30 && sec <= 10 && sec > 4) { f.ten = true; say(fill(line('ten'), vars)); }
    if (sec <= 3 && sec >= 1 && f.beep !== sec) { f.beep = sec; SFX.last(); buzz(60); }
    else if (sec <= 10 && sec > 3 && f.beep !== sec) { f.beep = sec; SFX.tick(); }
    render();
  }
  function startLoop() { stopLoop(); loop = setInterval(tick, 200); tick(); }
  function stopLoop() { clearInterval(loop); loop = null; }

  function extend(m) {
    if (!run) return;
    if (run.pausedLeft != null) run.pausedLeft += m * 60000; else run.stepEnd += m * 60000;
    run.stepTotal += m * 60;
    run.stats.ext++; run.stats.extSec += m * 60;
    const c = run.stats.ext;
    const sec = Math.ceil(leftMs() / 1000);
    if (sec > 60) run.flags.oneMin = false;
    if (sec > 10) { run.flags.ten = false; run.flags.beep = null; }
    say(fill(line(c === 1 ? 'ext1' : c === 2 ? 'ext2' : 'ext3'), { m, c }));
    SFX.ext(); buzz([40, 40, 40]);
    saveRun(); render();
  }
  function togglePause() {
    if (!run) return;
    if (run.pausedLeft == null) {
      run.pausedLeft = run.stepEnd - Date.now(); run.pausedAt = Date.now(); run.stats.pauses++;
      say(fill(line('pause')));
    } else {
      run.stepEnd = Date.now() + run.pausedLeft; run.pausedLeft = null;
      run.pausedMs += Date.now() - (run.pausedAt || Date.now()); run.pausedAt = null;
      say(fill(line('resume')));
    }
    saveRun(); render();
  }
  function finishEarly() {
    if (!run) return;
    const left = Math.max(0, leftMs());
    run.stats.early++; run.stats.savedSec += left / 1000;
    if (run.pausedLeft != null) { run.pausedMs += Date.now() - (run.pausedAt || Date.now()); run.pausedLeft = null; run.pausedAt = null; }
    if (run.idx >= run.routine.steps.length - 1) { finish(); return; }
    const prev = cur().name;
    run.idx++;
    const d = durSec(cur());
    run.stepEnd = Date.now() + d * 1000; run.stepTotal = d;
    enterStep('early', prev, { left: human(left / 1000) });
    saveRun();
  }
  function restartStep() {
    if (!run) return;
    const s = cur(), d = durSec(s);
    run.stepTotal = d;
    if (run.pausedLeft != null) run.pausedLeft = d * 1000; else run.stepEnd = Date.now() + d * 1000;
    run.flags = {};
    say(fill(line('restart'), { s: s.name, d: human(d) }));
    saveRun(); render();
  }

  function finish() {
    stopLoop(); releaseAwake();
    const r = run.routine, st = run.stats;
    const planned = routineSec(r);
    const actual = Math.round((Date.now() - run.startedAt) / 1000);
    const score = clamp(Math.round(100 - (st.extSec / 60) * 4 - st.pauses * 3 + Math.min(5, st.savedSec / 60)), 0, 100);
    const gi = GRADES.findIndex((g) => score >= g.min);
    const late = run.deadline ? Date.now() - run.deadline : null;
    lastResult = { routineId: r.id, name: r.name, planned, actual, score, gi, stats: st, endLine: r.endLine, late, deadline: run.deadline };
    history.push({ id: r.id, name: r.name, at: Date.now(), planned, actual, score });
    history = history.slice(-200); store.set('history', history);
    run = null; saveRun(); hurry = null;
    renderDone();
  }

  /* ================================================================== 완료 */
  function renderDone() {
    view = 'done';
    document.documentElement.style.removeProperty('--hue');
    const R = lastResult, st = R.stats, grade = GRADES[R.gi];
    const text = R.score >= 90 && R.endLine && settings.tone === 'fact' ? fill(R.endLine) : fill(tone().grades[R.gi]);
    const diff = R.actual - R.planned;
    const dl = R.deadline != null
      ? `<span class="chip ${R.late <= 30000 ? 'ok' : 'late'}">⏰ 마감 ${clock(R.deadline)} · ${R.late <= 30000 ? minsWord(R.late) + ' 일찍 끝' : minsWord(R.late) + ' 지각'}</span>` : '';
    app.innerHTML = `<section class="view done">
      <div class="mascots">${jSvg('cheer')}${pSvg(R.score >= 50 ? 'down' : 'smug')}</div>
      <div class="label">${esc(R.name)} 완주</div>
      <h2 class="grade">${grade.title}</h2>
      <div class="score">J 지수 ${R.score} / 100</div>
      ${dl}
      <p class="line">${esc(text)}</p>
      <dl class="card stats">
        <div><dt>계획</dt><dd>${mmss(R.planned)}</dd></div>
        <div><dt>실제</dt><dd>${mmss(Math.min(R.actual, 5999))}<small>${diff > 5 ? '+' + human(diff) : diff < -5 ? '−' + human(-diff) : '정시'}</small></dd></div>
        <div><dt>연장</dt><dd>${st.ext}회<small>${st.extSec ? '+' + human(st.extSec) : ''}</small></dd></div>
        <div><dt>일찍 끝낸 단계</dt><dd>${st.early}개<small>${st.savedSec >= 1 ? human(st.savedSec) + ' 절약' : ''}</small></dd></div>
      </dl>
      <div class="btns">
        <button class="btn" data-act="home">홈으로</button>
        <button class="btn primary" data-act="start" data-id="${R.routineId}">한 번 더</button>
      </div>
    </section>`;
    speak(text); SFX.win(); buzz([100, 50, 100, 50, 300]); confetti();
    notify('🎉 ' + grade.title, text);
    window.scrollTo(0, 0);
  }

  function confetti() {
    const cv = $('#confetti'); if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    cv.hidden = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    const colors = ['#4fe3f0', '#3dff8f', '#2f6df0', '#f08a24', '#cfc8f4', '#ffd23f'];
    const ps = Array.from({ length: 150 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 18 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
      w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: pick(colors),
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach((p) => { p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
    })(t0);
  }

  /* ================================================================== 이벤트 */
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, i = +b.dataset.i;
    switch (act) {
      case 'sheet-close': if (e.target === b || b.tagName === 'BUTTON') closeSheet(); break;
      case 'settings': openSettings(); break;
      case 'home': draft = null; renderHome(); break;
      case 'new': openEditor(null); break;
      case 'edit': openEditor(b.dataset.id); break;
      case 'start': startRoutine(b.dataset.id); break;
      case 'start-fit': startRoutine(b.dataset.id, { fit: true }); break;
      case 'ed-save': saveDraft(); break;
      case 'ed-nodl': draft.deadline = null; renderEditor(); break;
      case 'ed-add': draft.steps.push({ id: uid(), name: '', min: 5, emoji: '⏱️', motion: 'generic', auto: true }); renderSteps(); renderAlloc(); { const last = $('#ed-steps').lastElementChild; last && last.querySelector('input').focus(); } break;
      case 'ed-min': draft.steps[i].min = clamp(draft.steps[i].min + +b.dataset.d, 1, 99); b.parentNode.querySelector('output').textContent = draft.steps[i].min + '분'; renderAlloc(); break;
      case 'ed-move': { const j = i + +b.dataset.d; const a = draft.steps; [a[i], a[j]] = [a[j], a[i]]; renderSteps(); renderAlloc(); break; }
      case 'ed-del': draft.steps.splice(i, 1); renderSteps(); renderAlloc(); break;
      case 'ed-emoji': pickEmoji(i); break;
      case 'ed-fit': { const last = draft.steps[draft.steps.length - 1]; last.min = clamp(last.min + (draft.target - draft.steps.reduce((a, s) => a + s.min, 0)), 1, 99); renderSteps(); renderAlloc(); break; }
      case 'ed-delete': {
        const ok = await confirmSheet({ title: `'${draft.name || '이 루틴'}'을 삭제할까요?`, body: '삭제하면 되돌릴 수 없어요.', ok: '삭제', danger: true });
        if (ok) { const id = draft.id; draft = null; routines = routines.filter((r) => r.id !== id); saveRoutines(); renderHome(); toast('삭제했어요.'); }
        break;
      }
      case 'ext': extend(+b.dataset.m); break;
      case 'pause': togglePause(); break;
      case 'early': finishEarly(); break;
      case 'restart-step': restartStep(); break;
      case 'quit': {
        const ok = await confirmSheet({ title: '진짜 그만두시게요?', body: fill(line('quit')) + ' 기록은 남지 않아요.', ok: '그만두기', cancel: '계속하기', danger: true });
        if (ok) { run = null; hurry = null; saveRun(); try { speechSynthesis.cancel(); } catch (err) { /* noop */ } renderHome(); }
        break;
      }
      default: break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && layer.innerHTML) { const no = $('#cf-no', layer); if (no) no.click(); else closeSheet(); }
    if (view === 'timer' && !layer.innerHTML && e.target === document.body) {
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
      if (e.key === 'Enter') finishEarly();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && run) { keepAwake(); tick(); }
  });

  /* ------------------------------------------------------------------ 시작 */
  applySkin();
  const saved = store.get('run', null);
  if (saved && saved.routine && Date.now() - saved.startedAt < 4 * 3600e3) {
    renderHome();
    confirmSheet({ title: `'${saved.routine.name}' 이어서 할까요?`, body: '앱이 닫히기 전에 진행 중이던 루틴이 있어요. 그동안 흐른 시간은 그대로 반영돼요.', ok: '이어서 하기', cancel: '버리기' })
      .then((ok) => {
        if (!ok) { store.del('run'); return; }
        run = saved; renderTimer(); enterStep('resume'); say(fill(line('back'), { s: cur().name })); startLoop(); keepAwake();
      });
  } else {
    store.del('run');
    renderHome();
  }
})();
