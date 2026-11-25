import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { AppState } from '../data/types';

type BackupFile = { app: 'kova'; version: 1; exportedAt: string; state: AppState };

/** Writes a JSON backup and opens the share sheet (save to Drive, Files, email to yourself…). */
export async function exportBackup(state: AppState): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `kova-backup-${stamp}.json`);
  if (file.exists) file.delete();
  file.create();
  const payload: BackupFile = { app: 'kova', version: 1, exportedAt: new Date().toISOString(), state };
  await file.write(JSON.stringify(payload));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Kova backup' });
}

/** Lets the user pick a backup file. Returns the state inside it, or null if they cancelled. */
export async function pickBackup(): Promise<AppState | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const text = await new File(res.assets[0].uri).text();
  let parsed: Partial<BackupFile>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Kova backup.");
  }
  if (parsed.app !== 'kova' || !parsed.state || !Array.isArray(parsed.state.cards)) throw new Error("That file isn't a Kova backup.");
  return parsed.state;
}
