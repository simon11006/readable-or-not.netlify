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

function compareTexts(original, recognized, clarity = []) {
  const origChars = Array.from(normalize(original));
  const origLetters = origChars.filter((c) => c !== ' ');

  // 인식된 글자와 또렷함(clear) 여부를 짝지어 두고, 공백은 제외
  const recogPairs = [];
  Array.from(recognized || '').forEach((ch, k) => {
    if (/\s/.test(ch)) return;
    recogPairs.push({ ch, clear: clarity[k] !== false });
  });
  const recogLetters = recogPairs.map((p) => p.ch);

  const dp = levenshtein(origLetters.join(''), recogLetters.join(''));
  const alignment = [];
  let i = origLetters.length, j = recogLetters.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLetters[i - 1] === recogLetters[j - 1]) {
      alignment.unshift({ orig: origLetters[i - 1], recog: recogLetters[j - 1], clear: recogPairs[j - 1].clear });
      i--; j--;
    } else if (j > 0 && (i === 0 || (dp[i][j - 1] <= dp[i - 1][j] && dp[i][j - 1] <= dp[i - 1][j - 1]))) {
      j--;
    } else if (i > 0 && (j === 0 || (dp[i - 1][j] <= dp[i][j - 1] && dp[i - 1][j] <= dp[i - 1][j - 1]))) {
      alignment.unshift({ orig: origLetters[i - 1], recog: '–', clear: true });
      i--;
    } else {
      alignment.unshift({ orig: origLetters[i - 1], recog: recogLetters[j - 1], clear: recogPairs[j - 1].clear });
      i--; j--;
    }
  }

  const results = [];
  let idx = 0;
  for (const ch of origChars) {
    if (ch === ' ') {
      results.push({ original: ' ', recognized: ' ', isCorrect: true, status: 'space' });
    } else {
      const item = alignment[idx] || { orig: ch, recog: '–', clear: true };
      const matched = item.orig === item.recog;
      // 글자가 맞아도 또렷하지 않으면(흐림) 정답으로 인정하지 않음
      const status = matched ? (item.clear ? 'ok' : 'messy') : 'wrong';
      results.push({ original: item.orig, recognized: item.recog, isCorrect: status === 'ok', status });
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
  document.getElementById('practice-title-text').textContent = '종이에 따라 써보세요';
  document.getElementById('btn-print').hidden = false;
  const display = document.getElementById('practice-sentence');
  display.classList.toggle('para', isPara);
  display.innerHTML = text.split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  document.getElementById('practice-hint').textContent = '';
  document.getElementById('practice-hint').hidden = true;
  document.getElementById('capture-title').textContent = '사진 업로드';

  resetCapture();
  showView('practice');
}

function startReadCheck() {
  state.currentText = '';
  state.imageBase64 = null;

  document.getElementById('practice-kind').textContent = 'AI 판독';
  document.getElementById('practice-title-text').textContent = '사진을 올려주세요';
  document.getElementById('btn-print').hidden = true;
  const display = document.getElementById('practice-sentence');
  display.classList.remove('para');
  display.innerHTML = '<p>자유롭게 쓴 손글씨를 찍어주세요</p>';
  document.getElementById('practice-hint').textContent = '';
  document.getElementById('practice-hint').hidden = true;
  document.getElementById('capture-title').textContent = '판독할 사진';

  resetCapture();
  showView('practice');
}

// ───── 결과 화면 ─────

function renderResult(text, recognizedText, clarity) {
  document.getElementById('score-card').hidden = false;
  document.getElementById('chars-card').hidden = false;
  document.getElementById('read-result-card').hidden = true;
  document.getElementById('btn-result-retry').textContent = '다시 도전';

  const { results, score, correct, total } = compareTexts(text, recognizedText, clarity);
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
    const cls = r.status === 'ok' ? 'chip chip-ok'
      : r.status === 'messy' ? 'chip chip-messy'
      : 'chip chip-no';
    const sub = r.status === 'messy' ? '부정확' : (r.recognized || '–');
    return `
      <span class="${cls}">
        <span class="chip-original">${escapeHtml(r.original)}</span>
        <span class="chip-recognized">${escapeHtml(sub)}</span>
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

let webcamStream = null;

function shouldUseNativeCameraApp() {
  const ua = navigator.userAgent || '';
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
  const isTabletLike = navigator.maxTouchPoints > 1 && window.matchMedia('(max-width: 1024px)').matches;
  return isMobileUa || isTabletLike;
}

function resetCapture() {
  stopWebcam();
  state.imageBase64 = null;
  document.getElementById('capture-idle').hidden = false;
  document.getElementById('capture-webcam').hidden = true;
  document.getElementById('capture-preview').hidden = true;
  document.getElementById('capture-crop').hidden = true;
  document.getElementById('analyze-loading').hidden = true;
  document.getElementById('practice-error').hidden = true;
  document.getElementById('camera-input').value = '';
  document.getElementById('file-input').value = '';
}

function startCamera() {
  if (!shouldUseNativeCameraApp()) {
    startWebcam();
    return;
  }
  document.getElementById('camera-input').click();
}

async function startWebcam() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showError('이 브라우저에서는 웹캠을 열 수 없습니다. 업로드를 이용해주세요.');
    return;
  }

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    const video = document.getElementById('webcam-video');
    video.srcObject = webcamStream;
    document.getElementById('capture-idle').hidden = true;
    document.getElementById('capture-webcam').hidden = false;
    await video.play();
  } catch {
    showError('웹캠을 열 수 없습니다. 업로드를 이용해주세요.');
  }
}

function stopWebcam() {
  if (!webcamStream) return;
  webcamStream.getTracks().forEach((track) => track.stop());
  webcamStream = null;
  document.getElementById('webcam-video').srcObject = null;
}

function takeWebcamPhoto() {
  const video = document.getElementById('webcam-video');
  if (!video.videoWidth || !video.videoHeight) {
    showError('웹캠 화면을 아직 불러오는 중입니다.');
    return;
  }

  const canvas = document.getElementById('webcam-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  stopWebcam();
  showPreview(dataUrl, 'image/jpeg');
}

function handleFile(file) {
  if (!file) return;
  if (file.type && !file.type.startsWith('image/')) {
    showError('이미지 파일만 업로드할 수 있습니다.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => showPreview(e.target.result, file.type || 'image/jpeg');
  reader.readAsDataURL(file);
}

function handleDropzoneDrag(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.add('dropzone-active');
}

function handleDropzoneLeave(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('dropzone-active');
}

function handleDropzoneDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('dropzone-active');
  handleFile(e.dataTransfer?.files?.[0]);
}

function showPreview(dataUrl, mimeType) {
  state.imageBase64 = dataUrl.split(',')[1];
  state.mimeType = mimeType;
  document.getElementById('preview-img').src = dataUrl;
  document.getElementById('capture-idle').hidden = true;
  document.getElementById('capture-webcam').hidden = true;
  document.getElementById('capture-preview').hidden = false;
}

function rotatePreview(degrees) {
  if (!state.imageBase64) return;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const quarterTurn = Math.abs(degrees) % 180 === 90;
    canvas.width = quarterTurn ? img.naturalHeight : img.naturalWidth;
    canvas.height = quarterTurn ? img.naturalWidth : img.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    const outputMime = state.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    showPreview(canvas.toDataURL(outputMime, 0.92), outputMime);
  };
  img.src = document.getElementById('preview-img').src;
}

function flipPreviewHorizontal() {
  if (!state.imageBase64) return;

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);

    const outputMime = state.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    showPreview(canvas.toDataURL(outputMime, 0.92), outputMime);
  };
  img.src = document.getElementById('preview-img').src;
}

// ───── 사진 자르기 ─────

let cropBox = null;        // { x, y, w, h } — 화면에 표시된 이미지 기준 px
let cropDrag = null;       // 현재 드래그 상태

function openCrop() {
  if (!state.imageBase64) return;
  const cropImg = document.getElementById('crop-img');
  cropImg.onload = () => initCropBox();
  cropImg.src = document.getElementById('preview-img').src;
  document.getElementById('capture-preview').hidden = true;
  document.getElementById('capture-crop').hidden = false;
}

function initCropBox() {
  const img = document.getElementById('crop-img');
  const w = img.clientWidth, h = img.clientHeight;
  // 기본값: 가운데 80% 영역
  cropBox = { x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8 };
  renderCropBox();
}

function renderCropBox() {
  const box = document.getElementById('crop-box');
  box.style.left = cropBox.x + 'px';
  box.style.top = cropBox.y + 'px';
  box.style.width = cropBox.w + 'px';
  box.style.height = cropBox.h + 'px';
}

function cropBounds() {
  const img = document.getElementById('crop-img');
  return { w: img.clientWidth, h: img.clientHeight };
}

function startCropDrag(e, handle) {
  e.preventDefault();
  const stage = document.getElementById('crop-stage');
  const rect = stage.getBoundingClientRect();
  cropDrag = {
    handle,                       // null = 이동, 'nw'/'ne'/'sw'/'se' = 크기 조절
    px: e.clientX - rect.left,
    py: e.clientY - rect.top,
    start: { ...cropBox },
  };
  document.getElementById('crop-stage').setPointerCapture?.(e.pointerId);
  window.addEventListener('pointermove', moveCropDrag);
  window.addEventListener('pointerup', endCropDrag);
}

function moveCropDrag(e) {
  if (!cropDrag) return;
  const stage = document.getElementById('crop-stage');
  const rect = stage.getBoundingClientRect();
  const { w: bw, h: bh } = cropBounds();
  const cx = Math.max(0, Math.min(bw, e.clientX - rect.left));
  const cy = Math.max(0, Math.min(bh, e.clientY - rect.top));
  const dx = cx - cropDrag.px;
  const dy = cy - cropDrag.py;
  const s = cropDrag.start;
  const MIN = 30;

  if (!cropDrag.handle) {
    // 이동
    cropBox.x = Math.max(0, Math.min(bw - s.w, s.x + dx));
    cropBox.y = Math.max(0, Math.min(bh - s.h, s.y + dy));
  } else {
    let left = s.x, top = s.y, right = s.x + s.w, bottom = s.y + s.h;
    if (cropDrag.handle.includes('w')) left = Math.min(right - MIN, Math.max(0, s.x + dx));
    if (cropDrag.handle.includes('e')) right = Math.max(left + MIN, Math.min(bw, s.x + s.w + dx));
    if (cropDrag.handle.includes('n')) top = Math.min(bottom - MIN, Math.max(0, s.y + dy));
    if (cropDrag.handle.includes('s')) bottom = Math.max(top + MIN, Math.min(bh, s.y + s.h + dy));
    cropBox = { x: left, y: top, w: right - left, h: bottom - top };
  }
  renderCropBox();
}

function endCropDrag() {
  cropDrag = null;
  window.removeEventListener('pointermove', moveCropDrag);
  window.removeEventListener('pointerup', endCropDrag);
}

function applyCrop() {
  if (!cropBox) return;
  const img = document.getElementById('crop-img');
  const scaleX = img.naturalWidth / img.clientWidth;
  const scaleY = img.naturalHeight / img.clientHeight;
  const sx = Math.round(cropBox.x * scaleX);
  const sy = Math.round(cropBox.y * scaleY);
  const sw = Math.round(cropBox.w * scaleX);
  const sh = Math.round(cropBox.h * scaleY);
  if (sw < 1 || sh < 1) { cancelCrop(); return; }

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const outputMime = state.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  document.getElementById('capture-crop').hidden = true;
  showPreview(canvas.toDataURL(outputMime, 0.92), outputMime);
}

function cancelCrop() {
  document.getElementById('capture-crop').hidden = true;
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
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '분석 실패');
    if (state.currentText) {
      renderResult(state.currentText, data.recognizedText, data.clarity);
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
  document.getElementById('dropzone').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('dropzone').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-input').click();
    }
  });
  document.getElementById('dropzone').addEventListener('dragover', handleDropzoneDrag);
  document.getElementById('dropzone').addEventListener('dragenter', handleDropzoneDrag);
  document.getElementById('dropzone').addEventListener('dragleave', handleDropzoneLeave);
  document.getElementById('dropzone').addEventListener('drop', handleDropzoneDrop);
  document.getElementById('camera-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
  document.getElementById('file-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
  document.getElementById('btn-webcam-cancel').addEventListener('click', resetCapture);
  document.getElementById('btn-webcam-take').addEventListener('click', takeWebcamPhoto);
  document.getElementById('btn-rotate-left').addEventListener('click', () => rotatePreview(-90));
  document.getElementById('btn-flip-horizontal').addEventListener('click', flipPreviewHorizontal);
  document.getElementById('btn-rotate-right').addEventListener('click', () => rotatePreview(90));
  document.getElementById('btn-crop').addEventListener('click', openCrop);
  document.getElementById('btn-retake').addEventListener('click', resetCapture);
  document.getElementById('btn-analyze').addEventListener('click', analyze);

  // 자르기 상호작용
  document.getElementById('crop-box').addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.crop-handle');
    startCropDrag(e, handle ? handle.dataset.handle : null);
  });
  // 자르기 영역을 조정하는 동안 페이지가 위아래로 스크롤되지 않도록 막기
  document.addEventListener('touchmove', (e) => {
    if (cropDrag) e.preventDefault();
  }, { passive: false });
  document.getElementById('btn-crop-cancel').addEventListener('click', cancelCrop);
  document.getElementById('btn-crop-apply').addEventListener('click', applyCrop);

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
