// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parsePoints, scrapeClassInfo, scrapeTasks, scrapeWeights } from "./scrape";

function card(opts: { title: string; labels: string[]; points?: string; comment?: boolean }): string {
  const labels = opts.labels.map((l) => `<div class="label">${l}</div>`).join("");
  const score =
    opts.points === undefined
      ? ""
      : `<div class="assessment task-score score-mobile-collapsible assessment-ce">
           <div class="hstack flex-center p-3">
             <div class="cell labels-set">
               <span class="grade grade-success">5</span>
               <div class="points">${opts.points}</div>
             </div>
           </div>
         </div>`;
  const comment = opts.comment
    ? `<div class="assessment-comments"><div class="h6 mb-2">Comment</div><p>Some feedback text</p></div>`
    : "";
  return `
    <div class="fusion-card-item short-assignment section hstack flex-wrap">
      <div class="hstack gap-3 me-auto flex-1">
        <div class="date-badge past-due"><div class="month">Oct</div><div class="day">12</div></div>
        <div class="flex-1">
          <div class="h5 title"><a href="/student/classes/1/core_tasks/2">${opts.title}</a></div>
          <div class="label-and-due">
            <div class="labels-set hstack gap-2 flex-wrap">
              ${labels}
              <span class="badge color-box-gray"><span class="badge-label">Pending</span></span>
            </div>
          </div>
        </div>
      </div>
      ${score}
      ${comment}
    </div>`;
}

const PAGE = `
  <section class="f-hero" id="layout-hero">
    <header class="f-title f-hero__body">
      <h1 class="f-hero__title">  Mathematics: Analysis and approaches
        HL  </h1>
      <div class="f-title__description f-hero__description">
        <span class="badge color-box-blue"><span class="badge-label"> HL </span></span>
      </div>
    </header>
  </section>
  <div class="tasks-list-container">
    <header class="f-title"><h3>Completed</h3></header>
    ${card({ title: "Test on Calculus", labels: ["Summative", "Tests"], points: "18 / 20 pts", comment: true })}
    ${card({ title: "Diagnostic Test", labels: ["Formative", "Assignment"], points: "7.5 / 10 pts" })}
    ${card({ title: "Paper 1 mock", labels: ["Summative", "Papers"], points: "52,5 / 80 pts" })}
    ${card({ title: "Untyped task", labels: ["Homework"], points: "9/10" })}
    ${card({ title: "No labels at all", labels: [], points: "3 / 4 pts" })}
    ${card({ title: "Upcoming quiz", labels: ["Summative", "Tests"] })}
    ${card({ title: "Criteria task", labels: ["Summative", "IA"], points: "—" })}
    ${card({ title: "Zero max", labels: ["Summative", "Tests"], points: "0 / 0 pts" })}
  </div>`;

describe("parsePoints", () => {
  it("parses common formats", () => {
    expect(parsePoints("18 / 20 pts")).toEqual({ score: 18, max: 20 });
    expect(parsePoints("  7.5/10  ")).toEqual({ score: 7.5, max: 10 });
    expect(parsePoints("52,5 / 80 points")).toEqual({ score: 52.5, max: 80 });
    expect(parsePoints("0 / 10 pts")).toEqual({ score: 0, max: 10 });
  });

  it("rejects anything that is not a score", () => {
    expect(parsePoints("")).toBeNull();
    expect(parsePoints("—")).toBeNull();
    expect(parsePoints("N/A")).toBeNull();
    expect(parsePoints("5")).toBeNull();
    expect(parsePoints("5 / 0 pts")).toBeNull();
    expect(parsePoints("a / b pts")).toBeNull();
  });
});

describe("scrapeTasks", () => {
  document.body.innerHTML = PAGE;
  const { tasks, ungraded } = scrapeTasks(document);

  it("reads graded tasks in page order", () => {
    expect(tasks.map((t) => t.title)).toEqual([
      "Test on Calculus",
      "Diagnostic Test",
      "Paper 1 mock",
      "Untyped task",
      "No labels at all",
    ]);
  });

  it("reads scores and maxima", () => {
    expect(tasks.map((t) => [t.score, t.max])).toEqual([
      [18, 20],
      [7.5, 10],
      [52.5, 80],
      [9, 10],
      [3, 4],
    ]);
  });

  it("splits type from category", () => {
    expect(tasks[0]).toMatchObject({ type: "Summative", category: "Tests", labels: ["Summative", "Tests"] });
    expect(tasks[1]).toMatchObject({ type: "Formative", category: "Assignment" });
    expect(tasks[3]).toMatchObject({ type: null, category: "Homework" });
  });

  it("falls back to Uncategorised when there is no category label", () => {
    expect(tasks[4]).toMatchObject({ type: null, category: "Uncategorised", labels: [] });
  });

  it("does not treat the status badge as a label", () => {
    expect(tasks.every((t) => !t.labels.includes("Pending"))).toBe(true);
  });

  it("counts tasks without a usable score as ungraded", () => {
    expect(ungraded).toBe(3);
  });

  it("returns nothing for a page with no task cards", () => {
    document.body.innerHTML = "<main><h2>All Tasks</h2></main>";
    expect(scrapeTasks(document)).toEqual({ tasks: [], ungraded: 0 });
    document.body.innerHTML = PAGE;
  });
});

