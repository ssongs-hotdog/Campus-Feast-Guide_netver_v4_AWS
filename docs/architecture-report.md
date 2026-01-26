# HY-eat 시스템 아키텍처 및 개발 보고서

**작성일**: 2026-01-26  
**버전**: Phase 2 (DynamoDB 통합 완료)

---

## 요약 (Executive Summary)

HY-eat은 한양대학교 학생들이 식당 대기 시간과 혼잡도를 실시간으로 확인할 수 있는 모바일 우선 웹 애플리케이션입니다. 현재 MVP 단계로, AWS DynamoDB를 통한 실시간 대기열 데이터와 S3를 통한 메뉴 데이터를 제공합니다.

**현재 구현 상태**:
- 메뉴 데이터: AWS S3에서 실시간 제공
- 대기열 데이터: AWS DynamoDB에서 실시간 제공
- UI: 모바일 우선, 카드 기반 레이아웃, 5단계 혼잡도 색상 표시

**핵심 설계 원칙**:
- Backend-Proxy 패턴: 브라우저 → Express → AWS (직접 호출 없음)
- Feature Flag: 즉시 롤백 가능 (`MENU_SOURCE`, `WAITING_SOURCE`)
- KST 시간대 기준: 모든 날짜/시간 연산은 Asia/Seoul 기준

---

## 1. 프로젝트 목표 및 현재 단계

### 1.1 해결하려는 문제

한양대학교 학생들은 식사 시간에 어느 식당이 덜 혼잡한지 알 수 없어 긴 대기 시간을 경험합니다. HY-eat은 이 문제를 해결하여:

- **사용자 가치**: 실시간 혼잡도 확인으로 대기 시간 절약
- **투명성**: 각 코너별 예상 대기 시간 제공
- **편의성**: 메뉴 정보와 가격을 한눈에 확인

### 1.2 현재 단계: MVP (Minimum Viable Product)

| 기능 | 상태 | 데이터 소스 |
|------|------|-------------|
| 메뉴 조회 | 구현 완료 | AWS S3 |
| 실시간 대기열 | 구현 완료 | AWS DynamoDB |
| 혼잡도 계산 | 구현 완료 | 도메인 로직 |
| 히스토리 조회 | 구현 완료 | DynamoDB |
| 예측 기능 | 기본 구현 | 과거 데이터 기반 |
| QR 티켓 | 구현 완료 | 클라이언트 로컬 |

---

## 2. 시스템 아키텍처 개요

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Pages      │  │  Components  │  │   Lib/Data Provider  │   │
│  │  (Home, etc) │  │ (UI Cards)   │  │   (TanStack Query)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP (fetch)
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER (Express)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Routes     │  │   Storage    │  │   Service Modules    │   │
│  │  (API 엔드   │  │  (PostgreSQL │  │  - s3MenuService     │   │
│  │   포인트)    │  │   Drizzle)   │  │  - ddbWaitingRepo    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ AWS SDK v3
┌─────────────────────────────────────────────────────────────────┐
│                     AWS DATA LAYER                               │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │        S3            │  │           DynamoDB               │ │
│  │  hyeat-menus bucket  │  │   hyeat_YOLO_data table          │ │
│  │  (메뉴 JSON)         │  │   (실시간 대기열)                │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

**메뉴 조회 흐름**:
```
1. 사용자가 날짜 선택 (URL: /d/2026-01-26)
2. 클라이언트 → GET /api/menu?date=2026-01-26
3. 서버 → (캐시 확인) → S3에서 JSON 다운로드
4. 서버 → 클라이언트로 JSON 응답
5. 클라이언트 → UI 렌더링
```

**대기열 조회 흐름**:
```
1. 클라이언트 → GET /api/waiting/latest?date=2026-01-26
2. 서버 → DynamoDB Query (pk별 최신 데이터)
3. 서버 → computeWaitMinutes() 로 대기 시간 계산
4. 서버 → 혼잡도 레벨 포함하여 응답
5. 클라이언트 → 색상 코드로 UI 표시
```

**데이터 수집 흐름 (Ingestion)**:
```
1. 외부 시스템 → POST /api/ingest/waiting (Bearer 인증)
2. 서버 → 요청 검증 (Zod 스키마)
3. 서버 → DynamoDB BatchWriteItem
4. 90일 TTL 자동 설정
```

