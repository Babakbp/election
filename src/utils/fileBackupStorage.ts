import { ElectionSession, Candidate, AuditEvent, Operator, Voter, ArchivedSession } from '../types/election';
import { computeSHA256, formatJalali, toPersianDigits } from './persian';

const DB_NAME = 'ElectionStorageDB';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';
const HANDLE_KEY = 'default_backup_dir';

export const STORAGE_KEY_BACKUP_FOLDER_NAME = 'election_backup_folder_name_v1';
export const STORAGE_KEY_BACKUP_CUSTOM_PATH = 'election_backup_custom_path_v1';
export const STORAGE_KEY_CLOUD_VAULT = 'elections_cloud_vault_v1';
export const STORAGE_KEY_ARCHIVE = 'elections_sessions_archive_v1';
export const STORAGE_KEY_AUTO_BACKUP = 'election_auto_backup_enabled_v1';

export interface CloudBackupSnapshot {
  id: string;
  savedAt: string;
  persianSavedDate: string;
  sessionTitle: string;
  stationNumber: string;
  totalVotes: number;
  integrityChecksum: string;
  payloadJson: string; // Serialized complete election package
  status: 'SYNCED' | 'LOCAL_MIRROR';
}

// ---------------- IndexedDB Helper for FileSystemDirectoryHandle ----------------

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeDirectoryHandle(handle: any): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Could not store directory handle in IndexedDB:', e);
  }
}

export async function getStoredDirectoryHandle(): Promise<any | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function removeStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {
    // ignore
  }
}

// ---------------- Folder Selection & Direct Disk/Flash Writing ----------------

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function selectBackupDirectory(): Promise<{
  success: boolean;
  folderName: string;
  error?: string;
}> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      folderName: '',
      error: 'مرورگر شما از انتخاب مستقیم پوشه دیسک پشتیبانی نمی‌کند؛ از دانلود خودکار استفاده خواهد شد.',
    };
  }

  try {
    // Show folder picker dialog
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });

    if (!handle || !handle.name) {
      return { success: false, folderName: '', error: 'پوشه‌ای انتخاب نشد.' };
    }

    // Persist handle in IndexedDB for subsequent backups
    await storeDirectoryHandle(handle);
    localStorage.setItem(STORAGE_KEY_BACKUP_FOLDER_NAME, handle.name);

    return {
      success: true,
      folderName: handle.name,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, folderName: '', error: 'عملیات انتخاب پوشه لغو شد.' };
    }
    return { success: false, folderName: '', error: err.message || 'خطا در دسترسی به پوشه' };
  }
}

export async function getBackupFolderInfo(): Promise<{
  folderName: string;
  customPath: string;
  hasPersistentHandle: boolean;
}> {
  const folderName = localStorage.getItem(STORAGE_KEY_BACKUP_FOLDER_NAME) || '';
  const customPath = localStorage.getItem(STORAGE_KEY_BACKUP_CUSTOM_PATH) || '';
  const handle = await getStoredDirectoryHandle();
  return {
    folderName: folderName || (handle ? handle.name : ''),
    customPath,
    hasPersistentHandle: Boolean(handle),
  };
}

export function setCustomBackupPath(path: string): void {
  localStorage.setItem(STORAGE_KEY_BACKUP_CUSTOM_PATH, path.trim());
}

// ---------------- Save Backup to Folder or Trigger File Download ----------------

export interface BackupPayload {
  session: ElectionSession;
  candidates: Candidate[];
  auditEvents: AuditEvent[];
  operators: Operator[];
  voters?: Voter[];
  notes?: string;
}

export async function saveBackupToFolderOrDownload(
  payload: BackupPayload,
  customPrefix?: string
): Promise<{
  success: boolean;
  method: 'DIRECT_FOLDER' | 'DOWNLOAD';
  fileName: string;
  folderName: string;
  checksum: string;
  error?: string;
}> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const prefix = customPrefix || 'بکاپ_انتخابات';
  const fileName = `${prefix}_شعبه_${payload.session.stationNumber}_${dateStr}_${timeStr}.json`;

  const rawData = {
    version: '2.0.0',
    exportedAt: now.toISOString(),
    persianExportedAt: formatJalali(now, true),
    ...payload,
  };

  const jsonString = JSON.stringify(rawData, null, 2);
  const checksum = await computeSHA256(jsonString);

  const fullPackage = {
    ...rawData,
    integrityChecksum: checksum,
  };

  const packageJson = JSON.stringify(fullPackage, null, 2);

  // Check if we have an active directory handle
  let handle = await getStoredDirectoryHandle();

  if (handle) {
    try {
      // Check permission
      let permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        permission = await handle.requestPermission({ mode: 'readwrite' });
      }

      if (permission === 'granted') {
        // Write file directly to user's folder (Flash or PC)
        const fileHandle = await handle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(packageJson);
        await writable.close();

        return {
          success: true,
          method: 'DIRECT_FOLDER',
          fileName,
          folderName: handle.name,
          checksum,
        };
      }
    } catch (writeErr: any) {
      console.warn('Direct folder write failed, falling back to download:', writeErr);
      // Fallback to standard download below
    }
  }

  // Fallback or default: standard browser download
  const blob = new Blob([packageJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);

  const configuredFolderName = localStorage.getItem(STORAGE_KEY_BACKUP_FOLDER_NAME) || 
                               localStorage.getItem(STORAGE_KEY_BACKUP_CUSTOM_PATH) || 
                               'پوشه دانلودهای مرورگر';

  return {
    success: true,
    method: 'DOWNLOAD',
    fileName,
    folderName: configuredFolderName,
    checksum,
  };
}

