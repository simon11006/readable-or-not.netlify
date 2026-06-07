// Netlify Function: 손글씨 사진을 Gemini 2.5 Flash로 읽어 텍스트로 돌려줍니다.
// API 키는 Netlify 환경변수(GEMINI_API_KEY)에서만 읽으므로 브라우저에 노출되지 않습니다.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROMPT = `이 이미지에 손으로 쓴 글씨가 있습니다.
이미지에 보이는 글자를 있는 그대로 정확하게 읽어주세요.

중요한 규칙:
- 글자가 흐리거나 불명확하면 추측하지 말고 그대로 '?' 로 표시하세요
- 비슷하게 생긴 글자라도 정확히 보이는 것만 읽으세요
- 글씨가 겹치거나 이어진 경우 각 글자를 분리해서 읽으세요
- 원본이 무엇인지 추측하지 마세요. 오직 이미지에 보이는 것만 읽으세요

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "recognized_text": "이미지에서 읽은 텍스트 (불명확한 글자는 ? 로 표시)",
  "confidence": "high 또는 medium 또는 low",
  "unclear_parts": ["불명확하거나 읽기 어려웠던 부분 설명"]
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

  const { imageBase64, mimeType, targetSentence } = body;
  if (!imageBase64 || !targetSentence) {
    return json(400, { error: '이미지와 대상 문장이 필요합니다.' });
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
    return json(200, {
      recognizedText: parsed.recognized_text || '',
      confidence: parsed.confidence || 'low',
      unclearParts: parsed.unclear_parts || [],
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