### 2.3 Feature Flags

| 환경변수 | 값 | 설명 |
|----------|-----|------|
| `MENU_SOURCE` | `s3` / `disabled` | S3 메뉴 사용 여부 |
| `WAITING_SOURCE` | `ddb` / `postgres` | 대기열 데이터 소스 |
| `MENU_CACHE_ENABLED` | `true` / `false` | 메뉴 인메모리 캐시 |
| `MENU_CACHE_TTL_SECONDS` | `60` | 캐시 유효 시간 |

---

## 3. 현재 구현 상세

### 3.1 폴더 구조 및 책임

```
project/
├── client/                      # 프론트엔드 (React + Vite)
│   └── src/
│       ├── App.tsx              # 라우팅 및 프로바이더 설정
│       ├── pages/
│       │   ├── Home.tsx         # 메인 화면 (식당별 코너 카드)
│       │   ├── CornerDetail.tsx # 코너 상세 (메뉴, 대기열 차트)
│       │   └── TicketPage.tsx   # QR 티켓 페이지
│       ├── components/          # 재사용 UI 컴포넌트
│       └── lib/
│           ├── data/
│           │   └── dataProvider.ts  # API 호출 및 데이터 변환
│           ├── dateUtils.ts     # 날짜 유틸리티 (KST 기준)
│           ├── timeContext.tsx  # 시간 상태 관리
│           └── domain/          # 클라이언트 도메인 로직
│
├── server/                      # 백엔드 (Express)
│   ├── routes.ts                # API 엔드포인트 정의
│   ├── storage.ts               # PostgreSQL 스토리지
│   ├── s3MenuService.ts         # S3 메뉴 서비스
│   ├── ddbWaitingRepo.ts        # DynamoDB 대기열 레포지토리
│   └── index.ts                 # 서버 진입점
│
├── shared/                      # 클라이언트/서버 공유 코드
│   ├── types.ts                 # 공용 타입 정의
│   ├── dataTypes.ts             # 데이터 인터페이스
│   ├── cornerDisplayNames.ts    # 코너 표시명 매핑
│   ├── schema.ts                # Drizzle 스키마
│   └── domain/
│       ├── schedule.ts          # 영업 시간 스케줄 로직
│       └── waitTime.ts          # 대기 시간 계산 로직
│
└── scripts/
    └── simulator.ts             # 베타 테스트용 시뮬레이터
```

### 3.2 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 응답 예시 |
|------------|--------|------|-----------|
| `/api/menu?date=YYYY-MM-DD` | GET | 특정 날짜 메뉴 조회 | `{"hanyang_plaza": {...}}` |
| `/api/waiting?date=YYYY-MM-DD` | GET | 최신 대기열 데이터 | `[{timestamp, cornerId, queue_len, ...}]` |
| `/api/waiting/latest?date=...` | GET | 최신 데이터 (staleness 체크) | 동일 |
| `/api/waiting/all?date=...` | GET | 해당 날짜 전체 데이터 | 배열 |
| `/api/waiting/timestamps?date=...` | GET | 사용 가능한 타임스탬프 목록 | `{timestamps: [...]}` |
| `/api/dates` | GET | 사용 가능한 날짜 목록 | `{dates: [...], today: "..."}` |
| `/api/config` | GET | 시스템 설정 | `{useDbWaiting, today, tomorrow}` |
| `/api/health` | GET | 헬스 체크 | `{status, lastIngestion, ...}` |
| `/api/predict?time=HH:MM` | GET | 내일 예측 | 대기열 예측 데이터 |
| `/api/ingest/waiting` | POST | 대기열 데이터 수집 | `{ok: true, inserted: N}` |

### 3.3 핵심 데이터 구조

#### 식당 및 코너 ID

```typescript
// 식당 ID
type RestaurantId = 'hanyang_plaza' | 'materials' | 'life_science';

// 코너 ID (식당별)
// hanyang_plaza: breakfast_1000, western, korean, instant, cupbap, ramen
// materials: set_meal, single_dish, rice_bowl, dinner
// life_science: dam_a_lunch, pangeos_lunch, dam_a_dinner
```

