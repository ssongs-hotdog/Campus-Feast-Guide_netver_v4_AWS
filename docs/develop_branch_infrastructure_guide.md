# HY-eat 개발 브랜치 구조 및 인프라 가이드 (Ver 1.0)

본 문서는 **Campus Feast Guide (HY-eat)** 프로젝트의 개발 브랜치(`develop`) 구조, CI/CD 파이프라인 작동 방식, 그리고 데이터베이스 및 AWS 인프라 관리 전략에 대한 최종 가이드입니다.

---

## 1. 프로젝트 브랜치 전략 (Branch Strategy)

이 프로젝트는 **Git Flow**를 단순화한 구조를 따르며, 두 개의 주요 브랜치를 운영합니다.

### 1-1. 브랜치 구분
| 브랜치명 | 역할 | 연결된 환경 (AWS) | 배포 방식 |
| :--- | :--- | :--- | :--- |
| **`main`** | **운영(Production)** 배포용 | `PROD` 리소스 (실사용자용 DB/Lambda) | GitHub Actions 자동 배포 |
| **`develop`** | **개발(Development)** 및 테스트용 | `DEV` 리소스 (테스트용 DB/Lambda) | GitHub Actions 자동 배포 (Merge 시) |
| `feature/*` | 개별 기능 개발용 | (로컬 환경) | 로컬 테스트 후 `develop`으로 PR |

### 1-2. 핵심 원칙
1.  **철저한 격리**: `main`과 `develop`은 완전히 분리된 **별도의 AWS 리소스(DB, Lambda, S3)**를 사용합니다.
2.  **코드 = 설정**: 코드는 실행될 때 환경변수(`DDB_TABLE_WAITING` 등)를 통해 자신이 어떤 DB와 통신해야 하는지 알게 됩니다. 코드 내부에 DB 이름이 하드코딩되어 있지 않습니다.
3.  **자동 배포**: `develop`이나 `main` 브랜치에 코드가 푸시(Merge)되면, GitHub Actions가 자동으로 해당 환경에 코드를 배포합니다.

---

## 2. 아키텍처 및 리소스 구조

개발 환경과 운영 환경은 데칼코마니처럼 동일한 구조를 가지지만, 서로 다른 리소스를 바라봅니다.

```mermaid
graph TD
    subgraph "Production Environment (Main Branch)"
        ProdUser((실사용자)) --> ProdAPI[API Gateway (Prod)]
        ProdAPI --> ProdLambda[Lambda (Prod)]
        ProdLambda --> ProdDB[(DynamoDB Prod)]
        ProdLambda --> ProdS3[(S3 Bucket Prod)]
    end

    subgraph "Development Environment (Develop Branch)"
        DevUser((개발자/테스터)) --> DevAPI[API Gateway (Dev)]
        DevAPI --> DevLambda[Lambda (Dev)]
        DevLambda --> DevDB[(DynamoDB Dev)]
        DevLambda --> DevS3[(S3 Bucket Dev)]
    end
```

*   **Lambda**: `hy-eat-api-prod` vs `hy-eat-api-dev`
*   **DynamoDB**: `hyeat-waiting-data-prod` vs `hyeat-waiting-data-dev`

---

## 3. 개발 및 배포 워크플로우 (Step-by-Step)

안전한 개발과 배포를 위해 반드시 아래 절차를 준수해야 합니다.

### Step 1: 기능 개발 (Local)
1.  `develop` 브랜치에서 새로운 `feature/기능명` 브랜치를 생성합니다.
2.  로컬에서 코드를 수정하고 테스트합니다.
    *   *Tip: `.env` 파일을 수정하여 로컬에서도 개발용 DB(`DEV_DDB_TABLE`)를 바라보게 설정하여 테스트할 수 있습니다.*

### Step 2: 개발 환경 배포 (Develop)
1.  작업한 `feature` 브랜치를 `develop` 브랜치로 **Pull Request (PR)** 보냅니다.
2.  PR이 승인되고 **Merge** 되면, GitHub Actions가 자동으로 작동합니다.
3.  **결과 확인**: 개발용 API 엔드포인트에서 기능이 정상 작동하는지 확인합니다.
    *   이 단계에서 백엔드 로직이 수정되어도 **운영(Main) DB에는 전혀 영향을 주지 않습니다.**

