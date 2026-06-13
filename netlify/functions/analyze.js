// Netlify Function: 손글씨 사진을 Gemini 2.5 Flash로 읽어 텍스트로 돌려줍니다.
// API 키는 Netlify 환경변수(GEMINI_API_KEY)에서만 읽으므로 브라우저에 노출되지 않습니다.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROMPT = `이 이미지에 손으로 쓴 글씨가 있습니다.
이미지에 보이는 글자를 일관된 기준으로 정확하게 읽어주세요.

판독 기준 (가장 중요):
- 누가 보더라도 같은 글자로 읽을 만큼 명확한 글자만 그 글자로 읽으세요
- 사람에 따라 다르게 읽을 수 있는 글자(예: 받침이 모호함, 모음 방향이 불분명함, 두 글자 이상으로 해석될 수 있음)는 추측하지 말고 '?' 로 표시하세요
- 문맥이나 앞뒤 글자를 근거로 애매한 글자를 보정해서 읽지 마세요. 글자 하나하나의 모양만으로 판단하세요
- 단, 획이 다소 삐뚤거나 크기가 고르지 않아도 다른 글자로 혼동할 여지가 없으면 정상적으로 읽으세요

기타 규칙:
- 글씨가 겹치거나 이어진 경우 각 글자를 분리해서 읽으세요
- 이미지에 없는 내용을 새로 만들어내지 마세요

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
