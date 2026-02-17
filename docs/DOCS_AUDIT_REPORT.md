# DOCS_AUDIT_REPORT (기존 문서 감사)

## 감사 원칙
- 판정 기준
  - ✅ 확인됨: 코드에서 동일 사실 확인
  - ⚠️ 부분확인: 일부만 맞거나 조건부로만 맞음
  - ❌ 근거없음/불일치: 현재 코드와 충돌 또는 근거 없음

## 왜 기존 docs가 틀릴 수 있는가 (요약)
1. 과거 시점 문서가 남아 현재 코드와 불일치할 수 있음
2. `docs/brain`은 저성능 모델 작성본으로 할루시네이션 가능성이 있음

## 핵심 주장 감사
1. `docs/architecture-report.md`: `POST /api/ingest/waiting` 존재
- 판정: ❌
- 근거: `server/routes.ts`에 POST ingest 라우트 없음

2. `docs/architecture-report.md`: `WAITING_SOURCE=postgres` 경로 지원
- 판정: ❌
- 근거: 현재 코드에서 waiting 소스는 DDB/S3 분기, postgres 경로 없음 (`server/routes.ts`, `server/ddbWaitingRepo.ts`)

3. `docs/architecture-report.md`: `server/storage.ts`가 현재 핵심 스토리지
- 판정: ❌
- 근거: 실제 서버 엔트리(`server/index.ts` -> `server/app.ts` -> `server/routes.ts`)에서 storage.ts 참조 없음

4. `docs/README.md`: 절대 `file:///c:/Users/.../Antigravity_HYeat/...` 링크
- 판정: ❌
- 근거: 현재 레포 경로와 불일치하며 이식성 없음

5. `docs/brain/*.md`: Antigravity 내부 워크플로우/외부 brain 경로를 현재 레포 규약처럼 단정
- 판정: ❌
- 근거: 레포 코드에서 해당 경로/워크플로우 참조 없음

6. `docs/aws_integration_stepbystep_guide.md`: `hyeat_YOLO_data` 테이블명 예시
- 판정: ⚠️
- 근거: 코드 기본값과 일부 문서에서 등장하나, 실제 운영값은 환경변수로 결정됨

7. `docs/architecture_analysis.md`: 메뉴는 S3, 대기열은 DDB/S3 분기
- 판정: ✅
- 근거: `server/routes.ts`, `server/s3MenuService.ts`, `server/ddbWaitingRepo.ts`, `server/s3WaitingService.ts`

8. `README.md`: 서버 시간 권위(`/api/config`) 및 클라이언트 offset 동기화
- 판정: ✅
- 근거: `server/routes.ts:/api/config`, `client/src/lib/timeContext.tsx`

9. `docs/architecture-report.md`: waiting 응답 필드가 일관됨
- 판정: ❌
- 근거: `/api/waiting`, `/api/waiting/latest`, `/api/waiting/all` 간 camelCase/snake_case 혼재

10. `docs/merge_deploy_guide_v1.md`: main/develop 배포 분기 존재
- 판정: ✅
- 근거: `.github/workflows/deploy.yml`

## 위험도 높은 불일치 Top 5
1. 존재하지 않는 `/api/ingest/waiting`를 운영 절차로 안내
2. `postgres` 경로를 현재 지원처럼 설명
3. API 응답 필드명 일관성 오판(실제는 혼재)
4. 레포 외부 절대경로 링크 사용으로 잘못된 문서 네비게이션
5. `docs/brain` 내용을 현재 운영 규약처럼 해석할 가능성

## 조치 결과
- Verified SSOT 문서 4종 신설
- `docs/README.md`를 Verified/Legacy 구분 구조로 개편
- `docs/brain/*` 상단에 `UNVERIFIED / NEEDS VERIFICATION` 라벨 추가
