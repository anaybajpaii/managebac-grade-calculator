import type { BoundsRow } from "./view-model";

type Child = Node | string;

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function pct(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

/** The grade boundaries in use, as a drop-down in the main card. */
export function renderBounds(
  doc: Document,
  rows: BoundsRow[],
  source: string,
  currentGrade: number | null,
  open: boolean,
  onToggle: (open: boolean) => void,
): HTMLElement {
  const head = el(
    doc,
    "button",
    "bhead",
    el(doc, "span", undefined, "Grade boundaries"),
    el(doc, "span", "chev", open ? "▴" : "▾"),
  );
  head.type = "button";
  head.setAttribute("aria-expanded", String(open));
  head.addEventListener("click", () => onToggle(!open));

  const section = el(doc, "div", "sec bounds", head);
  if (!open) return section;

  const list = el(doc, "div", "blist");
  for (const row of rows) {
    const range = row.grade === rows[0]?.grade ? `${pct(row.from)} and above` : `${pct(row.from)} to ${pct(row.to)}`;
    list.append(
      el(
        doc,
        "div",
        row.grade === currentGrade ? "brow now" : "brow",
        el(doc, "b", undefined, String(row.grade)),
        el(doc, "span", "lead"),
        el(doc, "span", undefined, range),
      ),
    );
  }
  section.append(list, el(doc, "div", "small", source));
  return section;
}
