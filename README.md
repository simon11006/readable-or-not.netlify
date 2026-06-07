# 이게 글씨냐!!! — AI 손글씨 트레이너

초등학생이 문장을 따라 쓰고, 사진을 찍어 AI에게 채점받는 웹앱입니다.
**순수 HTML + CSS + JavaScript + Netlify Functions** 로 만들어졌습니다.

## 폴더 구조

```
handwrite-html/
├─ index.html              메인 화면 (홈 · 연습 · 결과 · 기록)
├─ print.html              연습지 인쇄 페이지 (A4 1장)
├─ css/style.css           전체 디자인
├─ js/data.js              연습 문장·문단 데이터
├─ js/app.js               화면 전환·채점·카메라 로직
├─ netlify/functions/
│  └─ analyze.js           Gemini 2.5 Flash 호출 (API 키 숨김)
├─ netlify.toml            Netlify 배포 설정
└─ package.json
```

## 작동 원리

1. 홈에서 문장을 고르고 종이에 손글씨로 씀
2. 사진을 찍거나 업로드 → 브라우저가 `/api/analyze` 로 전송
3. Netlify Function이 **Gemini 2.5 Flash** 로 손글씨를 읽음
4. 원래 문장과 글자 단위로 비교해 0~100점 + 틀린 글자 표시

> API 키는 Netlify 서버(환경변수)에서만 사용되므로 브라우저에 노출되지 않습니다.

## 배포 방법 (Netlify)

1. 이 폴더를 GitHub 저장소에 올립니다.
2. [Netlify](https://netlify.com) → **Add new site → Import an existing project** → 저장소 선택
3. 빌드 설정은 비워두고 배포 (정적 사이트 + 함수 자동 인식)
4. **Site configuration → Environment variables** 에서 추가:
   - Key: `GEMINI_API_KEY`
   - Value: [Google AI Studio](https://aistudio.google.com)에서 발급받은 키
5. 다시 배포 → 완료

## 로컬에서 테스트하기 (선택)

```bash
npm install -g netlify-cli
netlify dev
```

`.env` 파일에 `GEMINI_API_KEY=발급받은_키` 를 넣으면 채점까지 동작합니다.
(함수 없이 화면만 보려면 `index.html` 을 브라우저로 바로 열어도 됩니다.)
