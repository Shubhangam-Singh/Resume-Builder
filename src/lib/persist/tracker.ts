import { uid } from "@/lib/resume/factory";
import { getDb, KV_STORE } from "./db";

/**
 * Job application tracker — a tiny local CRM stored under `app:<id>` keys. Each
 * entry can link to the resume document (and optionally a snapshot) used to
 * apply, so users can tailor a version per job and remember which went where.
 * Local-only; nothing is uploaded.
 */

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedDate: string; // YYYY-MM-DD or ""
  notes: string;
  /** The resume document this application used (for tailoring per job). */
  docId: string;
  docName: string;
  /** Optional snapshot id capturing the exact resume version used. */
  snapshotId?: string;
  createdAt: number;
  updatedAt: number;
}

const PREFIX = "app:";
const key = (id: string) => `${PREFIX}${id}`;

export function emptyApplication(docId = "", docName = ""): JobApplication {
  const now = Date.now();
  return {
    id: uid(),
    company: "",
    role: "",
    jobUrl: "",
    status: "saved",
    appliedDate: "",
    notes: "",
    docId,
    docName,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listApplications(): Promise<JobApplication[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const keys = await db.getAllKeys(KV_STORE);
    const mine = keys.filter(
      (k): k is string => typeof k === "string" && k.startsWith(PREFIX),
    );
    const apps = (await Promise.all(
      mine.map((k) => db.get(KV_STORE, k)),
    )) as (JobApplication | undefined)[];
    return apps
      .filter((a): a is JobApplication => !!a)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveApplication(app: JobApplication): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put(KV_STORE, { ...app, updatedAt: Date.now() }, key(app.id));
  } catch {
    /* ignore */
  }
}

export async function deleteApplication(id: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.delete(KV_STORE, key(id));
  } catch {
    /* ignore */
  }
}
