import { scrapeClassInfo, scrapeTasks } from "../page/scrape";
import { classIdFromUrl } from "../storage/class-id";

const TAG = "[Grade Calculator for ManageBac]";

function main(): void {
  const classId = classIdFromUrl(location.href);
  if (!classId || !location.pathname.endsWith("/core_tasks")) return;
  const info = scrapeClassInfo(document);
  const { tasks, ungraded } = scrapeTasks(document);
  console.debug(`${TAG} class ${classId}`, info, `${tasks.length} graded, ${ungraded} ungraded`);
  console.table(tasks);
}

main();