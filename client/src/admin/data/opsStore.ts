import {
  createMockAuditEvents,
  createMockHealthSignals,
  createMockIncidents,
} from "./opsMock";
import type {
  AuditEvent,
  CreateIncidentInput,
  Incident,
  IncidentAction,
  OpsSnapshot,
  SavedView,
} from "./opsModels";

const KEY_AUDIT = "hyeat_ops_audit_events_v1";
const KEY_HEALTH = "hyeat_ops_health_signals_v1";
const KEY_INCIDENT = "hyeat_ops_incidents_v1";
const KEY_SAVED_VIEW = "hyeat_ops_saved_views_v1";

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

function ensureSeeded(): void {
  const existingAudit = readJson<AuditEvent[]>(KEY_AUDIT, []);
  if (existingAudit.length > 0) return;

  const auditEvents = createMockAuditEvents();
  const healthSignals = createMockHealthSignals();
  const incidents = createMockIncidents(auditEvents);

  writeJson(KEY_AUDIT, auditEvents);
  writeJson(KEY_HEALTH, healthSignals);
  writeJson(KEY_INCIDENT, incidents);
  writeJson(KEY_SAVED_VIEW, []);
}

export async function getOpsSnapshot(): Promise<OpsSnapshot> {
  ensureSeeded();
  return {
    auditEvents: readJson<AuditEvent[]>(KEY_AUDIT, []),
    healthSignals: readJson(KEY_HEALTH, []),
    incidents: readJson<Incident[]>(KEY_INCIDENT, []),
    savedViews: readJson<SavedView[]>(KEY_SAVED_VIEW, []),
  };
}

export async function updateAuditMemo(auditId: string, memo: string): Promise<void> {
  const rows = readJson<AuditEvent[]>(KEY_AUDIT, []);
  const next = rows.map((row) => (row.id === auditId ? { ...row, memo } : row));
  writeJson(KEY_AUDIT, next);
}

export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  ensureSeeded();
  const rows = readJson<AuditEvent[]>(KEY_AUDIT, []);
  const next = [event, ...rows]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 500);
  writeJson(KEY_AUDIT, next);
}

export async function appendIncidentAction(
  incidentId: string,
  note: string,
  author: string
): Promise<void> {
  const incidents = readJson<Incident[]>(KEY_INCIDENT, []);
  const now = new Date().toISOString();

  const next = incidents.map((incident) => {
    if (incident.id !== incidentId) return incident;
    const newAction: IncidentAction = {
      id: `ACT-${Date.now()}`,
      author,
      createdAt: now,
      note,
    };
    return { ...incident, actions: [newAction, ...incident.actions] };
  });

  writeJson(KEY_INCIDENT, next);
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const incidents = readJson<Incident[]>(KEY_INCIDENT, []);
  const id = `INC-${Date.now().toString().slice(-6)}`;

  const newIncident: Incident = {
    id,
    status: "ongoing",
    severity: input.severity,
    startedAt: new Date().toISOString(),
    impactScope: input.impactScope,
    userImpact: input.userImpact,
    summary: input.summary,
    owner: input.owner,
    linkedEventIds: [],
    actions: [],
    preventionChecklist: [],
  };

  writeJson(KEY_INCIDENT, [newIncident, ...incidents]);
  return newIncident;
}

export async function saveView(savedView: SavedView): Promise<void> {
  const views = readJson<SavedView[]>(KEY_SAVED_VIEW, []);
  const next = [savedView, ...views].slice(0, 15);
  writeJson(KEY_SAVED_VIEW, next);
}

export async function deleteView(viewId: string): Promise<void> {
  const views = readJson<SavedView[]>(KEY_SAVED_VIEW, []);
  writeJson(
    KEY_SAVED_VIEW,
    views.filter((view) => view.id !== viewId)
  );
}
