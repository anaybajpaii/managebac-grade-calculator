// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryStore } from "../storage/store";
import { mountOverlay } from "./overlay";
import type { OverlayView } from "./view-model";

const view: OverlayView = {
  title: "Physics",
  detail: "HL · Timezone 3",
  boundariesLabel: "IB May 2026 boundaries",
  percent: 68.4,
  grade: 6,
  next: { grade: 7, needed: 4.6 },
  ticks: [
    { grade: 2, at: 14 },
    { grade: 7, at: 72 },
  ],
  rows: [
    { name: "Tests", weight: 70, percent: 64, taskCount: 3 },
    { name: "Homework", weight: 30, percent: null, taskCount: 0 },
  ],
  gradedCount: 3,
  ungraded: 2,
  unassigned: ["Quizzes"],
  note: null,
};

function shadowOf(host: Element): ShadowRoot {
  return host.shadowRoot as ShadowRoot;
}

function host(): Element {
  return document.querySelector("[data-grade-calculator]") as Element;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("overlay", () => {
  it("shows a collapsed tab with the grade and percentage", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const tab = shadowOf(host()).querySelector(".tab") as HTMLElement;
    expect(tab.textContent).toContain("6");
    expect(tab.textContent).toContain("68.4%");
    expect(shadowOf(host()).querySelector(".panel")).toBeNull();
  });

  it("opens into the panel and hides again", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    const panel = shadowOf(host()).querySelector(".panel") as HTMLElement;
    expect(panel.textContent).toContain("68.4% weighted");
    expect(panel.textContent).toContain("HL · Timezone 3");
    expect(panel.textContent).toContain("IB May 2026 boundaries");
    expect(panel.textContent).toContain("4.6 points short of a 7");
    expect(panel.textContent).toContain("Tests");
    expect(panel.textContent).toContain("no grades");
    expect(panel.textContent).toContain("Not weighted yet: Quizzes");
    expect(panel.textContent).toContain("2 tasks not counted");
    (shadowOf(host()).querySelector(".link") as HTMLElement).click();
    expect(shadowOf(host()).querySelector(".panel")).toBeNull();
    expect(shadowOf(host()).querySelector(".tab")).not.toBeNull();
  });

  it("draws one tick label per boundary", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    const labels = [...shadowOf(host()).querySelectorAll(".ruler em")].map((e) => e.textContent);
    expect(labels).toEqual(["2", "7"]);
  });

  it("treats text from the page as text, not markup", () => {
    const overlay = mountOverlay(document);
    overlay.update({
      ...view,
      title: "<img src=x onerror=alert(1)>",
      rows: [{ name: "<b>Tests</b>", weight: 100, percent: 50, taskCount: 1 }],
      unassigned: [],
    });
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    expect(shadowOf(host()).querySelector("img")).toBeNull();
    expect(shadowOf(host()).querySelector(".row b")).toBeNull();
    expect(shadowOf(host()).querySelector(".row .n")?.textContent).toBe("<b>Tests</b>");
  });

  it("shows a dash when there is no grade, and the note", () => {
    const overlay = mountOverlay(document);
    overlay.update({ ...view, grade: null, percent: null, next: null, ticks: [], note: "No graded tasks on this page yet." });
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    expect(shadowOf(host()).querySelector(".big")?.textContent).toBe("–");
    expect(shadowOf(host()).querySelector(".note")?.textContent).toBe("No graded tasks on this page yet.");
    expect(shadowOf(host()).querySelector(".ruler")).toBeNull();
  });

  it("hides when given null and shows again with a view", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    overlay.update(null);
    expect((host() as HTMLElement).style.display).toBe("none");
    overlay.update(view);
    expect((host() as HTMLElement).style.display).toBe("");
  });

  it("does not redraw for an identical view", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const tab = shadowOf(host()).querySelector(".tab");
    overlay.update({ ...view });
    expect(shadowOf(host()).querySelector(".tab")).toBe(tab);
  });

  it("remembers whether the panel was open", async () => {
    const store = createMemoryStore();
    const first = mountOverlay(document, store);
    first.update(view);
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    await Promise.resolve();
    first.destroy();
    const second = mountOverlay(document, store);
    second.update(view);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(shadowOf(host()).querySelector(".panel")).not.toBeNull();
  });

  it("re-attaches itself when the page replaces the body", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const newBody = document.createElement("body");
    document.documentElement.replaceChild(newBody, document.body);
    expect(document.querySelector("[data-grade-calculator]")).toBeNull();
    overlay.update({ ...view });
    expect(document.querySelector("[data-grade-calculator]")).not.toBeNull();
    expect(shadowOf(host()).querySelector(".tab")).not.toBeNull();
  });

  it("shows the title under the percentage on the tab", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    expect(shadowOf(host()).querySelector(".tab .t b")?.textContent).toBe("68.4%");
    expect(shadowOf(host()).querySelector(".tab .t .s")?.textContent).toBe("Physics");
  });

  it("removes itself on destroy", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    overlay.destroy();
    expect(document.querySelector("[data-grade-calculator]")).toBeNull();
  });
});