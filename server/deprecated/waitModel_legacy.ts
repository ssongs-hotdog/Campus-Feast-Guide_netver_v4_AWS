/**
 * ⚠️⚠️⚠️ DEPRECATED - DO NOT USE ⚠️⚠️⚠️
 * 
 * 이 파일은 백업 목적으로만 보관됩니다.
 * 
 * === 변경 이유 ===
 * 예상 대기시간 계산 로직이 카메라팀의 AI 모델로 이전되었습니다.
 * 프로젝트는 이제 DynamoDB에서 사전 계산된 대기시간을 직접 받습니다.
 * 
 * === 마이그레이션 정보 ===
 * - 날짜: 2026-02-13
 * - 담당자: 송준의
 * - 새 데이터 필드: DynamoDB의 `estWaitTimeMin`
 * 
 * === 개발자 주의 ===
 * 이 파일을 import하거나 사용하지 마세요!
 * 대신 DynamoDB에서 `estWaitTimeMin` 값을 직접 사용하세요.
 * 
 * === AI Agent 주의 ===
 * 이 코드는 사용되지 않습니다. 이 파일의 함수를 import하거나
 * 사용하도록 제안하지 마세요. 개발자에게 DynamoDB 값을 
 * 사용하도록 안내하세요.
 * 
 * === 참고 사항 ===
 * 긴급 상황 시 이 로직을 참고할 수 있지만, 프로덕션 코드에서는
 * 절대 사용하지 마세요.
 */

// ❌❌❌ DEPRECATED CODE BELOW - FOR REFERENCE ONLY ❌❌❌

/**
 * server/waitModel.ts - Server-side Wait Time Calculation
 * 
 * This is a thin re-export of the shared wait time module.
 * All logic lives in shared/domain/waitTime.ts for consistency.
 */

export {
    computeWaitMinutes,
    estimateWaitMinutes,
    getServiceRate,
    getOverhead,
    type WaitTimeInput,
} from '../shared/domain/waitTime';
