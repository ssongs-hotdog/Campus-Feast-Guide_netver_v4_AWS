# HY-eat 데이터 명세서 및 계약 (Data Specification & Contract)

**Version:** 2.1.0  
**Last Updated:** 2026-02-13  
**Status:** **DRAFT (승인 대기 중)**  
**Language:** Korean (한국어)

---

## 1. 개요 (Overview)

본 문서는 HY-eat 프로젝트의 데이터 파이프라인(S3 메뉴 데이터, DynamoDB 대기열 데이터)에 대한 **단일 진실 공급원(Single Source of Truth)**입니다. 모든 데이터 생성, 수집, 처리는 본 명세서를 엄격히 준수해야 합니다.

### 변경 이력 (Changelog)
- **v2.1.0**: 엣지 디바이스(Jetson Nano) 데이터 계약 추가 및 DynamoDB 저장 스키마 최신화.
- **v2.0.0**: 및 AWS 마이그레이션 반영. `breakfast_1000` (천원의 아침밥) 코너 예시 추가. 운영 시간(Operating Hours) 최신화 반영 (Codebase 기준).
- **v1.0.0**: 초기 버전 (Legacy).

---

## 2. 글로벌 규칙 (Global Rules)

1. **인코딩 (Encoding)**: 모든 텍스트 데이터는 **UTF-8**을 사용합니다.
2. **시간대 (Timezone)**: 모든 날짜 및 시간 데이터는 **KST (Asia/Seoul, UTC+09:00)**를 기준으로 합니다.
   - ISO String 예시: `2026-02-07T12:00:00+09:00`
   - 타임스탬프(Epoch): 밀리초(ms) 단위 사용 (예: `1770346800000`)
3. **날짜 키 (Date Key)**: `YYYY-MM-DD` 형식을 사용합니다. (예: `2026-02-06`)
4. **ID 명명 규칙**: 모든 ID는 **소문자 snake_case**를 원칙으로 합니다. (예: `hanyang_plaza`, `rice_bowl`)

---

## 3. 식당 및 코너 ID (Canonical IDs)

시스템에서 인식하는 식당(`restaurantId`)과 코너(`cornerId`)의 전체 목록입니다. 이 목록에 없는 ID는 무시되거나 오류를 발생시킵니다.

### 3.1 한양플라자 (`hanyang_plaza`)
- **`breakfast_1000`**: 천원의 아침밥 (조식 전용)
- **`western`**: 양식
- **`korean`**: 한식
- **`instant`**: 즉석 (찌개류 등)
- **`cupbap`**: 오늘의 컵밥
- **`ramen`**: 라면

### 3.2 신소재공학관 (`materials`)
- **`set_meal`**: 정식
- **`single_dish`**: 일품
- **`rice_bowl`**: 덮밥 (※ 메뉴 데이터가 있을 때만 운영되는 비정기 코너)
- **`dinner`**: 석식

### 3.3 생활과학관 (`life_science`)
- **`dam_a_lunch`**: 중식 Dam-A (한식)
- **`pangeos_lunch`**: 중식 Pangeos (양식/일품)
- **`dam_a_dinner`**: 석식 Dam-A

---

## 4. 운영 시간 (Operating Hours)

**주의**: 본 운영 시간은 현재 시스템(`shared/domain/schedule.ts`)에 구현된 로직을 기준으로 작성되었습니다.

| 식당 (Restaurant) | 코너 (Corner) | 평일 (Weekday) | 토요일 (Saturday) | 비고 |
|---|---|---|---|---|
| **한양플라자** | `breakfast_1000` | 08:20 ~ 10:20 | 휴무 | |
| | `western`, `korean`, `instant` | 11:00 ~ 14:30 | `western`만 10:00~14:00 | 나머지는 토요일 휴무 |
| | `ramen` | 12:00 ~ 18:00 | 10:00 ~ 18:00 | 평일 Break: 14:30~15:30 |
| | `cupbap` | 16:00 ~ 18:00 | 휴무 | |
| **신소재공학관** | `set_meal` | 11:30 ~ 13:30 | 11:30 ~ 13:30 | |
| | `single_dish` | 11:30 ~ 13:30 | 휴무 | |
| | `rice_bowl` | 11:30 ~ 13:30 | 휴무 | 메뉴 데이터 존재 시에만 활성화 |
| | `dinner` | 17:00 ~ 18:30 | 휴무 | |
| **생활과학관** | `dam_a_lunch` | 11:30 ~ 14:00 | 11:30 ~ 13:30 | |
| | `pangeos_lunch` | 11:30 ~ 14:00 | 휴무 | |
| | `dam_a_dinner` | 17:00 ~ 18:30 | 휴무 | |

