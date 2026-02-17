# AGENTS.md

## 작업 시작 프로토콜 (필수)
1. 먼저 `docs/README.md`의 `Verified SSOT` 섹션을 확인한다.
2. 반드시 아래 4개 문서를 먼저 읽고 작업을 시작한다.
   - `docs/PROJECT_CONTEXT.md`
   - `docs/ARCHITECTURE_VERIFIED.md`
   - `docs/DATA_CONTRACTS_VERIFIED.md`
   - `docs/DOCS_AUDIT_REPORT.md`
3. 기존 `docs/brain/*` 및 기타 레거시 문서는 참고용으로만 사용하고, 코드 근거 없이 사실로 단정하지 않는다.

## 우선순위 규칙
- 1순위: 실행 중인 코드(실제 import/call 경로)
- 2순위: Verified SSOT 문서
- 3순위: Legacy/Unverified 문서

## 금지사항
- 코드/문서 근거 없는 추측 금지
- 민감정보(키/토큰/비밀번호) 문서화 금지. 발견 시 `REDACTED` 처리
- SSOT와 충돌하는 레거시 문구를 근거 없이 재사용 금지

## 변경 원칙
- 기본 목표는 "최소 변경 + 근거 기반 문서화"이다.
- 큰 코드 변경 전에는 변경 계획(대상 파일, 리스크, 롤백)을 먼저 제시한다.
- 데이터 계약 변경 시 `docs/DATA_CONTRACTS_VERIFIED.md`를 함께 갱신한다.

## 검증 체크리스트
- API/데이터 필드명은 실제 서버 응답/타입/매핑 코드로 확인했는가?
- today/past 분기, KST 처리, source flag 분기를 확인했는가?
- Admin 기능이 실제 백엔드 연동인지, Mock인지 확인했는가?
