# LingoFlow

LingoFlow는 웹페이지, 선택한 텍스트, 호버 문단, YouTube 자막을 깔끔한 이중 언어로 보여주는 경량 Chrome 확장 프로그램입니다.

## 기능

- 규칙 매칭, 자동 스캔, SPA 감시를 통한 전체 페이지 이중 언어 번역
- 인라인 또는 버블 모드 호버 번역
- 여러 엔진 비교, 영어 사전, 입력 추천을 지원하는 선택 번역
- 이중 언어 표시, 문장 분리, AI 분절을 지원하는 YouTube 자막 번역
- 지원 엔진: Google, Google2, Microsoft, DeepL, DeepLX, DeepSeek, OpenAI, Custom
- 스트리밍 출력, 배치 집계, 대화 컨텍스트, 사용자 정의 프롬프트와 훅, 용어집

## 설치

1. 저장소를 클론하고 `pnpm build`를 실행
2. `chrome://extensions`를 열고 개발자 모드 활성화
3. "압축 해제된 확장 프로그램 로드"에서 `build/` 폴더 선택

## 단축키

- `Alt+K` 설정 팝업 열기
- `Alt+Q` 페이지 번역 전환
- `Alt+S` 선택 번역 열기
- `Alt+C` 번역 스타일 전환

## 개발

```bash
pnpm install
pnpm test
pnpm build
```

## 라이선스

GPL-3.0