### Step 3: 운영 환경 배포 (Main)
1.  개발 환경에서 충분한 테스트가 완료되면, `develop` 브랜치를 `main` 브랜치로 **PR** 및 **Merge** 합니다.
2.  GitHub Actions가 운영용 Lambda에 코드를 배포합니다.
3.  이제 실사용자가 수정된 기능을 사용하게 됩니다.

---

## 4. 데이터베이스 및 인프라 변경 전략 (중요)

> **핵심 규칙**: CI/CD는 **"코드(로직)"**만 배포합니다. **"인프라(DB테이블, S3버킷 등)"**는 자동으로 생성되거나 변경되지 않습니다.

### 4-1. 코드만 변경되는 경우 (자동)
*   **예시**: API 응답 메시지 수정, 단순 버그 픽스, DynamoDB에 새로운 필드(속성) 추가.
*   **조치**: 그냥 코드만 배포하면 됩니다. **NoSQL** 특성상, 코드에서 새로운 필드를 저장하기 시작하면 DB에도 자동으로 저장됩니다.

### 4-2. 인프라/설정 변경이 필요한 경우 (수동)
*   **예시**:
    *   새로운 DynamoDB 테이블 생성 (`User` 테이블 신설 등)
    *   DynamoDB 검색 인덱스(GSI) 추가
    *   새로운 S3 버킷 생성 (`archiving-bucket`)
    *   Lambda의 메모리 증설 또는 타임아웃 변경
    *   Lambda에 새로운 환경변수 추가

*   **실행 절차**:
    1.  **Dev 환경 적용**: AWS 개발 계정(또는 개발용 리소스)에 수동으로 변경사항을 적용하고, `develop` 브랜치에서 테스트합니다.
    2.  **Main 배포 전 준비**: `main`으로 머지하기 **직전** 혹은 머지한 **즉시**, **AWS 운영 계정(Prod)** 콘솔에 접속합니다.
    3.  **Prod 환경 동기화**: 개발 환경과 똑같이 운영 환경의 리소스를 수동으로 생성/수정합니다. (예: Prod용 S3 버킷 생성)
    4.  **배포**: 이제 `main` 배포가 완료되면 코드가 정상적으로 새 리소스를 찾을 수 있습니다.

### 4-3. (질문 답변) S3 아카이빙 기능 구현 시나리오
**질문**: *"과거 데이터 S3 아카이빙 기능을 개발해서 메인으로 보낼 때, 메인 쪽 인프라도 수동으로 만져줘야 하는가?"*

**답변**: **네, 맞습니다.**
1.  **코드 작성**: Lambda가 "오래된 데이터를 `TARGET_BUCKET`으로 옮기는" 로직을 작성.
2.  **Dev 테스트**: 개발용 버킷 (`dev-archive-bucket`)을 만들고 테스트 성공.
3.  **Prod 준비 (필수)**: `main` 배포 전에 AWS 콘솔에서 운영용 버킷 (`prod-archive-bucket`)을 **직접 생성**해야 합니다.
4.  **환경변수 설정**: GitHub Secrets에 `PROD_ARCHIVE_BUCKET_NAME` 등을 추가하여, 배포 시 운영 코드가 올바른 버킷을 찾도록 설정해야 합니다.

---

## 5. FAQ 및 주의사항

Q1. **`main` 브랜치에 바로 커밋하면 안 되나요?**
*   절대 금지입니다. `main`은 언제나 "배포 가능한 안정 상태"여야 합니다. 실수로 에러가 포함된 코드가 올라가면 즉시 사용자 장애로 이어집니다.

Q2. **로컬에서 DB 연결은 어떻게 하나요?**
*   `.env` 파일에 AWS 자격증명(`AWS_ACCESS_KEY_ID`, `SECRET`)과 사용할 테이블 이름(`DDB_TABLE_WAITING`)을 적어두면, 로컬에서 실행(`npm run dev`)해도 실제 AWS DB(보통 Dev DB)와 통신하며 테스트할 수 있습니다.

Q3. **인프라 변경을 까먹고 배포하면 어떻게 되나요?**
*   코드는 배포되지만 실행 시 에러가 발생합니다. (예: `AccessDenied`, `ResourceNotFoundException`). 따라서 인프라 변경이 포함된 배포는 팀원들에게 "배포 전 OO버킷 생성 필요"라고 공지해야 합니다.
