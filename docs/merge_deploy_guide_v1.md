# HY-eat Develop → Main 병합 및 배포 가이드 (Merge & Deploy Guide)

**문서 버전:** 1.0  
**작성일:** 2026-02-15  
**대상:** HY-eat 개발팀 / 리드 엔지니어  

---

## 📋 개요 (Overview)
본 가이드는 `develop` 브랜치의 최신 작업 내용을 `main` (Production) 브랜치로 안전하게 병합하고 배포하기 위한 절차를 다룹니다. `main` 브랜치는 장기간 업데이트되지 않았으므로, 충돌 해결 및 데이터/리소스 동기화에 각별한 주의가 필요합니다.

---

## A. 사전 병합 안전 점검 (Pre-merge Safety Checklist)

작업 시작 전, 다음 항목들을 반드시 확인하고 체크하십시오.

### 1. 브랜치 및 커밋 상태 확인
- [ ] **로컬 `develop` 최신화:** 원격 `develop`의 모든 변경사항을 로컬에 pull 했습니다.
- [ ] **커밋 정리:** 불필요한 테스트 코드, 로그, 주석이 제거되었는지 확인했습니다.
- [ ] **CI 통과 확인:** `develop` 브랜치의 GitHub Actions 빌드가 성공(Green) 상태입니까?

### 2. AWS 리소스 및 환경 확인
프로덕션 환경(Main)에서 사용하는 리소스 정보를 확보합니다. 이는 `deploy.yml` 및 GitHub Secrets에 정의되어 있습니다.

- [ ] **GitHub Secrets 확인:**
    - GitHub Repository > Settings > Secrets and variables > Actions 메뉴 접속.
    - `PROD_S3_BUCKET` 값 확인 (예: `hyeat-menu` 또는 `hyeat-menu-prod`)
    - `PROD_DDB_TABLE` 값 확인 (예: `hyeat_YOLO_data` 또는 `hyeat-waiting-data-prod`)
    - `PROD_LAMBDA_NAME` 값 확인
- [ ] **AWS Console (Production) 확인:**
    - 위에서 확인한 S3 버킷과 DynamoDB 테이블이 실제 `ap-northeast-2` 리전에 존재하는지 확인.
- [ ] **Amplify 확인:**
    - AWS Amplify Console 접속.
    - `main` 브랜치에 연결된 앱(App)이 존재하는지 확인.
    - 해당 앱의 "Environment variables" 설정 확인.

### 3. 백업 (Backup Strategy)
만약의 사태에 대비해 현재 프로덕션 데이터를 백업합니다.

- [ ] **DynamoDB 백업:**
    ```powershell
    # AWS CLI 예시 (테이블명은 위에서 확인한 프로덕션 테이블명 사용)
    aws dynamodb create-backup --table-name <PROD_TABLE_NAME> --backup-name backup-pre-merge-20260215
    ```
- [ ] **S3 데이터 백업:**
    - S3는 Versioning이 켜져있지 않다면, 현재 상태를 로컬이나 다른 버킷에 백업 권장.
    ```powershell
    aws s3 sync s3://<PROD_BUCKET_NAME> ./backup-s3-prod-20260215
    ```

---

## B. 로컬 설정 및 환경 전환 전략 (Local Setup)

### 🚨 추천 전략: Option 1 (검증 후 전환)
데이터 오염 방지를 위해 **로컬에서는 `develop` 리소스로 충분히 검증**하고, `prod` 리소스는 배포 후 또는 제한적인 CLI 스크립트로만 접근하는 것을 권장합니다.

**이유:** 로컬 `.env`를 프로덕션으로 설정한 상태에서 실수로 `npm run dev`를 켜두거나 테스트 스크립트를 실행하면, 실제 사용자 데이터에 더미 데이터가 섞일 위험이 매우 높습니다.

