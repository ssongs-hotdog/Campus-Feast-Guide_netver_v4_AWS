import type { CreateIncidentInput, OpsSnapshot, SavedView } from "../data/opsModels";
import {
  appendIncidentAction,
  createIncident,
  deleteView,
  getOpsSnapshot,
  saveView,
  updateAuditMemo,
} from "../data/opsStore";

function simulateNetwork<T>(data: T, latencyMs = 320): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), latencyMs);
  });
}

export async function fetchOpsSnapshot(): Promise<OpsSnapshot> {
  const snapshot = await getOpsSnapshot();
  return simulateNetwork(snapshot);
}

export async function saveAuditMemo(auditId: string, memo: string): Promise<void> {
  await updateAuditMemo(auditId, memo);
  await simulateNetwork(undefined, 180);
}

export async function createIncidentRecord(input: CreateIncidentInput): Promise<void> {
  await createIncident(input);
  await simulateNetwork(undefined, 220);
}

export async function addIncidentAction(
  incidentId: string,
  note: string,
  author: string
): Promise<void> {
  await appendIncidentAction(incidentId, note, author);
  await simulateNetwork(undefined, 180);
}

export async function saveFilterView(view: SavedView): Promise<void> {
  await saveView(view);
  await simulateNetwork(undefined, 150);
}

export async function removeFilterView(viewId: string): Promise<void> {
  await deleteView(viewId);
  await simulateNetwork(undefined, 140);
}
