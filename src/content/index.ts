import boundariesRaw from "../../data/boundaries-m26.json";
import type { BoundariesFile } from "../engine/types";
import { scrapeClassInfo, scrapeTasks, scrapeWeights } from "../page/scrape";
import { classIdFromUrl } from "../storage/class-id";
import { loadGlobal, saveGlobal } from "../storage/global";
import { loadSettings, resetSettings, saveSettings } from "../storage/settings";
import { createChromeStore } from "../storage/store";
import type { EditorSave } from "../ui/editor-form";
import { mountOverlay, type Overlay } from "../ui/overlay";
import { buildView } from "../ui/view-model";

const TAG = "[Grade Calculator for ManageBac]";
const DOCUMENT_EVENTS = ["turbo:load", "turbo:render", "turbolinks:load"];
const WINDOW_EVENTS = ["popstate", "pageshow"];

const boundaries = boundariesRaw as unknown as BoundariesFile;
const store = createChromeStore();
let overlay: Overlay | null = null;
let timer: number | undefined;

function currentClassId(): string | null {
  return classIdFromUrl(location.href);
}

async function onSave(change: EditorSave): Promise<void> {
  const classId = currentClassId();
  if (!classId) return;
  await saveSettings(store, classId, {
    version: 1,
    weightings: change.weightings,
    method: change.method,
    weightSource: change.weightSource,
    ...(change.subjectName ? { subjectName: change.subjectName } : {}),
    ...(change.level ? { level: change.level } : {}),
    ...(change.customStarts ? { customStarts: change.customStarts } : {}),
  });
  await saveGlobal(store, { version: 1, timezone: change.timezone });
  await refresh();
}

async function onReset(): Promise<void> {
  const classId = currentClassId();
  if (!classId) return;
  await resetSettings(store, classId);
  await refresh();
}

async function refresh(): Promise<void> {
  const classId = classIdFromUrl(location.href);
  if (!classId || !location.pathname.endsWith("/core_tasks")) {
    overlay?.update(null);
    return;
  }
  const [settings, { timezone }] = await Promise.all([loadSettings(store, classId), loadGlobal(store)]);
  const info = scrapeClassInfo(document);
  const { tasks, ungraded } = scrapeTasks(document);
  const pageWeights = scrapeWeights(document);
  const view = buildView({ tasks, ungraded, info, settings, boundaries, timezone, pageWeights });
  overlay ??= mountOverlay(document, store, { onSave, onReset });
  overlay.update(view);
}

function schedule(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    refresh().catch((error) => console.error(TAG, error));
  }, 400);
}

schedule();
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
for (const name of DOCUMENT_EVENTS) document.addEventListener(name, schedule);
for (const name of WINDOW_EVENTS) window.addEventListener(name, schedule);