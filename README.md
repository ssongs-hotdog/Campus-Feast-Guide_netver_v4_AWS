# Hanyang Feast Guide (HY-eat) 🍽️

> 한양대학교 스마트 캠퍼스 다이닝 솔루션

**HY-eat**은 한양대학교 학생 및 교직원들에게 교내 식당의 **실시간 대기열 정보**와 **식단 정보**를 제공하여, 효율적인 식사 결정을 돕는 웹 서비스입니다. AWS 클라우드 기반의 데이터 파이프라인과 React/Express 기반의 모던 웹 아키텍처로 구성되어 있습니다.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18, Vite
- **Language**: TypeScript
- **State Management**: TanStack Query (Server State), Context API (Client State)
- **Routing**: wouter
- **Styling**: Tailwind CSS, Radix UI (Headless Components)
- **Key Logic**: Time Synchronization (Server Offset), Ticket Management (Local Storage)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Validation**: Zod (Input/Schema Validation)
- **Logging**: Winston (Structured JSON Logging)
- **Infrastructure**: AWS Lambda compatible (Serverless-http)

### Data & Infrastructure
| Component | Service | Role | Key Policy |
| :--- | :--- | :--- | :--- |
| **Menu Data** | **AWS S3** | 일별 메뉴 데이터 저장소 (`.json`) | Static, Daily Update |
| **Waiting Data** | **AWS DynamoDB** | 실시간 대기열 정보 저장소 | Time-Series, Real-time |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+ recommended)
- AWS Access Credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

### 2. Installation
```bash
# Repository Clone
git clone https://github.com/your-org/hy-eat.git
cd hy-eat

# Install Dependencies
npm install
```

### 3. Environment Configuration
프로젝트 루트에 `.env` 파일을 생성하고, `.env.example`을 참고하여 키를 설정합니다.

```env
# .env 예시
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2

# Data Sources (필수)
WAITING_SOURCE=ddb
MENU_SOURCE=s3
S3_BUCKET=hyeat-menu
DDB_TABLE_WAITING=hyeat_YOLO_data
```

### 4. Run Development Server
서버와 클라이언트(Vite)가 통합된 개발 환경을 실행합니다.
```bash
npm run dev
```
- Server: `http://localhost:5000` (API)
- Client: `http://localhost:5000` (Proxy via Vite/Express integration)

---

## 📂 Project Structure

```text
.
├── client/                 # React Frontend Host
│   ├── src/
│   │   ├── lib/            # Shared Utilities (TimeContext, TicketContext)
│   │   ├── pages/          # Route Pages (Home, CornerDetail)
│   │   └── components/     # UI Components
│   └── index.html
├── server/                 # Express Backend Host
│   ├── utils/              # Server-side Utilities (Logger, Validation)
│   ├── routes.ts           # API Route Definitions
│   ├── ddbWaitingRepo.ts   # DynamoDB Access Layer
│   └── s3MenuService.ts    # S3 Access Layer
├── shared/                 # Shared Types & Constants (FE/BE Common)
│   └── types.ts            # Domain Interfaces (Restaurant, Menu, WaitingData)
└── scripts/                # Build & Maintenance Scripts
```

---

## 📐 Architecture & Data Flow

### 1. Time Synchronization (Source of Truth)
- **서버 시간(Server Time)**이 유일한 기준입니다.
- 클라이언트는 `/api/config`를 통해 서버 시간을 수신하고, `offset`을 계산하여 로컬 시계 오차를 보정합니다.
- 모든 날짜 키(`dayKey`)는 **KST(한국 표준시)** 기준으로 처리됩니다.

### 2. Single Source of Truth (SSOT)
- 데이터는 파일 시스템이나 메모리에 캐싱되지 않으며(Memory LRU 제외), **AWS S3 및 DynamoDB**가 유일한 원본입니다.
- 운영 환경에서 AWS 연결 실패 시 503 에러를 반환하며, 로컬 더미 데이터로 폴백하지 않는 것이 원칙입니다.

### 3. API Validation & Logging
- **Input Validation**: 모든 API 요청(Query/Body)은 `Zod` 미들웨어를 통해 검증됩니다.
- **Structured Logging**: 모든 로그는 `Winston`을 통해 JSON 포맷으로 출력되어, CloudWatch 등에서의 검색 용이성을 보장합니다.

---

## 🤝 Collaboration & Deployment

### Check Code Quality
커밋 전 타입 체크를 수행하십시오.
```bash
npm run check  # runs tsc
```

### Build for Production
서버와 클라이언트를 프로덕션용으로 빌드합니다.
```bash
npm run build
```
- Output: `dist/`

### Data Contract (데이터 생성 팀)
더미 데이터 생성 및 실제 데이터 연동 시, 반드시 **`data_spec_contract.md`** 문서를 준수해야 합니다.
- **필수 준수 사항**: ID 포맷(`hanyang_plaza` 등), 시간 포맷(`ISO+09:00`), DynamoDB PK/SK 설계.

---

## ⚠️ Common Pitfalls

1.  **Timezone Issue**: 로컬 개발 환경이 KST가 아닌 경우, 날짜 계산 로직(`utils/date.ts`)이 정상 동작하는지 확인해야 합니다.
2.  **AWS Credentials**: `.env` 파일이 없거나 자격 증명이 올바르지 않으면 서버 시작 시 에러가 발생하지 않으나, API 호출 시 503/404 에러가 발생합니다.
3.  **Ticket Data**: 식권 데이터는 현재 `localStorage`에만 저장됩니다. 브라우저 캐시 삭제 시 데이터가 유실될 수 있음을 유의하십시오.

---

**Maintainer**: Antigravity Team
**License**: MIT