#### 날짜 형식 (DayKey)

```typescript
// 항상 YYYY-MM-DD 형식 (예: "2026-01-26")
// 모든 날짜 연산은 KST (Asia/Seoul) 기준
type DayKey = string;
```

#### 메뉴 데이터

```typescript
interface MenuItem {
  restaurantId: string;
  cornerId: string;
  cornerDisplayName: string;
  mainMenuName: string;
  priceWon: number;
  items: string[];  // 반찬 목록
  variants?: MenuVariant[];  // 선택 메뉴
}

// API 응답: 식당ID → 코너ID → MenuItem
type MenuDataMap = Record<string, Record<string, MenuItem>>;
```

#### 대기열 데이터

```typescript
// API 응답 형식
interface WaitingData {
  timestamp: string;      // ISO 8601 (예: "2026-01-26T12:30:00+09:00")
  restaurantId: string;
  cornerId: string;
  queue_len: number;      // 현재 대기 인원
  est_wait_time_min: number;  // 예상 대기 시간 (분)
  data_type: 'simulated' | 'observed' | 'predicted';
}
```

#### DynamoDB 스키마

```typescript
// Partition Key (pk): "CORNER#{restaurantId}#{cornerId}"
// Sort Key (sk): epochMillis를 문자열로 변환 (예: "1737873600000")
// TTL: 90일 후 자동 삭제

interface DDBWaitingItem {
  pk: string;           // "CORNER#hanyang_plaza#korean"
  sk: string;           // "1737873600000"
  timestamp: string;    // ISO 8601
  queue_len: number;
  source: string;
  data_type: string;
  ttl: number;          // Unix timestamp (초)
}
```

### 3.4 혼잡도 계산 로직

```typescript
// shared/types.ts
function getCongestionLevel(estWaitTime: number): CongestionLevel {
  if (estWaitTime <= 2) return 1;   // 매우여유 (녹색)
  if (estWaitTime <= 5) return 2;   // 여유 (연두)
  if (estWaitTime <= 9) return 3;   // 보통 (노랑)
  if (estWaitTime <= 12) return 4;  // 혼잡 (주황)
  return 5;                          // 매우혼잡 (빨강)
}

// shared/domain/waitTime.ts
function computeWaitMinutes(cornerId: string, queueLen: number): number {
  const serviceRate = SERVICE_RATE_PEOPLE_PER_MIN[cornerId] ?? 2.5;
  const overhead = OVERHEAD_MIN[cornerId] ?? 0;
  return Math.ceil(queueLen / serviceRate) + overhead;
}
```

---

## 4. 알려진 제약사항 및 위험

### 4.1 날짜/시간 처리 주의사항

| 위험 | 설명 | 대응 |
|------|------|------|
| 시간대 불일치 | 클라이언트 로컬 시간 vs 서버 KST | 서버 권위적 시간 사용 (`/api/dates`) |
| dayKey 형식 | `YYYY-MM-DD` 외 형식은 API 거부 | 정규식 검증 `/^\d{4}-\d{2}-\d{2}$/` |
| 자정 경계 | 00:00~05:00 사이 날짜 변경 | KST 기준 자정 사용 |

### 4.2 데이터 신선도 (Staleness)

```typescript
// 90초 이상 된 데이터는 "stale"로 처리
const WAITING_STALE_SECONDS = 90;

// Stale 데이터 발견 시 빈 배열 반환 (UI에서 "데이터 없음" 표시)
```

### 4.3 영업 시간 스케줄

- **평일/토요일/일요일** 별도 스케줄 적용
- **휴무일 처리**: 현재 stub (`isHoliday()` 항상 false)
- **휴식 시간**: 일부 코너는 영업 중간에 휴식 (예: ramen 14:30~15:30)

### 4.4 UI 필터링 제약

- "내일" 탭은 예측 데이터만 표시 (실시간 X)
- 과거 날짜는 히스토리 모드로 전환
- 비활성 코너는 회색 표시, 목록 하단 정렬

---

## 5. 개발 방향 (로드맵)

### 5.1 단기 (1~2주)

