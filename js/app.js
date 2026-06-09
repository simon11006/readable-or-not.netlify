// ───────────────────────────────────────────────
//  이게 글씨냐!!!  메인 로직
// ───────────────────────────────────────────────

const HISTORY_KEY = 'handwrite-history';

// 현재 상태
const state = {
  contentType: 'sentence', // 'sentence' | 'paragraph' | 'read'
  difficulty: 'easy',      // 'easy' | 'medium' | 'hard' | 'all'
  picked: null,            // 홈에서 추천된 문장 객체
  currentText: '',         // 연습 중인 문장 텍스트
  imageBase64: null,       // 업로드/촬영한 이미지 데이터
  mimeType: 'image/jpeg',
};

// ───── 글자 비교 (레벤슈타인 정렬) ─────

function normalize(text) {
  return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp;
}

function compareTexts(original, recognized) {
  const origChars = Array.from(normalize(original));
  const origLetters = origChars.filter((c) => c !== ' ');
  const recogLetters = Array.from(normalize(recognized)).filter((c) => c !== ' ');

  const dp = levenshtein(origLetters.join(''), recogLetters.join(''));
  const alignment = [];
  let i = origLetters.length, j = recogLetters.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLetters[i - 1] === recogLetters[j - 1]) {
      alignment.unshift({ orig: origLetters[i - 1], recog: recogLetters[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || (dp[i][j - 1] <= dp[i - 1][j] && dp[i][j - 1] <= dp[i - 1][j - 1]))) {
      j--;
    } else if (i > 0 && (j === 0 || (dp[i - 1][j] <= dp[i][j - 1] && dp[i - 1][j] <= dp[i - 1][j - 1]))) {
      alignment.unshift({ orig: origLetters[i - 1], recog: '?' });
      i--;
    } else {
      alignment.unshift({ orig: origLetters[i - 1], recog: recogLetters[j - 1] });
      i--; j--;
    }
  }

  const results = [];
  let idx = 0;
  for (const ch of origChars) {
    if (ch === ' ') {
      results.push({ original: ' ', recognized: ' ', isCorrect: true });
    } else {
      const item = alignment[idx] || { orig: ch, recog: '?' };
      results.push({ original: item.orig, recognized: item.recog, isCorrect: item.orig === item.recog });
      idx++;
    }
  }

  const letters = results.filter((r) => r.original !== ' ');
  const correct = letters.filter((r) => r.isCorrect).length;
  const score = letters.length ? Math.round((correct / letters.length) * 100) : 0;
  return { results, score, correct, total: letters.length };
}

function scoreMessage(score) {
  if (score === 100) return { msg: '완벽합니다! 글씨를 정말 잘 썼어요!', emoji: '🏆' };
  if (score >= 90)  return { msg: '훌륭해요! 조금만 더 다듬으면 완벽해요!', emoji: '🎉' };
  if (score >= 70)  return { msg: '잘 했어요! 틀린 글자를 다시 연습해보세요.', emoji: '👍' };
  if (score >= 50)  return { msg: '절반은 맞았어요! 더 또렷하게 써보세요.', emoji: '✏️' };
  return { msg: '다시 도전해보세요! 천천히 또박또박 써보세요.', emoji: '🔥' };
}

// ───── 기록 저장 (localStorage) ─────

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(entry) {
  const list = loadHistory();
  list.unshift({ ...entry, date: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
}

// ───── 화면 전환 ─────

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => (v.hidden = true));
  document.getElementById('view-' + name).hidden = false;
  window.scrollTo(0, 0);
}

// ───── 홈 화면 ─────

function renderHome() {
  // 탭
  document.querySelectorAll('[data-type]').forEach((btn) => {
    btn.classList.toggle('tab-active', btn.dataset.type === state.contentType);
  });
  const isReadMode = state.contentType === 'read';
  document.getElementById('challenge-panel').hidden = isReadMode;
  document.getElementById('read-panel').hidden = !isReadMode;
  document.getElementById('pick-wrap').hidden = isReadMode;

  if (isReadMode) return;

  // 난이도
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.classList.toggle('level-active', btn.dataset.diff === state.difficulty);
  });
  // 추천 문장
  state.picked = getRandomSentence(state.difficulty, state.contentType);
  renderPicked();
  renderList();
}

function renderPicked() {
  const box = document.getElementById('picked-text');
  if (!state.picked) { box.textContent = '문장이 없습니다.'; return; }
  box.textContent = state.picked.text;
  box.classList.toggle('picked-paragraph', state.contentType === 'paragraph');
  document.getElementById('btn-start-card').textContent =
    state.contentType === 'paragraph' ? '이 문단으로 도전' : '이 문장으로 도전';
}

