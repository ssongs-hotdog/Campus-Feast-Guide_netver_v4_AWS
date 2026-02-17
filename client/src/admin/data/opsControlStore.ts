import { CORNERS } from "./mock_canonical";
import type {
  CornerOpsState,
  OpsActionEvent,
  OpsActionType,
  OpsReasonCode,
  OpsStatus,
} from "./opsControlModels";

const KEY_STATES = "hyeat_ops_control_states_v1";
const KEY_EVENTS = "hyeat_ops_control_events_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso(): string {
  return new Date().toISOString();
}

function createSeedStates(): CornerOpsState[] {
  const now = nowIso();
  return CORNERS.map((corner, index) => {
    let status: OpsStatus = "open";
    let soldOut = false;

    if (index === 1 || index === 7) status = "paused";
    if (index === 4) status = "closed";
    if (index === 2 || index === 10) soldOut = true;

    return {
      restaurantId: corner.restaurantId,
      cornerId: corner.id,
      status,
      soldOut,
      updatedAt: now,
      updatedBy: "admin@hyeat.com",
      reasonCode: status === "open" && !soldOut ? "other" : "ingredient_out",
      memo: status === "open" && !soldOut ? "초기 상태" : "초기 시드",
    };
  });
}

function ensureSeeded(): void {
  const states = readJson<CornerOpsState[]>(KEY_STATES, []);
  if (states.length > 0) return;
  writeJson(KEY_STATES, createSeedStates());
  writeJson<OpsActionEvent[]>(KEY_EVENTS, []);
}

function findState(states: CornerOpsState[], restaurantId: string, cornerId: string): CornerOpsState | null {
  return states.find((row) => row.restaurantId === restaurantId && row.cornerId === cornerId) ?? null;
}

function updateState(
  restaurantId: string,
  cornerId: string,
  updater: (prev: CornerOpsState) => CornerOpsState
): { before: CornerOpsState; after: CornerOpsState } {
  ensureSeeded();
  const states = readJson<CornerOpsState[]>(KEY_STATES, []);
  const current = findState(states, restaurantId, cornerId);
  if (!current) {
    throw new Error("대상 코너 상태를 찾을 수 없습니다.");
  }

  const nextState = updater(current);
  const next = states.map((row) =>
    row.restaurantId === restaurantId && row.cornerId === cornerId ? nextState : row
  );
  writeJson(KEY_STATES, next);
  return { before: current, after: nextState };
}

export async function getOpsStates(): Promise<CornerOpsState[]> {
  ensureSeeded();
  return readJson<CornerOpsState[]>(KEY_STATES, []);
}

export async function getOpsEvents(): Promise<OpsActionEvent[]> {
  ensureSeeded();
  return readJson<OpsActionEvent[]>(KEY_EVENTS, []);
}

export async function setCornerStatus(
  restaurantId: string,
  cornerId: string,
  status: OpsStatus,
  reasonCode: OpsReasonCode,
  memo: string | undefined,
  actor = "admin@hyeat.com"
): Promise<{ before: CornerOpsState; after: CornerOpsState }> {
  return updateState(restaurantId, cornerId, (prev) => ({
    ...prev,
    status,
    updatedAt: nowIso(),
    updatedBy: actor,
    reasonCode,
    memo,
  }));
}

export async function setCornerSoldOut(
  restaurantId: string,
  cornerId: string,
  soldOut: boolean,
  reasonCode: OpsReasonCode,
  memo: string | undefined,
  actor = "admin@hyeat.com"
): Promise<{ before: CornerOpsState; after: CornerOpsState }> {
  return updateState(restaurantId, cornerId, (prev) => ({
    ...prev,
    soldOut,
    updatedAt: nowIso(),
    updatedBy: actor,
    reasonCode,
    memo,
  }));
}

export async function appendOpsEvent(
  restaurantId: string,
  cornerId: string,
  actionType: OpsActionType,
  before: Pick<CornerOpsState, "status" | "soldOut">,
  after: Pick<CornerOpsState, "status" | "soldOut">,
  reasonCode: OpsReasonCode,
  memo: string | undefined,
  actor = "admin@hyeat.com"
): Promise<OpsActionEvent> {
  ensureSeeded();
  const events = readJson<OpsActionEvent[]>(KEY_EVENTS, []);
  const event: OpsActionEvent = {
    id: `OPS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ts: nowIso(),
    restaurantId,
    cornerId,
    actionType,
    before,
    after,
    reasonCode,
    memo,
    scope: "today",
    actor,
  };
  writeJson(KEY_EVENTS, [event, ...events].slice(0, 1000));
  return event;
}
