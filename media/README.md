# 3D 행동 영상 제작 가이드

타이머 화면 가운데 무대에서 이모지 대신 3D 영상이 반복 재생되도록 만드는 규격입니다. 영상은 **동작 단위**로 만듭니다. 예를 들어 `scrub`(닦기) 영상 하나가 변기 닦기, 바닥 솔질, 청소기 돌리기 단계에 모두 쓰입니다.

## 1. 만들어야 할 영상 목록

우선순위 1은 기본 프리셋 6개에 실제로 쓰이는 동작입니다. 1순위 9개만 있어도 프리셋 전체가 영상으로 돌아갑니다.

| 순위 | 동작 키 | 파일명 | 장면 | 쓰이는 프리셋 단계 |
| --- | --- | --- | --- | --- |
| 1 | `shower` | `shower` | 샤워기 아래에서 머리 감기, 물줄기 | 샤워 & 양치, 눕기 전에 샤워부터 |
| 1 | `wash` | `wash` | 세면대에서 거품 세수 (보내주신 시안 장면을 소녀로) | 고양이 세수 |
| 1 | `makeup` | `makeup` | 거울 보며 쿠션 두드리기, 립 바르기 | 퀵 메이크업, 메이크업 |
| 1 | `spray` | `spray` | 스킨·선크림 펌프 눌러 얼굴에 바르기 | 스킨케어, 세제 뿌리고 불리기 |
| 1 | `dry` | `dry` | 드라이기로 머리 말리기, 바람 | 머리 말리기, 물 뿌리고 환기 |
| 1 | `dress` | `dress` | 티셔츠에 머리 넣고 입기 | 옷 입고 가방 챙기기, 아이 깨우기, 옷 입히기 |
| 1 | `run` | `run` | 신발 꿰고 문 쪽으로 뛰기 | 옷 꿰어 입고 뛰기, 신발 신기 |
| 1 | `scrub` | `scrub` | 고무장갑 끼고 수세미로 박박 | 변기·세면대 닦기, 바닥 솔질, 청소기 |
| 1 | `pack` | `pack` | 가방에 물건 쏙쏙 넣기 | 짐 싸두기, 외투·가방 정리, 쓰레기 버리기 |
| 2 | `rest` | `rest` | 침대에 누워 이불 덮고 숨쉬기 | 이제 누워도 됨 |
| 2 | `eat` | `eat` | 숟가락으로 밥 먹기(먹이기) | 아침 식사 먹이기 |
| 2 | `brush` | `brush` | 칫솔질 | 사용자가 만드는 양치 단계 |
| 2 | `stretch` | `stretch` | 기지개, 스트레칭 | 사용자 루틴 |
| 2 | `generic` | `generic` | 시계 보며 발 동동 (어떤 행동에도 어울리는 대기 모션) | 그 밖의 모든 단계 |

**선택: `-hurry` 버전.** 10초 남았을 때 바꿔 트는 다급한 버전입니다(땀 흘리기, 속도 2배, 시계 보며 허둥대기). 파일명 뒤에 `-hurry`를 붙입니다(예: `shower-hurry`). 아케이드 테마 기획에 있던 "10초 남으면 땀 흘리는 모션"이 이것으로 구현됩니다.

## 2. 영상 규격

| 항목 | 권장 |
| --- | --- |
| 비율 · 해상도 | 1:1 정사각형, 720×720 (최대 1080×1080) |
| 길이 | 2–4초, **끝 프레임과 첫 프레임이 이어지는 무한 루프** |
| 프레임 | 24 또는 30fps |
| 소리 | 없음 (음성 안내와 겹침, 자동재생은 무음만 허용) |
| 용량 | 파일당 1.5MB 이하 목표 (아침에 데이터로 받는 경우 고려) |
| 구도 | 캐릭터가 가운데, 위아래 여백 10%. 화면 아래쪽 20%는 말풍선이 덮으니 중요한 동작은 위쪽에 |
| 카메라 | 정면 또는 살짝 위에서, 고정 (카메라가 움직이면 루프가 튐) |

### 배경: 투명을 권장해요

테마가 3가지(다크 네온, 파스텔, 아케이드)라 배경이 있는 영상은 한 테마에서만 어울립니다. 투명 배경으로 뽑으면 모든 테마에서 자연스럽습니다.

| 형식 | 쓰이는 곳 | 뽑는 방법 |
| --- | --- | --- |
| `이름.webm` (VP9 + 알파) | 안드로이드, PC 크롬·엣지 | After Effects·Blender에서 알파 채널 PNG 시퀀스 → ffmpeg 변환 (아래) |
| `이름.mov` (HEVC + 알파) | 아이폰, 맥 사파리 | 맥의 Compressor 또는 Shutterstream 등에서 "HEVC with Alpha" |

