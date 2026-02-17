# DATA_CONTRACTS_VERIFIED (코드 검증본)

## 1) 공통 식별자 계약
### Restaurant ID
- `hanyang_plaza`, `materials`, `life_science`
- 근거: `shared/types.ts`

### Corner ID
- hanyang_plaza: `breakfast_1000`, `western`, `korean`, `instant`, `cupbap`, `ramen`
- materials: `set_meal`, `single_dish`, `rice_bowl`, `dinner`
- life_science: `dam_a_lunch`, `pangeos_lunch`, `dam_a_dinner`
- 근거: `shared/types.ts`

## 2) 메뉴 데이터 계약
### API
- `GET /api/menu?date=YYYY-MM-DD`

### date 파라미터
- 형식: `YYYY-MM-DD`
- 검증: Zod regex
- 근거: `server/utils/validation.ts`, `server/routes.ts`

### 메뉴 아이템 필드
- `restaurantId: string`
- `cornerId: string`
- `cornerDisplayName: string`
- `mainMenuName: string`
- `priceWon: number` (원)
- `items: string[]`
- `variants?: { mainMenuName: string; items: string[] }[]`
- 근거: `shared/types.ts`, `client/src/lib/data/dataProvider.ts`

## 3) 대기열 데이터 계약
### 핵심 의미
- `estWaitTimeMin`: 예상 대기시간(분)
- `queueLen`: 대기 인원 수

### API별 응답 형식 차이 (중요)
1. `/api/waiting` (today+DDB 경로)
- camelCase 반환
- `timestamp, restaurantId, cornerId, queueLen, estWaitTimeMin, data_type`
- 근거: `server/routes.ts` 매핑 로직

2. `/api/waiting/latest`
- snake_case 중심 반환
- `queue_len`, `est_wait_time_min`, `data_type`
- 근거: `server/routes.ts`

3. `/api/waiting/all`
- today+DDB: snake_case (`queue_len`, `est_wait_time_min`)
- non-today+S3: camelCase (`queueLen`, `estWaitTimeMin`) 경로 가능
- 근거: `server/routes.ts`, `server/ddbWaitingRepo.ts`, `server/s3WaitingService.ts`

=> 결론: 현재 waiting 계열 API는 필드 네이밍이 일관되지 않음(검증됨).

## 4) DynamoDB 아이템 계약 (코드 기준)
### 키 구조
- `pk = CORNER#{restaurantId}#{cornerId}`
- `sk = epochMillis 문자열`
- 근거: `server/ddbWaitingRepo.ts`

### 저장 필드 (put 함수 기준)
- `pk`, `sk`, `restaurantId`, `cornerId`, `queueLen`, `dataType`, `source`, `timestampIso`, `createdAtIso`, `ttl`
- `ttl`: epoch seconds, 기본 90일
- 근거: `server/ddbWaitingRepo.ts::putWaitingSnapshots`

### 주의
- 조회 로직은 `estWaitTimeMin`을 읽지만, `putWaitingSnapshots`에는 해당 필드를 쓰지 않음
- 즉, `estWaitTimeMin`은 외부 파이프라인 또는 다른 writer가 넣는다는 전제가 존재
- 근거: `server/ddbWaitingRepo.ts`

## 5) S3 객체 키 계약
- 메뉴: `menus/{date}.json` (`S3_BUCKET`)
- 대기열: `waiting-data/{date}.json` (`S3_BUCKET_WAITING`)
- 근거: `server/s3MenuService.ts`, `server/s3WaitingService.ts`

## 6) 시간/타임존 계약
- 서버 기준 타임존: `Asia/Seoul` (+09:00)
- `date`는 KST 날짜 키 (`YYYY-MM-DD`)
- timestamp는 ISO 문자열(+09:00) 사용 경로가 기본
- 근거: `server/utils/date.ts`, `server/ddbWaitingRepo.ts`

## 7) 환경변수 계약 (실사용 코드 기준)
- 서버: `AWS_REGION`, `DDB_TABLE_WAITING`, `WAITING_SOURCE`, `WAITING_SOURCE_S3`, `S3_BUCKET`, `S3_BUCKET_WAITING`, `MENU_SOURCE`, `MENU_CACHE_ENABLED`, `MENU_CACHE_TTL_SECONDS`, `MENU_CACHE_MAX_ENTRIES`, `WAITING_STALE_SECONDS`, `PORT`
- 클라이언트: `VITE_API_URL`, `VITE_ADMIN_API_URL`
- 근거: `server/*`, `client/src/lib/data/dataProvider.ts`, `client/src/admin/lib/api.ts`

## 8) 근거 부족/미확정
- 운영환경 실제 값(버킷/테이블명)은 저장소 코드만으로 확정 불가
- 공휴일 로직은 현재 stub(`isHoliday`는 false 반환)
- 근거: `shared/domain/schedule.ts`
