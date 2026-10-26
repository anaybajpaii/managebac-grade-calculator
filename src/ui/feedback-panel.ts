import type { OverlayView } from "./view-model";

export interface FeedbackPayload {
  message: string;
  email: string;
  diagnostics: string;
}

export const MAX_FEEDBACK = 2000;

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

export function diagnosticsText(view: OverlayView): string {
  const e = view.editor;
  return [
    `class: ${view.title ?? "unknown"}`,
    `matched subject: ${view.matchedSubject ?? "none"}`,
    `level: ${view.levelUsed ?? "unknown"}`,
    `timezone: ${e.timezone}`,
    `tasks with a score: ${view.gradedCount}`,
    `tasks without a score: ${view.ungraded}`,
    `categories: ${view.rows.map((r) => `${r.name} (${r.weight}%)`).join(", ") || "none"}`,
    `not weighted: ${view.unassigned.join(", ") || "none"}`,
    `weights from page: ${view.weightsFromPage}`,
    `counting: ${e.method}`,
    `own boundaries: ${e.customStarts !== null}`,
  ].join("\n");
}

export function renderFeedback(
  doc: Document,
  view: OverlayView,
  onSend: (payload: FeedbackPayload) => Promise<void>,
  onDone: () => void,
): HTMLElement {
  const message = el(doc, "textarea", "fbtext");
  message.rows = 5;
  message.maxLength = MAX_FEEDBACK;
  message.placeholder = "What went wrong, or what would make this better?";
  message.setAttribute("aria-label", "Your feedback");

  const email = el(doc, "input");
  email.type = "email";
  email.placeholder = "Email (optional, only if you want a reply)";
  email.setAttribute("aria-label", "Your email, optional");

  const includeDiag = el(doc, "input");
  includeDiag.type = "checkbox";
  includeDiag.checked = true;
  const diag = diagnosticsText(view);

  const status = el(doc, "div", "err");
  status.setAttribute("role", "status");
  const send = el(doc, "button", "btn primary", "Send");
  send.type = "button";
  const cancel = el(doc, "button", "btn", "Cancel");
  cancel.type = "button";
  cancel.addEventListener("click", onDone);

  send.addEventListener("click", () => {
    const text = message.value.trim();
    if (text.length < 5) {
      status.textContent = "Write a little more first.";
      return;
    }
    const address = email.value.trim();
    if (address !== "" && !/^\S+@\S+\.\S+$/.test(address)) {
      status.textContent = "That email does not look right.";
      return;
    }
    send.disabled = true;
    status.textContent = "Sending...";
    onSend({ message: text, email: address, diagnostics: includeDiag.checked ? diag : "" }).then(
      () => {
        message.value = "";
        status.textContent = "Sent. Thank you.";
        send.textContent = "Sent";
      },
      () => {
        send.disabled = false;
        status.textContent = "Could not send. Check your connection and try again.";
      },
    );
  });

  const details = el(doc, "pre", "fbdiag", diag);
  const diagBox = el(doc, "div", "fbbox", el(doc, "label", "check", includeDiag, el(doc, "span", undefined, "Include setup details")), details);

  const back = el(doc, "button", "link back", "back");
  back.type = "button";
  back.addEventListener("click", onDone);

  const panel = el(
    doc,
    "div",
    "panel",
    el(doc, "div", "ph", el(doc, "b", undefined, "Feedback"), el(doc, "span", "acts", back)),
    el(
      doc,
      "div",
      "sec form",
      el(doc, "div", "small", "Report a wrong grade, a bug, or an idea. This is sent to the developer. Do not include passwords or personal details."),
      message,
      el(doc, "div", "fbgap"),
      email,
      diagBox,
      status,
      el(doc, "div", "btns", send, cancel),
    ),
  );
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Grade Calculator feedback");
  for (const type of ["keydown", "keyup", "keypress"]) panel.addEventListener(type, (event) => event.stopPropagation());
  return panel;
}