투명 배경이 어렵다면 대안이 두 가지 있습니다.
- 배경이 있는 **MP4 한 개**: 무대 카드 색 `#152031`(다크 네온)에 맞춰 만들면 기본 테마에서 자연스럽습니다.
- **WebP/GIF 애니메이션**: 투명이 되지만 화질과 용량이 불리합니다.

### PNG 시퀀스 → WebM(알파) 변환 예시

```bash
ffmpeg -framerate 30 -i shower_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 34 -an shower.webm
```

## 3. 캐릭터: 귀여운 소녀 "제이"

모든 행동 영상은 한 명의 소녀 캐릭터가 연기합니다. 영상마다 얼굴과 옷이 달라지면 안 되니, **캐릭터 시트(정면·측면·뒷면 3면도 + 표정 4종)를 먼저 확정**하고 그걸 기준으로 영상을 만드세요.

| 항목 | 설정 |
| --- | --- |
| 이름(가제) | 제이 — 오늘만 J가 되려는 P 소녀 |
| 나이감 · 비율 | 20대 초반 느낌, 2.5등신 치비 비율 (큰 머리, 짧은 팔다리) |
| 스타일 | 말랑한 클레이·비닐 토이 질감의 3D (아이콘의 J·P 글자 캐릭터와 같은 질감), 둥근 형태, 부드러운 조명 |
| 얼굴 | 큰 갈색 눈, 볼터치, 작은 입. 기본 표정은 살짝 졸린데 의욕은 있는 얼굴 |
| 헤어 | 갈색 똑단발 + 정수리에 삐친 머리 한 가닥 (P의 흔적). 샤워·세수 장면에서는 헤어밴드 |
| 의상 | 아이콘 색을 그대로: **파란 후드 티(#2f6df0) + 주황 포인트(#f08a24)**, 가슴에 작은 "J" 패치 |
| 소품 | 손목에 네온 그린(#3dff8f) 스마트워치, 다급한 장면에서 화면을 확인 |

**표정 4종 (영상 공통)**
1. 기본: 졸리지만 움직이는 중
2. 집중: 입 꾹 다물고 열심히 (대부분의 loop 영상)
3. 다급: 땀방울, 눈 동그랗게, 동작 2배속 (`-hurry` 영상)
4. 뿌듯: 눈웃음, 브이 (완료 화면용으로 나중에 쓸 수 있음)

**P 캐릭터 활용**: 아이콘의 연보라 P 글자 캐릭터는 제이의 '미루고 싶은 마음'으로 등장시킬 수 있어요. 예를 들어 `rest`나 `-hurry` 영상 구석에서 늘어져 있다가 제이가 밀어내는 연출이요.

### 캐릭터 시트 생성용 프롬프트 (이미지 AI용, 영어가 결과가 좋음)

```
3D chibi character sheet of a cute young woman named "J", 2.5 head-to-body ratio,
soft clay vinyl toy material, rounded shapes, big brown eyes, rosy cheeks,
brown bob haircut with one ahoge strand sticking up, blue hoodie (#2f6df0) with
orange trim (#f08a24) and a small "J" patch on the chest, neon green smartwatch,
front view, side view, back view, plus 4 facial expressions (sleepy, focused,
panicked with sweat drops, proud smile), plain light gray background,
soft studio lighting, Pixar-like render
```

### 행동 영상용 프롬프트 예시 (샤워)

```
Same character "J" from the reference sheet, taking a shower and washing her hair
with foam, headband on, water streams from a shower head, focused expression,
front camera, fixed camera, centered, seamless 3-second loop, transparent background,
1:1 square, soft clay 3D style
```
나머지 동작은 `taking a shower` 부분만 바꾸면 됩니다 (예: `washing her face with foam at a sink`, `drying her hair with a hair dryer`, `scrubbing a toilet with rubber gloves and a sponge`).

## 4. 앱에 넣는 방법

**영상 파일을 앱에 기본으로 넣기 (모든 사용자):**
1. 파일을 이 `media/` 폴더에 넣습니다 (예: `media/shower.webm`, `media/shower.mov`).
2. `j-maker/media.js`에서 해당 줄의 `//`를 지웁니다.
3. 배포하면 끝. 파일이 없거나 재생이 안 되는 기기에서는 이모지로 자동 대체됩니다.

**폰에서 바로 시험해 보기 (내 기기만):**
루틴 편집 → 단계의 이모지 버튼 → **🎬 3D 영상 · 이미지 → 파일 고르기**. 올린 파일은 그 기기에만 저장되고, 그 단계에서만 재생됩니다. 시안을 실제 화면에서 확인할 때 쓰세요.