describe("scrapeClassInfo", () => {
  it("reads the class title and level", () => {
    document.body.innerHTML = PAGE;
    expect(scrapeClassInfo(document)).toEqual({
      title: "Mathematics: Analysis and approaches HL",
      level: "HL",
    });
  });

  it("gives null level and empty title when the header is missing", () => {
    document.body.innerHTML = "<main></main>";
    expect(scrapeClassInfo(document)).toEqual({ title: "", level: null });
  });

  it("ignores badges that are not a level", () => {
    document.body.innerHTML = `<section class="f-hero"><span class="badge-label">Core</span><span class="badge-label">sl</span></section>`;
    expect(scrapeClassInfo(document).level).toBe("SL");
  });
});

describe("task categories on real ManageBac labels", () => {
  it("keeps a category that has the same name as the type", () => {
    document.body.innerHTML = [
      card({ title: "Baseline", labels: ["Formative", "Formative"], points: "14 / 20 pts" }),
      card({ title: "IO", labels: ["Summative", "Summative - Exam -Term End"], points: "26 / 40 pts" }),
      card({ title: "Paper 2", labels: ["Summative", "Summative 1"], points: "12 / 20 pts" }),
      card({ title: "Essay", labels: ["Classwork", "Homework"], points: "5 / 10 pts" }),
    ]
      .map((c) => `<div class="tasks-list-container">${c}</div>`)
      .join("");
    const { tasks } = scrapeTasks(document);
    expect(tasks.map((t) => [t.type, t.category])).toEqual([
      ["Formative", "Formative"],
      ["Summative", "Summative - Exam -Term End"],
      ["Summative", "Summative 1"],
      [null, "Homework"],
    ]);
  });
});

describe("scrapeWeights", () => {
  const expected = [
    { name: "Semister Exam", weight: 40 },
    { name: "Assignment", weight: 10 },
    { name: "Tests", weight: 40 },
    { name: "Project or investigation", weight: 10 },
    { name: "other1", weight: 0 },
    { name: "other2", weight: 0 },
  ];

  const names = expected.map((e) => e.name);
  const pcts = expected.map((e) => `${e.weight}%`);

  it("reads a table layout", () => {
    const rows = expected
      .map((e) => `<tr><td><span class="label">${e.name}</span></td><td class="text-end">${e.weight}%</td></tr>`)
      .join("");
    document.body.innerHTML = `<aside><h5>Task Categories</h5><table><thead><tr><th>Category</th><th>Weight</th></tr></thead><tbody>${rows}</tbody></table></aside><p>Unrelated 50%</p>`;
    expect(scrapeWeights(document)).toEqual(expected);
  });

  it("reads a div-row layout", () => {
    const rows = expected
      .map((e) => `<div class="row"><div class="cat"><span>${e.name}</span></div><div>${e.weight}%</div></div>`)
      .join("");
    document.body.innerHTML = `<section><div class="hdr"><span>Task Categories</span><button>^</button></div><div class="body"><div class="row"><div>Category</div><div>Weight</div></div>${rows}</div></section>`;
    expect(scrapeWeights(document)).toEqual(expected);
  });

  it("reads a flat layout with no row wrappers", () => {
    const cells = names.map((n, i) => `<span>${n}</span><span>${pcts[i]}</span>`).join("");
    document.body.innerHTML = `<div><h4>Task Categories</h4><div class="grid"><span>Category</span><span>Weight</span>${cells}</div></div>`;
    expect(scrapeWeights(document)).toEqual(expected);
  });

  it("still reads it when the box is collapsed with CSS", () => {
    const rows = expected.map((e) => `<tr><td>${e.name}</td><td>${e.weight}%</td></tr>`).join("");
    document.body.innerHTML = `<div><h5>Task Categories</h5><div style="display:none"><table>${rows}</table></div></div>`;
    expect(scrapeWeights(document)).toEqual(expected);
  });

  it("handles decimal weights", () => {
    document.body.innerHTML = `<div><h5>Task Categories</h5><table><tr><td>Exam</td><td>12.5%</td></tr><tr><td>Quiz</td><td>87,5 %</td></tr></table></div>`;
    expect(scrapeWeights(document)).toEqual([
      { name: "Exam", weight: 12.5 },
      { name: "Quiz", weight: 87.5 },
    ]);
  });

  it("ignores duplicate names", () => {
    document.body.innerHTML = `<div><h5>Task Categories</h5><table><tr><td>Exam</td><td>50%</td></tr><tr><td>exam</td><td>50%</td></tr></table></div>`;
    expect(scrapeWeights(document)).toEqual([{ name: "Exam", weight: 50 }]);
  });

  it("returns null when the page has no such box", () => {
    document.body.innerHTML = `<div><h5>Something else</h5><table><tr><td>Exam</td><td>50%</td></tr></table></div>`;
    expect(scrapeWeights(document)).toBeNull();
    document.body.innerHTML = `<div><h5>Task Categories</h5><p>Nothing here</p></div>`;
    expect(scrapeWeights(document)).toBeNull();
  });
});
