# HY-eat AWS 통합 및 CI/CD 구축 완벽 가이드
**AWS Serverless Integration & CI/CD Implementation Guide**

**문서 버전:** 1.0  
**최종 수정일:** 2026-02-09  
**작성자:** Antigravity (Senior DevOps Engineer)  
**대상:** HY-eat 개발팀 (초급~중급 개발자 대상)  

---

## 📋 목차 (Table of Contents)

0. [필수 준비사항 및 용어](#0-필수-준비사항-및-용어)
1. [계정 및 리전 전략](#1-계정-및-리전-전략)
2. [IAM 전략 (최소 권한 원칙)](#2-iam-전략-최소-권한-원칙)
3. [S3 메뉴 스토리지 구축](#3-s3-메뉴-스토리지-구축)
4. [DynamoDB 대기열 테이블 구축](#4-dynamodb-대기열-테이블-구축)
5. [Lambda 백엔드 구축](#5-lambda-백엔드-구축)
6. [API Gateway 구축](#6-api-gateway-구축)
7. [Amplify 프론트엔드 배포](#7-amplify-프론트엔드-배포)
8. [CI/CD 파이프라인 설계](#8-cicd-파이프라인-설계)
9. [End-to-End 검증 프로토콜](#9-end-to-end-검증-프로토콜)
10. [트러블슈팅 플레이북](#10-트러블슈팅-플레이북)
11. [보안 체크리스트](#11-보안-체크리스트)
12. [부록](#12-부록)

---

## 0. 필수 준비사항 및 용어

### 0.1 아키텍처 목표
```
[사용자 브라우저]
       ↓
[AWS Amplify (CDN + Static Hosting)]
       ↓ HTTPS API 호출
[API Gateway (REST API)]
       ↓ Lambda Proxy
[Lambda Function (Node.js)]
       ↓ AWS SDK
[S3 Bucket (메뉴)]  [DynamoDB (대기열)]
```

**핵심 원칙:**
- ✅ **프론트엔드는 AWS 시크릿 키를 절대 포함하지 않음**
- ✅ **모든 타임스탬프는 KST(+09:00) 기준**
- ✅ **IAM 최소 권한 원칙 (Least Privilege)**
- ✅ **환경 분리 가능 (Dev/Prod)**

### 0.2 필수 계정 및 도구
- [ ] AWS 계정 (루트 사용자 또는 관리자 IAM 사용자)
- [ ] GitHub 계정 (코드 저장소)
- [ ] Node.js 20.x 이상 (로컬 테스트용)
- [ ] AWS CLI v2 (선택사항, 자동화용)

### 0.3 핵심 용어
| 용어 | 설명 |
|---|---|
| **Amplify** | 정적 웹사이트 호스팅 + CI/CD 통합 서비스 |
| **API Gateway** | HTTP 요청을 Lambda로 전달하는 관문 |
| **Lambda** | 서버 없이 코드만 실행하는 컴퓨팅 서비스 |
| **IAM Role** | AWS 리소스에 부여하는 권한 묶음 |
| **PK/SK** | DynamoDB의 Partition Key / Sort Key |
| **TTL** | Time To Live (자동 삭제 시간) |
| **OIDC** | OpenID Connect (GitHub Actions 인증 방식) |

---

## 1. 계정 및 리전 전략

### 1.1 리전 선택 (중요!)
> ⚠️ **일관성 유지:** 모든 리소스(S3, DynamoDB, Lambda, API Gateway)를 **동일한 리전**에 생성하세요.

**권장 리전:** `ap-northeast-2` (서울)
- **이유:** 사용자가 한국에 있으므로 지연 시간 최소화.

**설정 방법:**
1. AWS Console 로그인 후 우측 상단 리전 드롭다운 확인.
2. **"아시아 태평양(서울) ap-northeast-2"** 선택.
3. 이후 모든 작업에서 **반드시 동일한 리전 유지**.

### 1.2 계정 전략
- **개발/테스트:** 단일 AWS 계정 사용 가능.
- **프로덕션:** 별도 AWS 계정 권장 (조직 내 보안 정책에 따름).

### 1.3 검증
```bash
# AWS CLI로 현재 리전 확인
aws configure get region
# 출력: ap-northeast-2
```

**롤백:** 리전은 변경 불가하므로, 잘못 선택 시 리소스 삭제 후 재생성 필요.

---

## 2. IAM 전략 (최소 권한 원칙)

### 2.1 IAM 사용자 vs IAM 역할
| 대상 | 사용 방법 | 시크릿 키 필요 여부 |
|---|---|---|
| **Lambda** | IAM Role (자동 부여) | ❌ 불필요 |
| **GitHub Actions** | OIDC Provider (임시 토큰) | ❌ 불필요 |
| **개발자 (로컬)** | IAM User (선택) | ⚠️ 필요 (노출 주의) |

### 2.2 Lambda Execution Role 생성
**목적:** Lambda가 S3와 DynamoDB에 접근할 수 있도록 권한 부여.

**단계:**
1. **AWS Console > IAM > Roles > Create role** 클릭.
2. **Trusted entity type:** `AWS service` 선택.
3. **Use case:** `Lambda` 선택 → **Next**.
4. **Permission policies** 화면에서 **"Create policy"** 클릭 (새 탭).
5. 아래 JSON 정책을 붙여넣기:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3MenuReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::hyeat-menu",
        "arn:aws:s3:::hyeat-menu/menus/*"
      ]
    },
    {
      "Sid": "DynamoDBWaitingReadWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-2:*:table/hyeat_YOLO_data"
    },
    {
      "Sid": "CloudWatchLogsWrite",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-northeast-2:*:log-group:/aws/lambda/hyeat-api-*"
    }
  ]
}
```

6. Policy name: `HYeatLambdaExecutionPolicy` → **Create policy**.
7. 원래 Role 생성 탭으로 돌아와 **새로고침** 후 방금 만든 정책 체크.
8. Role name: `HYeatLambdaExecutionRole` → **Create role**.

**🔒 보안 포인트:**
- `Resource`를 특정 버킷/테이블로 제한 (와일드카드 최소화).
- `s3:*` 같은 과도한 권한 금지.

### 2.3 시크릿 저장 전략
| 시크릿 종류 | 저장 위치 | 예시 |
|---|---|---|
| API Gateway URL | Amplify 환경 변수 | `VITE_API_URL` |
| DynamoDB 테이블명 | Lambda 환경 변수 | `DDB_TABLE_WAITING` |
| S3 버킷명 | Lambda 환경 변수 | `S3_BUCKET` |
| AWS Access Key | **사용 금지** (IAM Role 사용) | - |

**권장:**
- **민감하지 않은 설정:** Lambda/Amplify 환경 변수.
- **고도로 민감한 정보:** AWS Secrets Manager (추가 비용 발생).

### 2.4 검증
```bash
# 생성된 Role 확인
aws iam get-role --role-name HYeatLambdaExecutionRole
```

**롤백:**
```bash
aws iam delete-role --role-name HYeatLambdaExecutionRole
```

---

## 3. S3 메뉴 스토리지 구축

### 3.1 버킷 생성
**단계:**
1. **AWS Console > S3 > Create bucket** 클릭.
2. **Bucket name:** `hyeat-menu` (변수: 원하는 이름 사용, 전역 고유해야 함).
3. **AWS Region:** `ap-northeast-2` 선택.
4. **Block Public Access settings:** 모두 체크 유지 (공개 접근 차단).
5. **Bucket Versioning:** Disabled (선택사항).
6. **Default encryption:** Enable (SSE-S3).
7. **Create bucket** 클릭.

### 3.2 폴더 구조 및 객체 명명 규칙
**폴더:** `menus/`  
**파일명 패턴:** `YYYY-MM-DD.json`

**예시:**
```
s3://hyeat-menu/
  └── menus/
      ├── 2026-02-09.json
      ├── 2026-02-10.json
      └── 2026-02-11.json
```

**샘플 객체 (`menus/2026-02-09.json`):**
```json
{
  "학생식당": {
    "3000_corner": {
      "restaurantId": "학생식당",
      "cornerId": "3000_corner",
      "cornerDisplayName": "3,000원 코너",
      "mainMenuName": "김치찌개",
      "priceWon": 3000,
      "items": ["김치찌개", "밥", "김치", "단무지"]
    }
  }
}
```

### 3.3 CORS 설정 (❌ 권장하지 않음)
**Q: 프론트엔드에서 직접 S3를 읽어야 하나요?**  
**A: 아니요.** Lambda를 통해 읽어야 합니다.

**이유:**
- S3 직접 접근 시 버킷명/키 노출.
- Lambda를 거치면 접근 제어 및 로깅 가능.

### 3.4 검증
```bash
# 버킷 존재 확인
aws s3 ls s3://hyeat-menu/

# 샘플 파일 업로드
echo '{"test": "data"}' > test.json
aws s3 cp test.json s3://hyeat-menu/menus/2026-02-09.json

# 조회
aws s3 cp s3://hyeat-menu/menus/2026-02-09.json -
```

**롤백:**
```bash
# 버킷 삭제 (주의: 모든 객체 먼저 삭제 필요)
aws s3 rb s3://hyeat-menu --force
```

---

## 4. DynamoDB 대기열 테이블 구축

### 4.1 테이블 생성
**단계:**
1. **AWS Console > DynamoDB > Tables > Create table** 클릭.
2. **Table name:** `hyeat_YOLO_data` (변수: 프로젝트 규칙에 따라 변경).
3. **Partition key:** `pk` (String).
4. **Sort key:** `sk` (String).
5. **Table settings:** `Customize settings` 선택.
6. **Read/write capacity:** `On-demand` (트래픽 예측 불가 시 권장).
7. **Encryption:** `Owned by Amazon DynamoDB` (무료).
8. **Create table** 클릭.

### 4.2 TTL 설정
**목적:** 90일 후 오래된 데이터 자동 삭제.

**단계:**
1. 생성된 테이블 클릭 > **Additional settings** 탭.
2. **Time to Live (TTL)** 섹션 > **Manage TTL** 클릭.
3. **TTL attribute:** `ttl` 입력.
4. **Enable TTL** 클릭.

### 4.3 PK/SK 패턴 설명
```
PK: "CORNER#<restaurantId>#<cornerId>"
SK: "<epochMillis>"  (예: "1707454800000")
```

**예시 아이템:**
```json
{
  "pk": "CORNER#학생식당#3000_corner",
  "sk": "1707454800000",
  "restaurantId": "학생식당",
  "cornerId": "3000_corner",
  "queueLen": 15,
  "dataType": "observed",
  "source": "camera",
  "timestampIso": "2026-02-09T12:00:00+09:00",
  "createdAtIso": "2026-02-09T12:00:30+09:00",
  "ttl": 1715238430
}
```

### 4.4 쿼리 패턴
**예시: 특정 날짜의 최신 데이터 조회**
```python
# Pseudocode
Query({
  KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
  ExpressionAttributeValues: {
    ":pk": "CORNER#학생식당#3000_corner",
    ":start": "1707408000000",  # 2026-02-09 00:00:00 KST
    ":end": "1707494399999"     # 2026-02-09 23:59:59 KST
  },
  ScanIndexForward: false,  # 내림차순 (최신 우선)
  Limit: 1
})
```

### 4.5 타임스탬프 형식 규칙
**필수:** 모든 `timestampIso`는 **KST +09:00 형식** 사용.

**올바른 예:**
```
2026-02-09T14:30:00+09:00
```

**잘못된 예:**
```
2026-02-09T05:30:00Z        # UTC (X)
2026-02-09T14:30:00         # 타임존 없음 (X)
```

### 4.6 검증
```bash
# 테이블 상태 확인
aws dynamodb describe-table --table-name hyeat_YOLO_data --query 'Table.TableStatus'

# 샘플 아이템 삽입
aws dynamodb put-item \
  --table-name hyeat_YOLO_data \
  --item '{
    "pk": {"S": "CORNER#학생식당#3000_corner"},
    "sk": {"S": "1707454800000"},
    "queueLen": {"N": "10"}
  }'
```

**롤백:**
```bash
aws dynamodb delete-table --table-name hyeat_YOLO_data
```

---

## 5. Lambda 백엔드 구축

### 5.1 함수 생성
**단계:**
1. **AWS Console > Lambda > Functions > Create function** 클릭.
2. **Function name:** `hyeat-api-test` (변수: 환경별 명명 규칙 적용).
3. **Runtime:** `Node.js 20.x`.
4. **Architecture:** `x86_64`.
5. **Execution role:** `Use an existing role` → `HYeatLambdaExecutionRole` 선택.
6. **Create function** 클릭.

### 5.2 환경 변수 설정
**Configuration > Environment variables > Edit**

| Key | Value | 설명 |
|---|---|---|
| `AWS_REGION` | `ap-northeast-2` | 리전(자동 설정되지만 명시 권장) |
| `DDB_TABLE_WAITING` | `hyeat_YOLO_data` | DynamoDB 테이블명 |
| `S3_BUCKET` | `hyeat-menu` | S3 버킷명 |
| `WAITING_SOURCE` | `ddb` | 대기열 데이터 소스 |
| `MENU_SOURCE` | `s3` | 메뉴 데이터 소스 |
| `MENU_CACHE_ENABLED` | `true` | 메뉴 캐싱 활성화 |

### 5.3 코드 배포 (GitHub Actions 사용)
**수동 배포 (임시):**
1. 로컬에서 `npm run build:lambda` 실행.
2. `function.zip` 생성 확인.
3. Lambda Console > **Code** 탭 > **Upload from** > **.zip file** 선택.
4. `function.zip` 업로드.

**자동 배포 (권장):** 8장 CI/CD 참조.

### 5.4 Handler 설정
**Configuration > General configuration > Edit**
- **Handler:** `lambda.handler`

### 5.5 Timeout & Memory
- **Timeout:** `30초` (API 응답 시간 고려).
- **Memory:** `512 MB` (Express 앱 + AWS SDK 충분).

### 5.6 로깅 (CloudWatch)
**자동 생성:** `/aws/lambda/hyeat-api-test`

**로그 확인:**
```bash
aws logs tail /aws/lambda/hyeat-api-test --follow
```

### 5.7 검증
**Test 이벤트 생성:**
```json
{
  "rawPath": "/health",
  "requestContext": {
    "http": {
      "method": "GET"
    }
  },
  "headers": {}
}
```

**Test 실행 → 예상 응답:**
```json
{
  "statusCode": 200,
  "body": "{\"status\":\"ok\",...}"
}
```

**롤백:**
```bash
aws lambda delete-function --function-name hyeat-api-test
```

---

## 6. API Gateway 구축

### 6.1 REST API vs HTTP API 비교
| 기능 | REST API | HTTP API |
|---|---|---|
| 비용 | 높음 | 낮음 (60% 저렴) |
| Lambda 통합 | 지원 | 지원 |
| CORS | 수동 설정 | 자동 지원 |
| 복잡한 인증 | 지원 | 제한적 |

**권장:** HY-eat은 **HTTP API** 사용 (비용 효율적, CORS 간편).

### 6.2 HTTP API 생성
**단계:**
1. **AWS Console > API Gateway > Create API** 클릭.
2. **HTTP API > Build** 선택.
3. **Add integration:** `Lambda` 선택.
4. **Lambda function:** `hyeat-api-test` (리전: ap-northeast-2).
5. **API name:** `hyeat-api` (변수).
6. **Next** 클릭.

### 6.3 라우트 설정
**Configure routes 화면:**
- **Method:** `ANY`
- **Resource path:** `/{proxy+}`
- **Integration target:** `hyeat-api-test`

**추가 라우트 (Health Check):**
- **Method:** `GET`
- **Resource path:** `/health`
- **Integration target:** `hyeat-api-test`

**Next** → **Next** → **Create**.

### 6.4 CORS 설정
**API > CORS > Configure**
- **Access-Control-Allow-Origin:** `*` (또는 Amplify 도메인만 허용).
- **Access-Control-Allow-Methods:** `GET, POST, OPTIONS`
- **Access-Control-Allow-Headers:** `Content-Type, Authorization`

**Save** 클릭.

### 6.5 Deploy
**Stages 탭 > default stage** (자동 생성됨).

**Invoke URL 복사:**
```
https://<api-id>.execute-api.ap-northeast-2.amazonaws.com
```

### 6.6 검증
```bash
# Health Check
curl https://<api-id>.execute-api.ap-northeast-2.amazonaws.com/health
# 예상 응답: {"status":"ok",...}

# Menu API
curl "https://<api-id>.execute-api.ap-northeast-2.amazonaws.com/api/menu?date=2026-02-09"
```

**롤백:**
```bash
aws apigatewayv2 delete-api --api-id <api-id>
```

---

## 7. Amplify 프론트엔드 배포

### 7.1 GitHub 연동
**단계:**
1. **AWS Console > Amplify > All apps > New app > Host web app** 클릭.
2. **GitHub** 선택 → **Authorize AWS Amplify** 클릭.
3. **Repository:** `Campus-Feast-Guide_netver_v4_AWS` 선택.
4. **Branch:** `main` 선택.
5. **Next** 클릭.

### 7.2 빌드 설정
**App name:** `hyeat-campus-feast`

**Build settings (자동 감지됨):**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist/public
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

**Next** 클릭.

### 7.3 환경 변수 설정
**Advanced settings > Environment variables > Add**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<api-id>.execute-api.ap-northeast-2.amazonaws.com` |

> ⚠️ **중요:** URL 끝에 `/` 없이 입력!

**Save and deploy** 클릭.

### 7.4 배포 확인
**Provisioning → Build → Deploy → Verify**

**완료 시 도메인:**
```
https://main.<app-id>.amplifyapp.com
```

### 7.5 캐시 무효화 (필요시)
**앱 > Hosting > Rewrites and redirects**

프론트엔드 라우팅을 위한 설정:
```
Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>
Target: /index.html
Type: 200 (Rewrite)
```

### 7.6 검증
1. 브라우저에서 Amplify URL 접속.
2. **F12 > Network 탭** 확인.
3. API 요청이 `https://<api-id>...`로 전송되는지 확인.
4. 메뉴 데이터가 화면에 표시되는지 확인.

**롤백:**
```bash
# Amplify CLI 설치 후
amplify delete
```

---

## 8. CI/CD 파이프라인 설계

### 8.1 브랜치 전략
```
main (production) ← merge from dev
  ↑
dev (staging) ← merge from feature/*
  ↑
feature/* (개발 branch)
```

### 8.2 GitHub Actions Workflow
**파일 위치:** `.github/workflows/deploy.yml`

**트리거:**
```yaml
on:
  push:
    branches:
      - main
```

### 8.3 OIDC 인증 설정
**IAM > Identity providers > Add provider**
- **Provider type:** OpenID Connect
- **Provider URL:** `https://token.actions.githubusercontent.com`
- **Audience:** `sts.amazonaws.com`

**IAM Role 생성:**
- **Trust relationship:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:<org>/<repo>:*"
      }
    }
  }]
}
```

### 8.4 환경 분리 (Dev/Prod)
**Lambda Functions:**
- `hyeat-api-dev`
- `hyeat-api-prod`

**Amplify Branches:**
- `dev` → 자동 배포
- `main` → 수동 승인 후 배포

### 8.5 롤백 전략
**Lambda 버전 관리:**
1. 각 배포 시 자동으로 버전 생성.
2. 문제 발생 시 **Aliases**를 이전 버전으로 변경.

**Amplify 롤백:**
```bash
# Console > Domain management > Rollback
```

---

## 9. End-to-End 검증 프로토콜

### 9.1 API 직접 호출 테스트
```bash
# 1. Health Check
curl -i https://<api-id>.execute-api.ap-northeast-2.amazonaws.com/health

# 예상: HTTP/1.1 200 OK
# Body: {"status":"ok","timestamp":"2026-02-09T...+09:00",...}

# 2. Menu API
curl -i "https://<api-id>.execute-api.ap-northeast-2.amazonaws.com/api/menu?date=2026-02-09"

# 예상: HTTP/1.1 200 OK (데이터 있을 경우)
# 또는 404 (데이터 없을 경우)

# 3. Waiting API
curl -i "https://<api-id>.execute-api.ap-northeast-2.amazonaws.com/api/waiting/latest?date=2026-02-09"

# 예상: 200 OK 또는 503 (DDB 비활성화 시)
```

### 9.2 프론트엔드 → 백엔드 통합 확인
**단계:**
1. Amplify URL에서 페이지 로드.
2. **F12 > Network 탭** 확인.
3. `menu?date=...` 요청 찾기.
4. **Request URL**이 API Gateway URL인지 확인.
5. **Response** 탭에서 JSON 데이터 확인.

### 9.3 CloudWatch 로그 확인
```bash
# 최근 Lambda 로그 조회
aws logs tail /aws/lambda/hyeat-api-test --since 5m
```

**확인 사항:**
- `GET /api/menu` 로그 존재.
- 에러 없음 (`ERROR` 키워드 검색).

### 9.4 "AWS에서 읽는다" 증명
**S3 메뉴 테스트:**
1. S3에서 특정 날짜 파일 수정 (예: 메뉴 이름 변경).
2. Lambda 캐시 클리어 (또는 TTL 대기).
3. 프론트엔드에서 해당 날짜 조회 → **변경된 데이터 표시 확인**.

**DynamoDB 테스트:**
1. DynamoDB에 수동으로 대기열 데이터 추가.
2. `/api/waiting/latest` 호출 → **방금 추가한 데이터 반환 확인**.

---

## 10. 트러블슈팅 플레이북

### 10.1 CORS 에러
**증상:**
```
Access to fetch at '...' has been blocked by CORS policy
```

**원인:** API Gateway CORS 미설정.

**해결:**
1. API Gateway > CORS > Configure.
2. `Access-Control-Allow-Origin: *` 추가.

### 10.2 403 Forbidden (S3/DynamoDB)
**증상:** Lambda 로그에 `AccessDenied`.

**원인:** IAM Role에 권한 부족.

**해결:**
1. IAM Role 정책 확인.
2. S3 버킷/DynamoDB 테이블 ARN 정확한지 확인.

### 10.3 환경 변수 누락
**증상:** `Cannot read properties of undefined`.

**원인:** Lambda 환경 변수 미설정.

**해결:**
1. Lambda > Configuration > Environment variables 확인.
2. `DDB_TABLE_WAITING`, `S3_BUCKET` 등 필수 변수 추가.

### 10.4 타임스탬프 파싱 에러
**증상:** DynamoDB 쿼리 결과 빈 배열.

**원인:** `sk` 범위 계산 오류 (UTC vs KST).

**해결:**
1. `server/utils/date.ts`의 `getKSTDayBoundaries` 로직 확인.
2. 로그에서 실제 쿼리 조건 출력하여 디버깅.

### 10.5 잘못된 리전
**증상:** `The requested region is not supported`.

**해결:**
1. 모든 리소스가 동일한 리전(`ap-northeast-2`)인지 확인.
2. 환경 변수 `AWS_REGION` 확인.

---

## 11. 보안 체크리스트

### 11.1 배포 전 필수 확인
- [ ] 프론트엔드 코드에 AWS Access Key 없음.
- [ ] `.env` 파일이 `.gitignore`에 포함됨.
- [ ] IAM Role이 최소 권한만 가짐 (`*` 사용 최소화).
- [ ] S3 버킷의 Public Access 차단 활성화.
- [ ] DynamoDB 테이블 암호화 활성화 (기본값).
- [ ] API Gateway에 Rate Limiting 설정 (선택).

### 11.2 운영 중 모니터링
- [ ] CloudWatch Alarm 설정 (에러율 > 5%).
- [ ] Lambda Concurrent Executions 모니터링.
- [ ] 비정상적인 API 요청 패턴 감지.

---

## 12. 부록

### 12.1 최소 IAM 정책 템플릿
**Lambda Execution Role (완전판):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::hyeat-menu",
        "arn:aws:s3:::hyeat-menu/menus/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-2:*:table/hyeat_YOLO_data"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:ap-northeast-2:*:*"
    }
  ]
}
```

### 12.2 샘플 API 응답
**Menu API:**
```json
{
  "학생식당": {
    "3000_corner": {
      "restaurantId": "학생식당",
      "cornerId": "3000_corner",
      "cornerDisplayName": "3,000원 코너",
      "mainMenuName": "김치찌개",
      "priceWon": 3000,
      "items": ["김치찌개", "밥", "김치"]
    }
  }
}
```

**Waiting API:**
```json
[
  {
    "timestamp": "2026-02-09T12:00:00+09:00",
    "restaurantId": "학생식당",
    "cornerId": "3000_corner",
    "queueLen": 15,
    "estWaitTimeMin": 5,
    "data_type": "observed"
  }
]
```

### 12.3 릴리스 체크리스트
- [ ] 모든 API 엔드포인트 수동 테스트 완료.
- [ ] 프론트엔드 → 백엔드 통합 테스트 완료.
- [ ] CloudWatch 로그에 에러 없음.
- [ ] S3/DynamoDB에 실제 데이터 존재.
- [ ] 사용자 시나리오 테스트 (날짜 변경, 메뉴 조회, 대기 확인).

### 12.4 롤백 체크리스트
- [ ] 이전 Lambda 버전 ARN 기록.
- [ ] Amplify 이전 배포 ID 기록.
- [ ] 데이터베이스 백업 (DynamoDB On-Demand Backup).
- [ ] 롤백 후 Health Check 재확인.

---

## 📞 문의 및 지원

**도움이 필요하시면:**
1. CloudWatch 로그를 먼저 확인하세요.
2. 트러블슈팅 플레이북(10장)을 참조하세요.
3. 팀 슬랙/이메일로 문의하세요.

**문서 피드백:**
- 이 가이드의 개선 사항이 있다면 GitHub Issue 또는 PR로 제안해주세요!

---

**이 가이드를 따르면 HY-eat 프로젝트의 AWS 통합이 완벽하게 완료됩니다.** 🎉