* **일요일 및 공휴일**: 기본적으로 모든 식당 휴무 (단, 별도 공지 시 변경 가능)

---

## 5. S3 메뉴 데이터 명세 (S3 Menu Data Specification)

메뉴 데이터는 AWS S3 버킷에 날짜별로 저장됩니다.

### 5.1 파일 경로 및 명명 규칙
- **Bucket**: `hyeat-menu-data-v4` (환경변수 `S3_BUCKET` 참조)
- **Key Format**: `menu/{YYYY-MM-DD}.json`
  - 예: `menu/2026-02-06.json`

### 5.2 데이터 스키마 (JSON Schema)

루트 객체는 `DateKey ("YYYY-MM-DD")`를 키로 가지고, 그 내부에 Restaurant ID, Corner ID 순으로 중첩됩니다.

**Corner Object Schema:**
| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `restaurantId` | string | **Y** | 식당 ID |
| `cornerId` | string | **Y** | 코너 ID |
| `cornerDisplayName` | string | N | 화면 표시 이름 |
| `mainMenuName` | string | **Y** | 메인 메뉴 이름 |
| `priceWon` | number | **Y** | 가격 (원 단위, 정수) |
| `items` | string[] | **Y** | 반찬 및 국 리스트 |
| `variants` | object[] | N | 옵션 메뉴 (예: 조식 A/B, 덮밥/국밥 선택) |

### 5.3 데이터 예시 (Examples)

#### **[중요] 천원의 아침밥 (`breakfast_1000`) 예시**
천원의 아침밥은 `variants` 배열을 사용하여 복수 메뉴(A코너/B코너 등)를 표현해야 합니다. 아래 예시는 실제 운영 데이터에서 추출한 것입니다.

**Example 1 (2026-01-19 기준):**
```json
{
  "restaurantId": "hanyang_plaza",
  "cornerId": "breakfast_1000",
  "cornerDisplayName": "천원의 아침밥",
  "mainMenuName": "천원의 아침밥",
  "priceWon": 1000,
  "items": ["A/B 메뉴 중 선택"],
  "variants": [
    {
      "mainMenuName": "[백반식]쌀밥",
      "items": ["소고기장국", "백선대볶음", "콩자반", "김치", "오이고추쌈장무침"]
    },
    {
      "mainMenuName": "[간편식]유부초밥",
      "items": ["제로초코칩쿠키", "아몬드&초코", "단백음료"]
    }
  ]
}
```

**Example 2 (2026-01-20 기준):**
```json
{
  "restaurantId": "hanyang_plaza",
  "cornerId": "breakfast_1000",
  "cornerDisplayName": "천원의 아침밥",
  "mainMenuName": "천원의 아침밥",
  "priceWon": 1000,
  "items": ["A/B 메뉴 중 선택"],
  "variants": [
    {
      "mainMenuName": "[백반식]쌀밥",
      "items": ["차돌콩나물국", "돈*갈떡", "진미채볶음", "김치", "참나물무침"]
    },
    {
      "mainMenuName": "[간편식]가래떡&미니츄러스",
      "items": ["홍국미니전병견과칩", "식혜"]
    }
  ]
}
```

---

## 6. 대기열 데이터 파이프라인 명세 (Waiting Data Pipeline Specification)

실시간 및 과거 대기열 데이터는 **엣지 디바이스(Jetson Nano)**에서 수집되어 **AWS Lambda**를 거쳐 **DynamoDB**에 저장됩니다.

### 6.1 엣지 디바이스 데이터 계약 (Edge Device Contract: Jetson Nano -> AWS Lambda)
젯슨 나노(Jetson Nano)에서 YOLO 모델 분석 후 AWS Lambda로 전송하는 원시 데이터(Raw Data) 형식입니다.

**데이터 예시 (JSON Payload):**
```json
{
  "restaurant_id": "hanyang_plaza",
  "corner_id": "korean",
  "queue_count": 15,
  "est_wait_time_min": 8,
  "timestamp": 1770349800000
}
```

**데이터 스키마 (JSON Schema):**

| 필드명 (Field) | 타입 | 필수 | 설명 | 주의사항 |
|---|---|---|---|---|
| `restaurant_id` | string | **Y** | 식당 ID | snake_case |
| `corner_id` | string | **Y** | 코너 ID | snake_case |
| `queue_count` | number | **Y** | 대기 인원 수 | |
| `est_wait_time_min` | number | **Y** | 예상 대기 시간 (분) | |
| `timestamp` | number | **Y** | 생성 시간 (Epoch ms) | |

### 6.2 DynamoDB 저장 데이터 명세 (Storage Specification: AWS Lambda -> DynamoDB)
AWS Lambda에서 데이터를 변환하여 최종적으로 DynamoDB에 저장하는 형식입니다.

