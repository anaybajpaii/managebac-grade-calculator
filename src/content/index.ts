import boundariesRaw from "../../data/boundaries-m26.json";
import { DEFAULT_TIMEZONE } from "../config";
import type { BoundariesFile } from "../engine/types";
import { scrapeClassInfo, scrapeTasks } from "../page/scrape";
import { classIdFromUrl } from "../storage/class-id";
import { loadSettings } from "../storage/settings";
import { createChromeStore } from "../storage/store";
import { mountOverlay, type Overlay } from "../ui/overlay";
import { buildView } from "../ui/view-model";

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
  timer = window.setTimeout(() => void refresh(), 400);
}

void refresh();
new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });