import type {
  CornerOpsState,
  OpsActionEvent,
  OpsReasonCode,
  OpsStatus,
} from "../data/opsControlModels";
import {
  appendOpsEvent as appendOpsEventStore,
  getOpsEvents,
  getOpsStates as getOpsStatesStore,
  setCornerSoldOut as setCornerSoldOutStore,
  setCornerStatus as setCornerStatusStore,
} from "../data/opsControlStore";

function simulateNetwork<T>(data: T, latencyMs = 180): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), latencyMs);
  });
}

function maybeThrowTransientError(): void {
  if (Math.random() < 0.05) {
    throw new Error("일시적인 반영 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export async function getOpsStates(): Promise<CornerOpsState[]> {
  const rows = await getOpsStatesStore();
  return simulateNetwork(rows, 240);
}

export async function getRecentOpsEvents(limit = 200): Promise<OpsActionEvent[]> {
  const rows = await getOpsEvents();
  return simulateNetwork(rows.slice(0, limit), 180);
}

export async function setCornerStatus(input: {
  restaurantId: string;
  cornerId: string;
  status: OpsStatus;
  reasonCode: OpsReasonCode;
  memo?: string;
  actor?: string;
}): Promise<{ before: CornerOpsState; after: CornerOpsState }> {
  maybeThrowTransientError();
  const result = await setCornerStatusStore(
    input.restaurantId,
    input.cornerId,
    input.status,
    input.reasonCode,
    input.memo,
    input.actor
  );
  return simulateNetwork(result, 160);
}

export async function setCornerSoldOut(input: {
  restaurantId: string;
  cornerId: string;
  soldOut: boolean;
  reasonCode: OpsReasonCode;
  memo?: string;
  actor?: string;
}): Promise<{ before: CornerOpsState; after: CornerOpsState }> {
  maybeThrowTransientError();
  const result = await setCornerSoldOutStore(
    input.restaurantId,
    input.cornerId,
    input.soldOut,
    input.reasonCode,
    input.memo,
    input.actor
  );
  return simulateNetwork(result, 160);
}

export async function appendOpsEvent(input: {
  restaurantId: string;
  cornerId: string;
  actionType: OpsActionEvent["actionType"];
  before: Pick<CornerOpsState, "status" | "soldOut">;
  after: Pick<CornerOpsState, "status" | "soldOut">;
  reasonCode: OpsReasonCode;
  memo?: string;
  actor?: string;
}): Promise<OpsActionEvent> {
  const event = await appendOpsEventStore(
    input.restaurantId,
    input.cornerId,
    input.actionType,
    input.before,
    input.after,
    input.reasonCode,
    input.memo,
    input.actor
  );
  return simulateNetwork(event, 120);
}
