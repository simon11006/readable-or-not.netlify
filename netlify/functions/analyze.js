// Netlify Function: 손글씨 사진을 Gemini 2.5 Flash로 읽어 텍스트로 돌려줍니다.
// API 키는 Netlify 환경변수(GEMINI_API_KEY)에서만 읽으므로 브라우저에 노출되지 않습니다.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROMPT = `이 이미지에 손으로 쓴 글씨가 있습니다.
이미지에 실제로 그려진 획을 그대로, 보이는 모양 그대로 엄격하게 읽어주세요.

중요한 규칙:
- 획의 모양 그대로 읽으세요. 글씨가 서툴거나 모양이 어긋나도, 보이는 모양에 가장 가까운 글자로 읽으세요
- 문맥이나 흔한 단어에 맞춰 글자를 바로잡지 마세요. 모양이 틀린 글자는 틀린 그대로 읽어야 합니다
- 받침, 모음 방향, 자음 모양이 어긋나면 어긋난 대로 다른 글자로 읽으세요. 너그럽게 봐주지 마세요
- 어떤 글자도 '?' 로 표시하지 마세요. 아무리 알아보기 어려워도 보이는 모양에 가장 가까운 글자 하나로 반드시 읽어내세요
- 글씨가 겹치거나 이어진 경우 각 글자를 분리해서 읽으세요
- 이미지에 없는 내용을 새로 만들어내지 마세요

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "recognized_text": "이미지에서 보이는 모양 그대로 읽은 텍스트 (? 사용 금지)",
  "confidence": "high 또는 medium 또는 low",
  "unclear_parts": ["읽기 어려웠던 부분 설명"]
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