- [ ] 휴일 캘린더 구현 (공휴일 처리)
- [ ] 에러 핸들링 개선 (사용자 친화적 메시지)
- [ ] 로깅 강화 (CloudWatch 연동)
- [ ] 데이터셋 QA (메뉴 데이터 검증)
- [ ] E2E 테스트 케이스 작성

### 5.2 중기 (1~2개월)

- [ ] 실시간 데이터 수집 파이프라인
  - 카메라 → 사람 감지 모델 → 백엔드 → DynamoDB
- [ ] 알림 기능 (혼잡도 임계값 초과 시)
- [ ] 사용자 피드백 수집 (정확도 개선)

### 5.3 장기 (3개월+)

- [ ] Replit 외부 배포 전략
- [ ] 확장성 검토 (다중 캠퍼스 지원)
- [ ] 모니터링 대시보드 (Grafana/Datadog)
- [ ] API Rate Limiting

---

## 6. 팀 온보딩 가이드

### 6.1 로컬/Replit 실행 방법

```bash
# 1. Replit에서 실행
# "Run" 버튼 클릭 또는:
npm run dev

# 2. 환경변수 설정 (Replit Secrets 탭)
# 필수:
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
WAITING_SOURCE=ddb
DDB_TABLE_WAITING=hyeat_YOLO_data
MENU_SOURCE=s3
S3_MENU_BUCKET=your-bucket-name
AWS_REGION=ap-northeast-2

# 선택:
INGESTION_TOKEN=...  # POST /api/ingest/waiting 인증용
```

### 6.2 주요 변경 위치

| 변경 내용 | 파일 위치 |
|-----------|-----------|
| 메뉴 데이터 수정 | S3 버킷의 `menus/{YYYY-MM-DD}.json` |
| 코너 표시명 변경 | `shared/cornerDisplayNames.ts` |
| 영업 시간 변경 | `shared/domain/schedule.ts` |
| API 엔드포인트 추가 | `server/routes.ts` |
| UI 컴포넌트 수정 | `client/src/components/` |
| 대기 시간 계산 변경 | `shared/domain/waitTime.ts` |
| 새 페이지 추가 | `client/src/pages/` → `App.tsx`에 라우트 등록 |

### 6.3 문제 해결 체크리스트

**API 응답 확인**:
```bash
# 메뉴 API 테스트
curl http://localhost:5000/api/menu?date=2026-01-26

# 대기열 API 테스트
curl http://localhost:5000/api/waiting/latest?date=2026-01-26

# 헬스 체크
curl http://localhost:5000/api/health
```

**브라우저 디버깅**:
1. 개발자 도구 (F12) → Network 탭
2. `/api/*` 요청 필터링
3. Response 확인

**서버 로그 확인**:
- Replit 콘솔에서 Express 로그 확인
- 형식: `[menu] date=X key=Y source=s3 status=success`

**일반적인 문제**:

| 증상 | 원인 | 해결 |
|------|------|------|
| 메뉴가 표시되지 않음 | S3 키 없음 | S3에 해당 날짜 JSON 업로드 |
| 대기열 빈 배열 | 데이터 stale (90초 초과) | 시뮬레이터 실행 확인 |
| 403 Forbidden (ingest) | INGESTION_TOKEN 불일치 | Secrets 확인 |
| CORS 에러 | 프론트엔드 직접 AWS 호출 시도 | 항상 서버 경유 |

---

## 부록: 환경변수 전체 목록

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM Secret Key |
| `AWS_REGION` | No | 기본값: ap-northeast-2 |
| `MENU_SOURCE` | No | `s3` 또는 `disabled` (기본: disabled) |
| `S3_MENU_BUCKET` | If s3 | S3 버킷명 |
| `MENU_CACHE_ENABLED` | No | `true`/`false` (기본: false) |
| `MENU_CACHE_TTL_SECONDS` | No | 캐시 TTL (기본: 60) |
| `WAITING_SOURCE` | No | `ddb` 또는 `postgres` (기본: postgres) |
| `DDB_TABLE_WAITING` | If ddb | DynamoDB 테이블명 |
| `INGESTION_TOKEN` | No | 데이터 수집 API 인증 토큰 |
| `DATABASE_URL` | If postgres | PostgreSQL 연결 문자열 |

---

*문서 끝*
