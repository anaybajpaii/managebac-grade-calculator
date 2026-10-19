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
  weightsFromPage: false,
    editor: {
    pageWeights: null,
    usePageWeights: false,
    weightings: [
      { name: "Tests", weight: 70 },
      { name: "Homework", weight: 30 },
    ],
    method: "average",
    subjectName: null,
    level: null,
    timezone: 3,
    customStarts: null,
    officialStarts: [14, 28, 41, 54, 66, 78],
    subjectNames: ["MATHEMATICS ANALYSIS AND APPROACHES", "PHYSICS"],
    pageCategories: ["Tests", "Quizzes"],
  },
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
    (shadowOf(host()).querySelector(".link.hide") as HTMLElement).click();
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

  function openSettings(): ShadowRoot {
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    (shadowOf(host()).querySelector(".gear") as HTMLElement).click();
    return shadowOf(host());
  }

  function setValue(input: Element | null, value: string): void {
    (input as HTMLInputElement | HTMLSelectElement).value = value;
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("opens settings with the saved weightings and goes back", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const root = openSettings();
    const names = [...root.querySelectorAll<HTMLInputElement>(".wname")].map((i) => i.value);
    const weights = [...root.querySelectorAll<HTMLInputElement>(".wnum")].map((i) => i.value);
    expect(names).toEqual(["Tests", "Homework"]);
    expect(weights).toEqual(["70", "30"]);
    expect(root.textContent).toContain("Total 100%");
    (root.querySelector(".back") as HTMLElement).click();
    expect(root.querySelector(".big")?.textContent).toBe("6");
  });

  it("offers categories found on the page that are not weighted yet", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const root = openSettings();
    const chips = [...root.querySelectorAll(".chips .chip")].map((c) => c.textContent);
    expect(chips).toEqual(["+ Quizzes"]);
    (root.querySelector(".chips .chip") as HTMLElement).click();
    expect(root.querySelectorAll(".wrow").length).toBe(3);
    expect(root.querySelector(".chips .chip")).toBeNull();
  });

  it("updates the total as weights change", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const root = openSettings();
    setValue(root.querySelectorAll(".wnum")[0] ?? null, "50");
    expect(root.textContent).toContain("Total 80%");
  });

  it("saves what was typed and closes settings", async () => {
    const saved: unknown[] = [];
    const overlay = mountOverlay(document, undefined, { onSave: (c) => void saved.push(c) });
    overlay.update(view);
    const root = openSettings();
    setValue(root.querySelectorAll(".wnum")[0] ?? null, "60");
    setValue(root.querySelectorAll(".wnum")[1] ?? null, "40");
    setValue(root.querySelector("select:nth-of-type(1)"), "");
    (root.querySelector(".btn.primary") as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved).toEqual([
      {
        weightings: [
          { name: "Tests", weight: 60 },
          { name: "Homework", weight: 40 },
        ],
        weightSource: "custom",
        method: "average",
        subjectName: null,
        level: null,
        timezone: 3,
        customStarts: null,
      },
    ]);
    expect(root.querySelector(".form")).toBeNull();
  });

  it("shows a message instead of saving bad input", async () => {
    const saved: unknown[] = [];
    const overlay = mountOverlay(document, undefined, { onSave: (c) => void saved.push(c) });
    overlay.update(view);
    const root = openSettings();
    setValue(root.querySelectorAll(".wnum")[0] ?? null, "");
    (root.querySelector(".btn.primary") as HTMLElement).click();
    expect(root.querySelector(".err")?.textContent).toContain("Tests");
    expect(saved).toEqual([]);
    expect(root.querySelector(".form")).not.toBeNull();
  });

  it("saves own boundaries when enabled", async () => {
    const saved: { customStarts: number[] | null }[] = [];
    const overlay = mountOverlay(document, undefined, { onSave: (c) => void saved.push(c) });
    overlay.update(view);
    const root = openSettings();
    const box = root.querySelector<HTMLInputElement>('input[type="checkbox"]') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    [10, 25, 40, 55, 70, 85].forEach((v, i) => setValue(root.querySelectorAll(".snum")[i] ?? null, String(v)));
    (root.querySelector(".btn.primary") as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved[0]?.customStarts).toEqual([10, 25, 40, 55, 70, 85]);
  });

  it("needs a second click to reset a class", async () => {
    let resets = 0;
    const overlay = mountOverlay(document, undefined, { onReset: () => void resets++ });
    overlay.update(view);
    const root = openSettings();
    const button = root.querySelector(".reset") as HTMLElement;
    button.click();
    expect(resets).toBe(0);
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(resets).toBe(1);
  });

  it("keeps the form while the page updates underneath it", () => {
    const overlay = mountOverlay(document);
    overlay.update(view);
    const root = openSettings();
    setValue(root.querySelectorAll(".wnum")[0] ?? null, "55");
    overlay.update({ ...view, percent: 70 });
    expect((root.querySelectorAll(".wnum")[0] as HTMLInputElement).value).toBe("55");
  });

  const pageView: OverlayView = {
    ...view,
    weightsFromPage: true,
    editor: {
      ...view.editor,
      weightings: [
        { name: "Exam", weight: 40 },
        { name: "Essay", weight: 60 },
      ],
      pageWeights: [
        { name: "Exam", weight: 40 },
        { name: "Essay", weight: 60 },
      ],
      usePageWeights: true,
    },
  };

  it("says when weights were read from ManageBac", () => {
    const overlay = mountOverlay(document);
    overlay.update(pageView);
    (shadowOf(host()).querySelector(".tab") as HTMLElement).click();
    expect(shadowOf(host()).textContent).toContain("Weights read from ManageBac");
  });

  it("locks the weights while using the page's weights, and unlocks them to edit", () => {
    const overlay = mountOverlay(document);
    overlay.update(pageView);
    const root = openSettings();
    const box = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    const first = root.querySelector(".wname") as HTMLInputElement;
    expect(first.disabled).toBe(true);
    box.checked = false;
    box.dispatchEvent(new Event("change"));
    expect(first.disabled).toBe(false);
    expect(first.value).toBe("Exam");
  });

  it("restores the page's weights when the box is ticked again", () => {
    const overlay = mountOverlay(document);
    overlay.update({ ...pageView, editor: { ...pageView.editor, usePageWeights: false, weightings: [{ name: "Mine", weight: 100 }] } });
    const root = openSettings();
    expect((root.querySelector(".wname") as HTMLInputElement).value).toBe("Mine");
    const box = root.querySelector('input[type="checkbox"]') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    expect([...root.querySelectorAll<HTMLInputElement>(".wname")].map((i) => i.value)).toEqual(["Exam", "Essay"]);
  });

  it("saves the choice to use the page's weights", async () => {
    const saved: { weightSource: string }[] = [];
    const overlay = mountOverlay(document, undefined, { onSave: (c) => void saved.push(c) });
    overlay.update(pageView);
    const root = openSettings();
    (root.querySelector(".btn.primary") as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved[0]?.weightSource).toBe("page");
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