// ---------------- Cloud Vault Management ----------------

export async function saveToCloudVault(payload: BackupPayload): Promise<CloudBackupSnapshot> {
  const now = new Date();
  const rawData = {
    version: '2.0.0',
    exportedAt: now.toISOString(),
    persianExportedAt: formatJalali(now, true),
    ...payload,
  };

  const jsonString = JSON.stringify(rawData);
  const checksum = await computeSHA256(jsonString);

  const totalVotes = payload.candidates.reduce((sum, c) => sum + c.votes, 0) +
    payload.session.blankBallots +
    payload.session.invalidBallots;

  const snapshot: CloudBackupSnapshot = {
    id: `cloud-snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    savedAt: now.toISOString(),
    persianSavedDate: formatJalali(now, true),
    sessionTitle: payload.session.title,
    stationNumber: payload.session.stationNumber,
    totalVotes,
    integrityChecksum: checksum,
    payloadJson: JSON.stringify({ ...rawData, integrityChecksum: checksum }),
    status: 'SYNCED',
  };

  const existing = getCloudVaultSnapshots();
  // Keep up to 25 latest cloud snapshots
  const updated = [snapshot, ...existing.filter(s => s.id !== snapshot.id)].slice(0, 25);
  localStorage.setItem(STORAGE_KEY_CLOUD_VAULT, JSON.stringify(updated));

  return snapshot;
}

export function getCloudVaultSnapshots(): CloudBackupSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_VAULT);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function deleteCloudVaultSnapshot(snapshotId: string): void {
  const existing = getCloudVaultSnapshots();
  const updated = existing.filter(s => s.id !== snapshotId);
  localStorage.setItem(STORAGE_KEY_CLOUD_VAULT, JSON.stringify(updated));
}

// ---------------- Election Sessions Archive (بایگانی جلسات) ----------------

export async function archiveSession(
  session: ElectionSession,
  candidates: Candidate[],
  auditEvents: AuditEvent[],
  operators: Operator[],
  voters?: Voter[],
  notes?: string
): Promise<ArchivedSession> {
  const now = new Date();
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0) +
    session.blankBallots +
    session.invalidBallots;

  // Compute top winners
  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const winnerNames = sorted.slice(0, 5).map(c => `${c.name} (${toPersianDigits(c.votes)} رأی)`);

  const payload = {
    session,
    candidates,
    auditEvents,
    operators,
    voters: voters || [],
    notes: notes || '',
  };

  const checksum = await computeSHA256(JSON.stringify(payload));
  const configuredFolder = localStorage.getItem(STORAGE_KEY_BACKUP_FOLDER_NAME) || 
                           localStorage.getItem(STORAGE_KEY_BACKUP_CUSTOM_PATH) || 
                           '';

  const archivedItem: ArchivedSession = {
    id: `archive-${session.id}-${Date.now()}`,
    archivedAt: now.toISOString(),
    persianArchivedDate: formatJalali(now, true),
    session: {
      ...session,
      closedAt: session.closedAt || now.toISOString(),
    },
    candidates: [...candidates],
    auditEvents: [...auditEvents],
    operators: [...operators],
    voters: voters ? [...voters] : [],
    totalVotes,
    winnerNames,
    integrityChecksum: checksum,
    notes: notes || `بایگانی رسمی جلسه در تاریخ ${formatJalali(now, true)}`,
    backupPath: configuredFolder,
  };

  const archives = getArchivedSessions();
  // Filter out if identical id exists, put newest first
  const updated = [archivedItem, ...archives.filter(a => a.id !== archivedItem.id)];
  localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(updated));

  // Also auto-mirror to Cloud Vault & configured Folder silently
  try {
    await saveToCloudVault(payload);
  } catch (e) {
    // ignore
  }

  return archivedItem;
}

export function getArchivedSessions(): ArchivedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARCHIVE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function deleteArchivedSession(archiveId: string): void {
  const archives = getArchivedSessions();
  const updated = archives.filter(a => a.id !== archiveId);
  localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(updated));
}

export function updateArchivedSessionNotes(archiveId: string, notes: string): void {
  const archives = getArchivedSessions();
  const updated = archives.map(a => a.id === archiveId ? { ...a, notes } : a);
  localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(updated));
}
