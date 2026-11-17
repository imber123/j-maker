/* J 메이커 — 3D 영상 연결표
   영상 파일을 media/ 폴더에 넣고, 아래에서 해당 동작의 주석(//)을 풀면 그 동작을 쓰는 모든 단계에서
   이모지 대신 영상이 재생됩니다. 파일이 없거나 재생이 안 되면 자동으로 이모지로 돌아갑니다.

   loop  : 평소에 반복 재생할 영상 (필수)
   hurry : 10초 남았을 때 바꿔 틀 '다급한' 버전 (선택)
   배열로 여러 형식을 주면 기기에 맞는 걸 고릅니다. 아이폰·맥 사파리는 .mov, 나머지는 .webm을 먼저 씁니다.
   자세한 제작 규격은 media/README.md를 보세요. */
window.JM_MEDIA = {
  // shower:  { loop: ['media/shower.webm', 'media/shower.mov'], hurry: ['media/shower-hurry.webm', 'media/shower-hurry.mov'] },
  // wash:    { loop: ['media/wash.webm', 'media/wash.mov'] },
  // brush:   { loop: ['media/brush.webm', 'media/brush.mov'] },
  // spray:   { loop: ['media/spray.webm', 'media/spray.mov'] },
  // makeup:  { loop: ['media/makeup.webm', 'media/makeup.mov'] },
  // dry:     { loop: ['media/dry.webm', 'media/dry.mov'] },
  // dress:   { loop: ['media/dress.webm', 'media/dress.mov'] },
  // run:     { loop: ['media/run.webm', 'media/run.mov'] },
  // scrub:   { loop: ['media/scrub.webm', 'media/scrub.mov'] },
  // pack:    { loop: ['media/pack.webm', 'media/pack.mov'] },
  // eat:     { loop: ['media/eat.webm', 'media/eat.mov'] },
  // stretch: { loop: ['media/stretch.webm', 'media/stretch.mov'] },
  // rest:    { loop: ['media/rest.webm', 'media/rest.mov'] },
  // generic: { loop: ['media/generic.webm', 'media/generic.mov'] },
};
