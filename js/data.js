// 연습 문장/문단 데이터 + 선택 도우미 함수

const SENTENCES = [
  // ── 문장: 쉬움 ──────────────────────────────
  { id: 'k-easy-1',  type: 'sentence', text: '안녕하세요',    difficulty: 'easy' },
  { id: 'k-easy-2',  type: 'sentence', text: '반갑습니다',    difficulty: 'easy' },
  { id: 'k-easy-3',  type: 'sentence', text: '감사합니다',    difficulty: 'easy' },
  { id: 'k-easy-4',  type: 'sentence', text: '사랑해요',      difficulty: 'easy' },
  { id: 'k-easy-5',  type: 'sentence', text: '좋은 하루',     difficulty: 'easy' },
  { id: 'k-easy-6',  type: 'sentence', text: '행복한 날',     difficulty: 'easy' },
  { id: 'k-easy-7',  type: 'sentence', text: '잘 부탁해요',   difficulty: 'easy' },
  { id: 'k-easy-8',  type: 'sentence', text: '고맙습니다',    difficulty: 'easy' },
  { id: 'k-easy-9',  type: 'sentence', text: '오늘도 화이팅', difficulty: 'easy' },
  { id: 'k-easy-10', type: 'sentence', text: '잘 지냈어요',   difficulty: 'easy' },
  { id: 'k-easy-11', type: 'sentence', text: '맛있어요',      difficulty: 'easy' },
  { id: 'k-easy-12', type: 'sentence', text: '예쁜 꽃',       difficulty: 'easy' },
  { id: 'k-easy-13', type: 'sentence', text: '맑은 하늘',     difficulty: 'easy' },
  { id: 'k-easy-14', type: 'sentence', text: '귀여운 강아지', difficulty: 'easy' },
  { id: 'k-easy-15', type: 'sentence', text: '신나는 음악',   difficulty: 'easy' },
  { id: 'k-easy-16', type: 'sentence', text: '따뜻한 봄날',   difficulty: 'easy' },

  // ── 문장: 보통 ──────────────────────────────
  { id: 'k-med-1',  type: 'sentence', text: '오늘 날씨가 맑습니다',        difficulty: 'medium' },
  { id: 'k-med-2',  type: 'sentence', text: '열심히 공부하겠습니다',       difficulty: 'medium' },
  { id: 'k-med-3',  type: 'sentence', text: '맛있는 밥을 먹었어요',        difficulty: 'medium' },
  { id: 'k-med-4',  type: 'sentence', text: '책을 읽는 것이 좋아요',       difficulty: 'medium' },
  { id: 'k-med-5',  type: 'sentence', text: '내일 만나요 잘 자요',         difficulty: 'medium' },
  { id: 'k-med-6',  type: 'sentence', text: '꾸준히 연습하면 늡니다',      difficulty: 'medium' },
  { id: 'k-med-7',  type: 'sentence', text: '봄바람이 살랑살랑 불어요',    difficulty: 'medium' },
  { id: 'k-med-8',  type: 'sentence', text: '하늘이 높고 구름이 하얘요',   difficulty: 'medium' },
  { id: 'k-med-9',  type: 'sentence', text: '친구와 함께 공원을 걸었어요', difficulty: 'medium' },
  { id: 'k-med-10', type: 'sentence', text: '비가 오면 빨간 우산을 써요',  difficulty: 'medium' },
  { id: 'k-med-11', type: 'sentence', text: '내 꿈은 멋진 선생님이에요',   difficulty: 'medium' },
  { id: 'k-med-12', type: 'sentence', text: '가족과 함께하는 저녁이 좋아요', difficulty: 'medium' },
  { id: 'k-med-13', type: 'sentence', text: '따뜻한 차 한 잔이 생각나요',  difficulty: 'medium' },
  { id: 'k-med-14', type: 'sentence', text: '운동장에서 뛰어놀았어요',     difficulty: 'medium' },
  { id: 'k-med-15', type: 'sentence', text: '도서관에서 책을 빌렸어요',    difficulty: 'medium' },
  { id: 'k-med-16', type: 'sentence', text: '오늘도 최선을 다했어요',      difficulty: 'medium' },

  // ── 문장: 어려움 ─────────────────────────────
  { id: 'k-hard-1',  type: 'sentence', text: '대한민국 만세 우리나라 최고',       difficulty: 'hard' },
  { id: 'k-hard-2',  type: 'sentence', text: '가나다라마바사아자차카타파하',       difficulty: 'hard' },
  { id: 'k-hard-3',  type: 'sentence', text: '청춘의 피는 끓고 있다',             difficulty: 'hard' },
  { id: 'k-hard-4',  type: 'sentence', text: '봄 여름 가을 겨울 사계절',          difficulty: 'hard' },
  { id: 'k-hard-5',  type: 'sentence', text: '글씨를 또박또박 정성껏 씁니다',     difficulty: 'hard' },
  { id: 'k-hard-6',  type: 'sentence', text: '노력하는 사람은 반드시 빛난다',     difficulty: 'hard' },
  { id: 'k-hard-7',  type: 'sentence', text: '낙엽이 바람에 흩날리는 가을날',     difficulty: 'hard' },
  { id: 'k-hard-8',  type: 'sentence', text: '산 넘어 산 끝까지 포기하지 마라',   difficulty: 'hard' },
  { id: 'k-hard-9',  type: 'sentence', text: '꽃이 피고 새가 우는 봄날 아침',     difficulty: 'hard' },
  { id: 'k-hard-10', type: 'sentence', text: '반짝반짝 빛나는 밤하늘의 별들',     difficulty: 'hard' },
  { id: 'k-hard-11', type: 'sentence', text: '차가운 겨울바람이 뺨을 스쳐 지나가', difficulty: 'hard' },
  { id: 'k-hard-12', type: 'sentence', text: '무지개가 뜬 비 갠 하늘 아래',       difficulty: 'hard' },
  { id: 'k-hard-13', type: 'sentence', text: '파란 바다 위를 달리는 하얀 돛단배', difficulty: 'hard' },
  { id: 'k-hard-14', type: 'sentence', text: '깊은 산속 새벽의 고요한 공기',      difficulty: 'hard' },
  { id: 'k-hard-15', type: 'sentence', text: '울창한 숲속 작은 오두막집의 연기',  difficulty: 'hard' },
  { id: 'k-hard-16', type: 'sentence', text: '하늘을 나는 새들의 자유로운 날갯짓', difficulty: 'hard' },

  // ── 문단: 쉬움 ──────────────────────────────
  { id: 'p-easy-1', type: 'paragraph', difficulty: 'easy',
    text: '봄이 왔습니다.\n꽃이 피었습니다.\n날씨가 따뜻합니다.' },
  { id: 'p-easy-2', type: 'paragraph', difficulty: 'easy',
    text: '오늘은 좋은 날입니다.\n하늘이 맑고 푸릅니다.\n바람이 시원하게 붑니다.' },
  { id: 'p-easy-3', type: 'paragraph', difficulty: 'easy',
    text: '아침에 일어났습니다.\n세수를 하고 밥을 먹었습니다.\n학교에 갈 준비를 합니다.' },
  { id: 'p-easy-4', type: 'paragraph', difficulty: 'easy',
    text: '강아지가 꼬리를 흔듭니다.\n주인을 보고 반가워합니다.\n같이 뛰어놀고 싶어합니다.' },
  { id: 'p-easy-5', type: 'paragraph', difficulty: 'easy',
    text: '엄마가 맛있는 밥을 했어요.\n온 가족이 모여 함께 먹었어요.\n밥상이 가득 차려졌어요.' },
  { id: 'p-easy-6', type: 'paragraph', difficulty: 'easy',
    text: '학교가 끝났습니다.\n가방을 메고 집으로 갔어요.\n엄마가 반갑게 맞아주었어요.' },

  // ── 문단: 보통 ──────────────────────────────
  { id: 'p-med-1', type: 'paragraph', difficulty: 'medium',
    text: '나는 매일 아침 운동을 합니다.\n건강한 몸을 만들기 위해서입니다.\n꾸준히 노력하면 반드시 결과가 옵니다.' },
  { id: 'p-med-2', type: 'paragraph', difficulty: 'medium',
    text: '책을 읽으면 지식이 늘어납니다.\n다양한 생각을 배울 수 있습니다.\n독서는 마음의 양식입니다.' },
  { id: 'p-med-3', type: 'paragraph', difficulty: 'medium',
    text: '가을 하늘은 높고 맑습니다.\n단풍잎이 붉게 물들었습니다.\n낙엽이 바람에 날립니다.\n계절이 바뀌고 있습니다.' },
  { id: 'p-med-4', type: 'paragraph', difficulty: 'medium',
    text: '열심히 공부하면 꿈이 이루어집니다.\n포기하지 말고 계속 도전하세요.\n노력은 절대 배신하지 않습니다.' },
  { id: 'p-med-5', type: 'paragraph', difficulty: 'medium',
    text: '비가 내리는 날에는 창문을 두드립니다.\n빗소리를 들으며 책을 읽으면 좋아요.\n따뜻한 코코아 한 잔이 생각나는 날입니다.' },
  { id: 'p-med-6', type: 'paragraph', difficulty: 'medium',
    text: '아침 일찍 일어나면 기분이 상쾌합니다.\n맑은 공기를 마시며 스트레칭을 합니다.\n하루를 활기차게 시작할 수 있어요.' },
  { id: 'p-med-7', type: 'paragraph', difficulty: 'medium',
    text: '친구에게 편지를 쓰기로 했습니다.\n마음을 담아 한 글자씩 정성껏 씁니다.\n받는 사람이 기뻐할 것 같아 설레요.' },
  { id: 'p-med-8', type: 'paragraph', difficulty: 'medium',
    text: '봄이 오면 꽃씨를 심어요.\n물을 주고 햇볕을 받게 해줍니다.\n며칠 지나면 새싹이 고개를 내밀어요.' },

  // ── 문단: 어려움 ─────────────────────────────
  { id: 'p-hard-1', type: 'paragraph', difficulty: 'hard',
    text: '대한민국은 아름다운 나라입니다.\n산과 강이 어우러져 절경을 이룹니다.\n사계절이 뚜렷하여 계절마다 다른 매력이 있습니다.\n우리는 이 땅을 사랑하고 가꾸어 나가야 합니다.' },
  { id: 'p-hard-2', type: 'paragraph', difficulty: 'hard',
    text: '글씨를 예쁘게 쓰는 것은 중요한 습관입니다.\n또박또박 정성껏 쓴 글씨는 읽는 사람에게 진심을 전합니다.\n연습을 거듭하면 누구나 반듯한 글씨를 쓸 수 있습니다.\n오늘도 최선을 다해 한 글자씩 써봅시다.' },
  { id: 'p-hard-3', type: 'paragraph', difficulty: 'hard',
    text: '하늘을 나는 새처럼 자유롭게.\n바다를 헤엄치는 물고기처럼 유연하게.\n땅을 굳건히 딛고 서는 나무처럼 든든하게.\n우리는 각자의 자리에서 최선을 다합니다.' },
  { id: 'p-hard-4', type: 'paragraph', difficulty: 'hard',
    text: '우리나라의 역사는 유구하고 깊습니다.\n수많은 선조들의 희생 위에 오늘이 있습니다.\n그 역사를 기억하고 이어나가는 것이 우리의 역할입니다.\n자랑스러운 우리나라를 온 마음으로 사랑합니다.' },
  { id: 'p-hard-5', type: 'paragraph', difficulty: 'hard',
    text: '책 한 권에는 한 사람의 삶이 담겨 있습니다.\n작가의 생각과 감정이 글자 하나하나에 녹아 있어요.\n독서를 통해 우리는 더 넓은 세상을 만납니다.\n오늘도 책 한 페이지를 천천히 읽어봅시다.' },
  { id: 'p-hard-6', type: 'paragraph', difficulty: 'hard',
    text: '계절이 바뀔 때마다 자연은 새 옷을 갈아입습니다.\n봄에는 꽃이 피고 여름에는 초록이 우거지죠.\n가을에는 단풍이 물들고 겨울에는 하얀 눈이 쌓입니다.\n이 아름다운 사계절이 있어 우리 삶은 풍요롭습니다.' },
];

// 타입/난이도로 거르기
function getSentences(difficulty, type) {
  let result = SENTENCES;
  if (type && type !== 'all') result = result.filter((s) => s.type === type);
  if (difficulty && difficulty !== 'all') result = result.filter((s) => s.difficulty === difficulty);
  return result;
}

// 조건에 맞는 무작위 문장 (직전 것은 제외)
function getRandomSentence(difficulty, type, excludeId) {
  let pool = getSentences(difficulty, type);
  if (excludeId) pool = pool.filter((s) => s.id !== excludeId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