### 안전한 `.env` 운영 전략
1. **`.env` (기본):** 개발용 리소스(`-dev`) 설정 유지.
2. **`.env.production` (참고용):** 프로덕션 리소스 정보를 담아두되, **자동 로드되지 않도록 주의**하거나, 명시적으로 스크립트 실행 시에만 로드.

### 로컬 검증 절차
1. `develop` 브랜치에서 `npm run dev` 실행.
2. 앱 기능 정상 동작 확인.
3. **프로덕션 데이터 조회 검증이 꼭 필요한 경우:**
   - 앱 전체를 실행하지 말고, `scripts/verify-aws.ts`와 같은 단일 스크립트에 환경변수를 주입하여 실행.
   ```powershell
   # PowerShell 예시 (일회성 프로덕션 조회)
   $env:S3_BUCKET="<PROD_BUCKET>"; $env:DDB_TABLE_WAITING="<PROD_TABLE>"; npx tsx scripts/verify-aws.ts
   ```

---

## C. 병합 절차 (Merge Execution)

장기간 분기된 브랜치 병합이므로 **Merge Commit**을 남기는 방식을 권장합니다.

### 1. 병합 준비
```powershell
# 1. develop 최신화
git checkout develop
git pull origin develop

# 2. main 최신화 (아무도 안 건드렸어도 안전을 위해)
git checkout main
git pull origin main

# 3. 병합용 브랜치 생성 (안전망)
git checkout -b release/v4.0.0-merge
```

### 2. 병합 실행
```powershell
git merge develop
```

### 3. 충돌 해결 (Conflict Resolution)
충돌 발생 시 다음 기준에 따라 해결합니다.

| 파일 유형 | 해결 전략 |
|---|---|
| `package.json` | `develop`의 버전 및 의존성이 최신일 확률 높음. `develop` 위주로 반영하되, `main`에만 있는 스크립트가 없는지 확인. |
| `.env.example` | 새로운 환경변수가 추가되었으므로 `develop` 내용 반영. |
| `server/` 코드 | 기능 추가가 많았으므로 `develop` 내용이 대부분 맞음. |
| `pnpm-lock.yaml` / `package-lock.json` | 충돌 시 파일을 삭제하고 `npm install`로 재생성하는 것이 깔끔함. |

**검증:**
- 충돌 해결 후 `npm install` 실행하여 의존성 문제 없는지 확인.
- `npm run build` 실행하여 빌드 오류 없는지 확인.

### 4. 커밋 및 푸시
```powershell
git commit -m "Merge develop into main for v4.0.0 release"
git push origin release/v4.0.0-merge
```

### 5. PR 생성 및 승인
- GitHub에서 `release/v4.0.0-merge` → `main` 으로 Pull Request 생성.
- "Files changed"를 면밀히 검토.
- 승인 후 Merge (Squash 하지 말고 **Create a merge commit** 권장, 히스토리 보존).

---

## D. 데이터 계층 마이그레이션 (Data Migration)

코드 배포 전/후 데이터를 동기화합니다.

### 1. S3 (메뉴 데이터)
`develop` 버킷에 추가된 최신 메뉴 파일들을 `prod` 버킷으로 복사합니다.

```powershell
# 개발 버킷 -> 프로덕션 버킷 동기화 (Dry Run으로 먼저 확인)
aws s3 sync s3://<DEV_BUCKET> s3://<PROD_BUCKET> --dryrun

# 문제 없으면 실행 (Caution: 덮어쓰기 주의)
aws s3 sync s3://<DEV_BUCKET> s3://<PROD_BUCKET>
```
*주의: 기존 프로덕션에만 있는 파일이 삭제되지 않도록 `--delete` 옵션은 사용하지 마십시오.*

### 2. DynamoDB (더미 데이터 주입)
기존 `simulator.ts`는 API 엔드포인트가 필요하므로, 프로덕션 테이블에 직접 데이터를 주입하기 위한 **전용 스크립트 생성을 권장**합니다.