function shufflePicked() {
  const next = getRandomSentence(state.difficulty, state.contentType, state.picked?.id);
  if (next) { state.picked = next; renderPicked(); }
}

function renderList() {
  const wrap = document.getElementById('pick-list');
  const items = getSentences('all', state.contentType);
  wrap.innerHTML = items.map((s) => `
    <button class="list-row" data-pick="${s.id}">
      <span class="list-text">${escapeHtml(s.text.replace(/\n/g, ' '))}</span>
      <span class="list-diff">${diffLabel(s.difficulty)}</span>
    </button>`).join('');
}

// ───── 연습 화면 ─────

function startPractice(text) {
  state.currentText = text;
  state.imageBase64 = null;
  const isPara = text.includes('\n');

  document.getElementById('practice-kind').textContent = isPara ? '문단 도전' : '문장 도전';
  document.getElementById('btn-print').hidden = false;
  const display = document.getElementById('practice-sentence');
  display.classList.toggle('para', isPara);
  display.innerHTML = text.split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  document.getElementById('practice-hint').textContent =
    isPara ? '위 문단을 종이에 또박또박 써주세요' : '위 문장을 종이에 크게 또박또박 써주세요';
  document.getElementById('capture-title').textContent = '사진 업로드';

  resetCapture();
  showView('practice');
}

function startReadCheck() {
  state.currentText = '';
  state.imageBase64 = null;

  document.getElementById('practice-kind').textContent = 'AI 판독';
  document.getElementById('btn-print').hidden = true;
  const display = document.getElementById('practice-sentence');
  display.classList.remove('para');
  display.innerHTML = '<p>자유롭게 쓴 손글씨를 찍어주세요</p>';
  document.getElementById('practice-hint').textContent =
    'AI가 사진 속 글씨를 어떻게 읽는지 그대로 확인합니다';
  document.getElementById('capture-title').textContent = '판독할 사진';

  resetCapture();
  showView('practice');
}

// ───── 결과 화면 ─────

function renderResult(text, recognizedText) {
  document.getElementById('score-card').hidden = false;
  document.getElementById('chars-card').hidden = false;
  document.getElementById('read-result-card').hidden = true;
  document.getElementById('btn-result-retry').textContent = '다시 도전';

  const { results, score, correct, total } = compareTexts(text, recognizedText);
  saveHistory({ text, score, type: text.includes('\n') ? 'paragraph' : 'sentence' });

  const { msg, emoji } = scoreMessage(score);
  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-score').textContent = score;
  document.getElementById('result-message').textContent = msg;
  document.getElementById('result-bar').style.width = score + '%';
  document.getElementById('result-correct').textContent = correct;
  document.getElementById('result-wrong').textContent = total - correct;

  // 글자별 표시
  const chips = document.getElementById('result-chars');
  chips.innerHTML = results.map((r) => {
    if (r.original === ' ') return '<span class="chip-space"></span>';
    const cls = r.isCorrect ? 'chip chip-ok' : 'chip chip-no';
    return `
      <span class="${cls}">
        <span class="chip-original">${escapeHtml(r.original)}</span>
        <span class="chip-recognized">${escapeHtml(r.recognized || '?')}</span>
      </span>`;
  }).join('');

  showView('result');
}

function renderReadResult(recognizedText, confidence) {
  document.getElementById('score-card').hidden = true;
  document.getElementById('chars-card').hidden = true;
  document.getElementById('read-result-card').hidden = false;
  document.getElementById('btn-result-retry').textContent = '다시 확인';
  document.getElementById('result-recognized').textContent =
    recognizedText || 'AI가 읽어낸 글자가 없습니다.';
  document.getElementById('result-confidence').textContent =
    confidence ? `판독 확신도: ${confidence}` : '';
  showView('result');
}

// ───── 기록 화면 ─────

function renderHistory() {
  const list = loadHistory();
  const wrap = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');

  if (list.length === 0) {
    wrap.innerHTML = '';
    empty.hidden = false;
    showView('history');
    return;
  }
  empty.hidden = true;
  wrap.innerHTML = list.map((h) => `
    <div class="hist-row">
      <div class="hist-main">
        <span class="hist-text">${escapeHtml(h.text.replace(/\n/g, ' '))}</span>
        <span class="hist-date">${formatDate(h.date)}</span>
      </div>
      <span class="hist-score ${scoreColor(h.score)}">${h.score}점</span>
    </div>`).join('');
  showView('history');
}

// ───── 카메라 / 업로드 ─────

