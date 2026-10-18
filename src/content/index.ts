import boundariesRaw from "../../data/boundaries-m26.json";
import { DEFAULT_TIMEZONE } from "../config";
import type { BoundariesFile } from "../engine/types";
import { scrapeClassInfo, scrapeTasks } from "../page/scrape";
import { classIdFromUrl } from "../storage/class-id";
import { loadSettings } from "../storage/settings";
import { createChromeStore } from "../storage/store";
import { mountOverlay, type Overlay } from "../ui/overlay";
import { buildView } from "../ui/view-model";

const TAG = "[Grade Calculator for ManageBac]";
const DOCUMENT_EVENTS = ["turbo:load", "turbo:render", "turbolinks:load"];
const WINDOW_EVENTS = ["popstate", "pageshow"];

const boundaries = boundariesRaw as unknown as BoundariesFile;
const store = createChromeStore();
let overlay: Overlay | null = null;
let timer: number | undefined;

async function refresh(): Promise<void> {
  const classId = classIdFromUrl(location.href);
  if (!classId || !location.pathname.endsWith("/core_tasks")) {
    overlay?.update(null);
    return;
  }
  const settings = await loadSettings(store, classId);
  const info = scrapeClassInfo(document);
  const { tasks, ungraded } = scrapeTasks(document);
  const view = buildView({ tasks, ungraded, info, settings, boundaries, timezone: DEFAULT_TIMEZONE });
  overlay ??= mountOverlay(document, store);
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