**단계 1: `scripts/seed-prod-ddb.ts` 파일 생성**
아래 내용을 복사하여 새 파일을 만드십시오. (기존 로직 재사용)

```typescript
import "dotenv/config";
import { putWaitingSnapshots } from "../server/ddbWaitingRepo";
import { RESTAURANTS } from "../shared/types";

async function seed() {
  const targetDate = new Date().toISOString().split("T")[0]; // 오늘 날짜
  console.log(`Seeding data for ${targetDate} to table: ${process.env.DDB_TABLE_WAITING}`);

  const snapshots = [];
  const now = new Date();
  
  // 현재 시간 기준 1시간 전부터 현재까지 데이터 생성
  for (const r of RESTAURANTS) {
    for (const c of r.cornerOrder) {
      // 랜덤 대기열 (3~15명)
      const queueLen = Math.floor(Math.random() * 12) + 3;
      snapshots.push({
        restaurantId: r.id,
        cornerId: c,
        queueLen: queueLen,
        estWaitTimeMin: Math.floor(queueLen * 0.8),
        timestampIso: now.toISOString(),
        timestampEpochMillis: now.getTime(),
        dataType: "dummy-seed",
        source: "seed-script"
      });
    }
  }

  const result = await putWaitingSnapshots(snapshots);
  console.log("Seed result:", result);
}

seed();
```

**단계 2: 스크립트 실행 (프로덕션 타겟)**
```powershell
# 프로덕션 테이블명 환경변수 주입 후 실행
$env:DDB_TABLE_WAITING="<PROD_TABLE_NAME>"; $env:AWS_REGION="ap-northeast-2"; $env:WAITING_SOURCE="ddb"; npx tsx scripts/seed-prod-ddb.ts
```

**검증:** AWS Console > DynamoDB > `<PROD_TABLE_NAME>` > "Explore table items" 데이터 확인.

---

## E. AWS 배포 및 검증 (Deployment)

### 1. 배포 트리거
GitHub에서 `release/v4.0.0-merge`가 `main`으로 병합되면:
1. **GitHub Actions (`deploy.yml`)**가 트리거되어 Lambda 백엔드를 배포합니다.
2. **AWS Amplify Console**이 트리거되어 프론트엔드를 배포합니다.

### 2. 배포 진행 모니터링
- **Lambda:** GitHub Actions 탭에서 `Deploy to AWS Lambda` 워크플로우 진행상황 확인.
- **Frontend:** AWS Amplify Console > App 선택 > `main` 브랜치 빌드 진행상황 확인.

### 3. 배포 후 검증 체크리스트 (Post-Deployment Verification)

| 항목 | 확인 방법 | 통과 기준 |
|---|---|---|
| **Frontend 접속** | Amplify 프로덕션 URL 접속 | 페이지 로딩 성공, 콘솔 에러 없음 |
| **API 연결** | Network 탭 > XHR 확인 | `/api/menu`, `/api/waiting` 요청 200 OK |
| **메뉴 데이터** | 메인 화면 식당 카드 확인 | S3에서 복사한 메뉴 정상 표시 |
| **대기열 데이터** | 식당 상세 화면 확인 | DynamoDB Waiting 데이터 정상 표시 |
| **타임존** | 운영 시간/업데이트 시간 확인 | 한국 시간(KST)으로 올바르게 표시 |

---

## F. 설정 변경 인벤토리 (Configuration Inventory)

버킷명이나 테이블명을 변경하고 싶다면 다음 4곳을 모두 일치시켜야 합니다.

### 1. GitHub Secrets (가장 중요)
배포 파이프라인이 여기서 값을 가져옵니다.
- `PROD_S3_BUCKET` Update
- `PROD_DDB_TABLE` Update

### 2. AWS Amplify Console
프론트엔드 환경변수 (만약 백엔드 리소스를 직접 참조한다면).
- App settings > Environment variables
- *일반적으로 프론트엔드는 API Endpoint(`VITE_API_URL`)만 알면 되므로 리소스 변경 영향 적음.*