function resetCapture() {
  state.imageBase64 = null;
  document.getElementById('capture-idle').hidden = false;
  document.getElementById('capture-preview').hidden = true;
  document.getElementById('analyze-loading').hidden = true;
  document.getElementById('practice-error').hidden = true;
  document.getElementById('camera-input').value = '';
  document.getElementById('file-input').value = '';
}

function startCamera() {
  document.getElementById('camera-input').click();
}

function handleFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => showPreview(e.target.result, file.type || 'image/jpeg');
  reader.readAsDataURL(file);
}

function showPreview(dataUrl, mimeType) {
  state.imageBase64 = dataUrl.split(',')[1];
  state.mimeType = mimeType;
  document.getElementById('preview-img').src = dataUrl;
  document.getElementById('capture-idle').hidden = true;
  document.getElementById('capture-preview').hidden = false;
}

// ───── 분석 요청 ─────

async function analyze() {
  if (!state.imageBase64) return;
  document.getElementById('capture-preview').hidden = true;
  document.getElementById('analyze-loading').hidden = false;
  document.getElementById('practice-error').hidden = true;

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: state.imageBase64,
        mimeType: state.mimeType,
        targetSentence: state.currentText || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '분석 실패');
    if (state.currentText) {
      renderResult(state.currentText, data.recognizedText);
    } else {
      renderReadResult(data.recognizedText, data.confidence);
    }
  } catch (err) {
    document.getElementById('analyze-loading').hidden = true;
    document.getElementById('capture-preview').hidden = false;
    showError(err.message || '오류가 발생했습니다.');
  }
}

function showError(msg) {
  const box = document.getElementById('practice-error');
  box.textContent = msg;
  box.hidden = false;
}

// ───── 보조 함수 ─────

function diffLabel(d) {
  return d === 'easy' ? '쉬움' : d === 'medium' ? '보통' : '어려움';
}
function scoreColor(score) {
  return score >= 90 ? 'sc-high' : score >= 70 ? 'sc-mid' : 'sc-low';
}
function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ───── 이벤트 연결 ─────

document.addEventListener('DOMContentLoaded', () => {
  // 탭
  document.querySelectorAll('[data-type]').forEach((btn) => {
    btn.addEventListener('click', () => { state.contentType = btn.dataset.type; renderHome(); });
  });
  // 난이도
  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => { state.difficulty = btn.dataset.diff; renderHome(); });
  });
  // 추천 셔플
  document.getElementById('btn-shuffle').addEventListener('click', shufflePicked);
  // 도전 시작
  document.getElementById('btn-start-card').addEventListener('click', () => state.picked && startPractice(state.picked.text));
  document.getElementById('btn-start-read').addEventListener('click', startReadCheck);
  // 직접 고르기 토글
  document.getElementById('btn-toggle-list').addEventListener('click', () => {
    document.getElementById('pick-panel').hidden = !document.getElementById('pick-panel').hidden;
    document.getElementById('btn-toggle-list').classList.toggle('open');
  });
  // 직접 입력
  document.getElementById('btn-custom').addEventListener('click', () => {
    const v = document.getElementById('custom-input').value.trim();
    if (v) startPractice(v);
  });
  // 목록에서 고르기 (이벤트 위임)
  document.getElementById('pick-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick]');
    if (!btn) return;
    const s = SENTENCES.find((x) => x.id === btn.dataset.pick);
    if (s) startPractice(s.text);
  });
  // 기록 보기
  document.getElementById('btn-history').addEventListener('click', renderHistory);

  // 연습 화면 버튼
  document.getElementById('btn-back-home').addEventListener('click', () => { resetCapture(); renderHome(); showView('home'); });
  document.getElementById('btn-print').addEventListener('click', () => {
    window.open('print.html?sentence=' + encodeURIComponent(state.currentText), '_blank');
  });
  document.getElementById('btn-camera').addEventListener('click', startCamera);
  document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('camera-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
  document.getElementById('file-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
  document.getElementById('btn-retake').addEventListener('click', resetCapture);
  document.getElementById('btn-analyze').addEventListener('click', analyze);

  // 결과 화면 버튼
  document.getElementById('btn-result-retry').addEventListener('click', () => {
    if (state.currentText) startPractice(state.currentText);
    else startReadCheck();
  });
  const goHome = () => { renderHome(); showView('home'); };
  document.getElementById('btn-result-home').addEventListener('click', goHome);
  document.getElementById('btn-result-home-bottom').addEventListener('click', goHome);

  // 기록 화면 버튼
  document.getElementById('btn-history-home').addEventListener('click', () => { renderHome(); showView('home'); });

  // 시작
  renderHome();
  showView('home');
});