- **Table Name**: `hyeat_YOLO_data` (환경변수 `DDB_TABLE_WAITING` 참조)
- **Primary Key (PK)**: `CORNER#{restaurantId}#{cornerId}` (String)
- **Sort Key (SK)**: `Epoch Millisecond` (Stringified Number)

**데이터 예시 (Stored Item):**
```json
{
  "pk": "CORNER#hanyang_plaza#korean",
  "sk": "1770349800000",
  "restaurantId": "hanyang_plaza",
  "cornerId": "korean",
  "queueLen": 15,
  "estWaitTimeMin": 8,
  "dataType": "observed",
  "source": "jetson_nano",
  "timestampIso": "2026-02-13T12:50:00+09:00",
  "createdAtIso": "2026-02-13T12:50:01+09:00",
  "ttl": 1778125800
}
```

**아이템 스키마 (Item Schema):**

| 필드명 (Field) | 타입 | 필수 | 설명 | 주의사항 |
|---|---|---|---|---|
| `pk` | string | **Y** | Partition Key | `CORNER#...` 형식 준수 |
| `sk` | string | **Y** | Sort Key (Stringified Number) | **숫자를 문자열로 변환하여 저장** |
| `restaurantId` | string | **Y** | 식당 ID | |
| `cornerId` | string | **Y** | 코너 ID | |
| `queueLen` | number | **Y** | 대기 인원 수 | (Legacy: `queue_len` 도 허용되나 `queueLen` 권장) |
| `estWaitTimeMin`| number | N | 예상 대기 시간 (분) | (Legacy: `est_wait_time_min` 도 허용) |
| `timestampIso` | string | **Y** | KST ISO Date Time | `2026-02-07T12:00:00+09:00` 형식 |
| `dataType` | string | N | 데이터 유형 | `observed` (실측), `prediction` (예석), `dummy` |
| `ttl` | number | **Y** | Time To Live (Epoch Sec) | 데이터 자동 삭제 시간 (보통 90일 후) |
| `source` | string | N | 데이터 원천 | 예: `jetson_nano` |
| `createdAtIso` | string | N | 생성 시간 (ISO) | Lambda 처리 시간 |

### 6.3 쿼리 패턴 (Query Patterns)
1. **특정 날짜 조회**: `pk = CORNER#...` AND `sk BETWEEN {startMs} AND {endMs}`
2. **최신 데이터 조회**: `pk = CORNER#...` scanIndexForward=false limit=1

---

## 7. 데이터 팀 필독: 테스트 데이터 생성 가이드 (Test Data Playbook)

테스트 데이터를 생성할 때 다음 규칙을 반드시 지켜야 합니다.

1. **운영 시간 내 생성**:
   - 위 '4. 운영 시간' 표를 참조하여, **반드시 코너가 운영 중인 시간대**의 데이터만 생성하십시오.
   - 예: `breakfast_1000`의 데이터를 `13:00`에 생성하면 UI에 표시되지 않거나 무시됩니다.
2. **5분 단위 데이터 권장**:
   - 앱 통계 및 그래프 최적화를 위해 데이터는 5분 간격(예: 12:00, 12:05, 12:10)으로 생성하는 것을 권장합니다.
3. **혼잡도 다양성**:
   - 테스트 시 '여유(0~5분)', '보통(5~10분)', '혼잡(10분+)' 상태가 골고루 분포되도록 `queueLen`을 조정하십시오.

---

## 8. 자주 발생하는 실수 (Common Mistakes & Pitfalls)

| 유형 | 실수 내용 | 해결 방법 |
|---|---|---|
| **시간대(Timezone)** | UTC 시간(`Z`)으로 저장하여 9시간 차이 발생 | 반드시 **`+09:00` (KST)** 오프셋을 포함한 ISO 문자열을 사용하십시오. |
| **PK/SK 불일치** | SK에 밀리초(`17...`) 대신 초(`17...`)를 넣거나 문자열 형식이 아님 | SK는 **밀리초(13자리)**여야 하며, DDB 저장 시 **문자열(String)** 타입이어야 합니다. |
| **속성명(Casing)** | `estimated_wait_time` (Snake) vs `estWaitTimeMin` (Camel) 혼용 | 최신 스펙인 **CamelCase (`estWaitTimeMin`)**를 준수하십시오. (서버는 둘 다 처리하지만 Camel 권장) |
| **조식 메뉴 누락** | `breakfast_1000`에 `variants` 없이 `mainMenuName`만 넣음 | 조식은 반드시 **`variants` 배열**을 포함해야 '백반식/간편식'이 제대로 표시됩니다. (5.3 예시 참조) |

---
*End of Document*
