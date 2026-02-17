# ARCHITECTURE_VERIFIED (코드 검증본)

## 1) 런타임 구조
- 프론트엔드: React + Vite (`client/src/main.tsx`, `vite.config.ts`)
- 백엔드: Express (`server/app.ts`, `server/routes.ts`)
- 로컬 개발 서버 진입점: `server/index.ts` (`npm run dev`)
- Lambda 진입점: `server/lambda.ts` (serverless-http)

## 2) 실행/빌드 스크립트
- `npm run dev`: `tsx server/index.ts`
- `npm run build`: `tsx script/build.ts` (클라이언트+서버 빌드)
- `npm run start`: `node dist/index.cjs`
- `npm run build:client`: `vite build`
- 근거: `package.json`

## 3) 데이터 소스 및 API 흐름
### 메뉴
- API: `GET /api/menu?date=YYYY-MM-DD`
- source flag: `MENU_SOURCE=s3`일 때만 S3 조회
- S3 키 패턴: `menus/{date}.json`
- 비활성 시 503 반환
- 근거: `server/routes.ts`, `server/s3MenuService.ts`

### 대기열
- API: `GET /api/waiting`, `/api/waiting/latest`, `/api/waiting/all`, `/api/waiting/timestamps`
- 오늘(today, KST 기준): `WAITING_SOURCE=ddb`이면 DynamoDB 사용
- 오늘이 아닌 날짜: `WAITING_SOURCE_S3=enabled`이면 S3(`waiting-data/{date}.json`) 사용
- 최신 데이터 stale 기준: `WAITING_STALE_SECONDS` (기본 90초), 초과 시 `/api/waiting/latest`는 빈 배열 반환
- 근거: `server/routes.ts`, `server/ddbWaitingRepo.ts`, `server/s3WaitingService.ts`

## 4) 핵심 엔드포인트 (실제 등록된 것만)
- `GET /api/dates`
- `GET /api/menu`
- `GET /api/waiting/timestamps`
- `GET /api/waiting`
- `GET /api/waiting/all`
- `GET /api/config`
- `GET /api/predict`
- `GET /api/health`
- `GET /health`
- `GET /api/waiting/latest`
- 근거: `server/routes.ts`의 `app.get(...)`

## 5) Admin 구현 상태 (검증 결과)
- Admin 프론트 라우트는 존재 (`/admin/*`): `client/src/admin/index.tsx`
- Admin API 클라이언트 기본 경로는 `/api/admin`이나, 서버에 해당 라우트 구현 없음
- 로그인/세션 검증은 현재 mock 분기 존재
- 근거: `client/src/admin/lib/api.ts`, `server/routes.ts`

## 6) 시간/타임존
- 서버 날짜/시간 기준: KST (`Asia/Seoul`)
- `today`, `serverTime` 등은 `/api/config`에서 제공
- 클라이언트는 `/api/config`로 server offset 동기화 수행
- 근거: `server/utils/date.ts`, `server/routes.ts`, `client/src/lib/timeContext.tsx`

## 7) 배포 파이프라인 (코드 기준)
- GitHub Actions: `.github/workflows/deploy.yml`
- 트리거: `main`, `develop` push
- Lambda 배포 시 환경변수 주입:
  - `DDB_TABLE_WAITING`, `S3_BUCKET`, `WAITING_SOURCE=ddb`, `MENU_SOURCE=s3`, `MENU_CACHE_ENABLED`, `NODE_ENV`
- Health check: `/health`, `/api/health`

## 8) 근거 부족/미확정
- 실제 AWS 리소스 이름(운영/개발)과 콘솔 상태는 저장소 코드만으로 확정 불가
- Admin 백엔드 API의 외부 서비스 존재 여부는 코드 근거 부족
