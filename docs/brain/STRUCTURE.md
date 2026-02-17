# Brain Folder Structure (브레인 폴더 구조)

이 문서는 `brain` 폴더 내의 디렉토리 구조와 각 파일의 책임을 정의합니다.

## 디렉토리 트리 (예시)
```text
C:\Users\김숙이\.gemini\antigravity\brain\
├── <session-id-1>\             # 개별 대화 세션별 폴더
│   ├── task.md                # [Core] 현재 작업의 체크리스트 및 상태
│   ├── implementation_plan.md # [Core] 승인된 수정 계획 (Planning 단계 산출물)
│   ├── walkthrough.md         # [Core] 작업 완료 후 검증 및 리포트 (Verification 단계)
│   ├── media\                 # [Auxiliary] 스크린샷, 녹화물 저장소
│   └── *.md.resolved          # [History] 충돌 해결 또는 이전 버전 기록
├── <session-id-2>\
└── ...
```

## 주요 파일별 역할

| 파일명 | 상태 | 책임 |
| :--- | :--- | :--- |
| `task.md` | **Core** | 현재 진행 중인 태스크를 원자적 단위로 쪼개어 관리합니다. 작업의 '나침반' 역할을 합니다. |
| `implementation_plan.md` | **Core** | 코드를 수정하기 전, 목적/영향도/변경사항을 명시하여 사용자에게 승인을 받습니다. |
| `walkthrough.md` | **Core** | 작업이 끝난 후, 실제로 무엇이 변했는지 시각 자료와 함께 설명합니다. |
| `metadata.json` (Knowledge 영역) | **Core** | 지식 아이템(KI)의 요약 정보와 원천 소스를 추적합니다. |
| `artifacts/` (Knowledge 영역) | **Core** | 반복 활용 가능한 기술 표준, 아키텍처 가이드 등을 저장합니다. |
| `*.md.resolved` | **History** | 자동화된 도구들이 파일 수정 과정에서 생성하는 중간 스냅샷입니다. 직접 수정하지 않습니다. |

## 핵심 vs 보조 영역 구분
- **Core (핵심)**: 에이전트가 매 작업 시 반드시 참조하고 업데이트해야 하는 데이터입니다. (task, plan, walkthrough, knowledge)
- **Auxiliary (보조)**: 시각 자료나 기록 보관용 파일입니다. (media, logs, resolved files)
- **Deprecated/Unused**: 현재 확인된 바 없으나, 수동으로 생성된 백업 파일(`.bak` 등)은 비정기적으로 정리됩니다.

## 절대repo-상대 경로 정보
- 현재 확인된 브레인 폴더의 절대 경로는 `C:\Users\김숙이\.gemini\antigravity\brain` 입니다.
- 프로젝트 루트(`Campus-Feast-Guide_netver_v4_AWS`) 외부에서 관리되므로, 프로젝트 빌드 결과물에는 포함되지 않습니다.