### 3. IAM Policies (권한)
Lambda가 새 리소스에 접근할 수 있어야 합니다.
- **AWS IAM Console** > Roles > `HYeatLambdaExecutionRole` (또는 해당 롤)
- `S3MenuReadOnly` 정책: `Resource` ARN을 새 버킷으로 변경.
- `DynamoDBWaitingReadWrite` 정책: `Resource` ARN을 새 테이블로 변경.

### 4. Codebase (하드코딩 점검)
코드는 환경변수를 사용해야 하지만, 실수로 하드코딩된 부분이 없는지 확인합니다.

```powershell
# ripgrep 등을 사용하여 검색
rg "hyeat-menu" ./server
rg "hyeat-waiting" ./server
rg "hyeat_YOLO" ./server
```
*발견 시: 즉시 환경변수(`process.env.XXX`) 사용으로 리팩토링.*

---

## G. 롤백 계획 (Rollback Plan)

배포 직후 치명적인 오류(500 에러, 백화 현상 등) 발생 시 실행합니다.

### 시나리오 1: 프론트엔드 오류
1. **AWS Amplify Console** 접속.
2. `main` 브랜치 > **History** 탭.
3. 이전 성공 빌드 선택 > **Redeploy this version**.

### 시나리오 2: 백엔드(Lambda) 오류
1. **GitHub Actions** > `deploy.yml` 성공했던 이전 실행 내역 확인.
2. 또는 로컬에서:
   ```powershell
   # 이전 커밋으로 되돌리기
   git revert -m 1 HEAD
   git push origin main
   ```
   *GitHub Actions가 다시 트리거되어 이전 코드로 덮어씌움.*

### 시나리오 3: 데이터 오류 (꼬임)
1. 문제는 놔두고, 앱이 데이터를 읽지 못하게 Feature Flag를 끕니다.
2. **Lambda 환경변수 수정 (AWS Console):**
   - `WAITING_SOURCE` = `disabled`
   - `MENU_SOURCE` = `disabled` (필요시)
   *API가 빈 데이터를 반환하여 앱이 죽는 것을 방지.*

---

## 🛑 Top 10 위험 요소 및 방지책 (Risk Assessment)

| 순위 | 위험 요소 | 방지책 |
|:---:|---|---|
| 1 | **Prod DB에 Dev 데이터 덮어쓰기** | 로컬 `.env`에 Prod 정보 넣지 않기. 스크립트 실행 시 환경변수 3번 확인. |
| 2 | **S3 메뉴 파일 누락** | 배포 전 `aws s3 sync` 반드시 수행. |
| 3 | **IAM 권한 부족** | 리소스 이름 변경 시 IAM Policy 업데이트 필수 (AccessDenied 에러). |
| 4 | **API Gateway 500 에러** | Lambda 환경변수(`DDB_TABLE` 등)가 Secrets에서 제대로 주입됐는지 콘솔 확인. |
| 5 | **CORS 에러** | API Gateway > CORS 설정 확인. `Access-Control-Allow-Origin: *`. |
| 6 | **타임존 불일치 (UTC vs KST)** | 서버 로그 시간 확인. 모든 날짜 처리가 `utils/date.ts`를 통하는지 확인. |
| 7 | **클라이언트 캐시 문제** | Amplify 배포 완료 후 브라우저 강력 새로고침(Ctrl+Shift+R) 테스트. |
| 8 | **Build 실패 (타입 에러)** | 병합 직후 로컬에서 `npm run check`(tsc) 및 `npm run build` 필히 실행. |
| 9 | **Lambda Cold Start 지연** | 배포 직후 `/health` API를 몇 번 호출하여 웜업(Warm-up). |
| 10 | **환경변수 오타** | `hyeat-menu` vs `hyeat_menu` 등. GitHub Secrets와 AWS 리소스명 교차 검증. |
