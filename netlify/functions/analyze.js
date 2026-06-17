// Netlify Function: 손글씨 사진을 Gemini 2.5 Flash로 읽어 텍스트로 돌려줍니다.
// API 키는 Netlify 환경변수(GEMINI_API_KEY)에서만 읽으므로 브라우저에 노출되지 않습니다.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROMPT = `이 이미지에 손으로 쓴 글씨가 있습니다.
당신은 글씨를 너그럽게 봐주지 않는 매우 엄격한 채점관입니다.
이미지에 실제로 그려진 획만 보고, 보이는 모양 그대로 읽어주세요.

가장 중요한 규칙 — 앞뒤 맥락 사용 금지:
- 앞뒤 글자, 단어의 뜻, 문장의 흐름, 맞춤법을 절대 사용하지 마세요.
- 각 글자를 평가할 때는 나머지 글자를 모두 가렸다고 상상하고, 그 글자 하나만 따로 떼어서 판단하세요.
- "이 단어라면 이 글자일 것이다" 같은 추측은 절대 금지입니다. 오직 그 칸에 그려진 획의 실제 모양만 보세요.

절대 규칙:
1. '?' 기호는 절대 출력하지 마세요. 아무리 알아보기 어려운 글자라도, 획의 생김새에 가장 가까운 한글 글자 하나를 반드시 골라 적으세요.
2. 절대 너그럽게 읽지 마세요. "이 글자처럼 보일 것 같다"는 이유로 맞다고 처리하면 안 됩니다.

글자 하나하나마다 두 가지를 판단해서 알려주세요:
- char: 그 칸에 그려진 획 모양에 가장 가까운 한글 글자 하나 ('?' 절대 금지)
- correct: 그 글자 하나만 따로 떼어서 보여줬을 때, 앞뒤 맥락을 모르는 사람 누구라도
  바로 그 글자로 정확히 읽을 수 있으면 true. 받침/모음/자음 중 하나라도 모양이 어긋나거나,
  다른 글자로 헷갈릴 수 있거나, 맥락이 없으면 무슨 글자인지 알기 어려우면 false.
  조금이라도 애매하면 엄격하게 false 로 하세요.

판독 기준 (엄격하게 적용):
- 받침이 빠졌으면 받침 없이, 받침이 잘못됐으면 잘못된 받침 그대로 읽으세요.
- 모음의 방향(ㅏ/ㅓ, ㅗ/ㅜ)이나 자음 모양(ㄱ/ㅋ, ㅁ/ㅂ 등)이 조금이라도 어긋나면 어긋난 대로 다른 글자로 읽으세요.
- 획이 빠지거나 더해졌으면 그 모양에 해당하는 다른 글자로 읽으세요.
- 글씨가 삐뚤거나 서툴면, 의도를 추측하지 말고 실제 모양에 가장 가까운 글자로만 읽으세요.
- 글씨가 겹치거나 이어진 경우 각 글자를 분리해서 읽으세요.
- 이미지에 없는 내용을 새로 만들어내지 마세요.
- 띄어쓰기(공백)는 char 를 " " 로, correct 를 true 로 하세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "characters": [ {"char": "글", "correct": true}, {"char": "씨", "correct": false} ],
  "confidence": "high 또는 medium 또는 low"
}`;

exports.handler = async (event) => {
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'POST 요청만 가능합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, { error: '서버에 API 키가 설정되지 않았습니다.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: '요청 형식이 올바르지 않습니다.' });
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64) {
    return json(400, { error: '이미지가 필요합니다.' });
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          topP: 0.1,
          topK: 1,
          candidateCount: 1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      return json(500, { error: 'AI 서버 호출에 실패했습니다.' });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // 응답에서 JSON 부분만 추출
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return json(500, { error: 'AI 응답을 해석할 수 없습니다.' });
    }

    const parsed = JSON.parse(match[0]);

    // 글자별 char/clear 배열을 텍스트와 또렷함(clarity) 배열로 변환
    let recognizedText = '';
    const clarity = [];
    if (Array.isArray(parsed.characters)) {
      for (const c of parsed.characters) {
        const ch = typeof c?.char === 'string' ? c.char : '';
        if (!ch) continue;
        const isCorrect = c.correct !== false && c.clear !== false;
        for (const unit of Array.from(ch)) {
          recognizedText += unit;
          clarity.push(isCorrect);
        }
      }
    } else if (typeof parsed.recognized_text === 'string') {
      // 옛 형식 호환
      recognizedText = parsed.recognized_text;
      for (const _ of Array.from(recognizedText)) clarity.push(true);
    }

    return json(200, {
      recognizedText,
      clarity,
      confidence: parsed.confidence || 'low',
    });
  } catch (err) {
    return json(500, { error: '분석 중 오류가 발생했습니다.' });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
