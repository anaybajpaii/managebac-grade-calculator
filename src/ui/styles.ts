export const STYLES = `
:host { all: initial; position: fixed; right: 0; bottom: 0; z-index: 2147483000; }
.root {
  --paper: #fbf9f3; --rule: #cfc8b6; --rule-soft: #e2dccb; --ink: #2a2620; --muted: #7b7365;
  --accent: #5b6b3a; --accent-ink: #44522a; --warn: #9a5b2c;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex; flex-direction: column; align-items: flex-end;
  font: 13.5px/1.45 var(--sans); color: var(--ink);
}
@media (prefers-color-scheme: dark) {
  .root {
    --paper: #2a2620; --rule: #4a4437; --rule-soft: #38332a; --ink: #ebe5d6; --muted: #a29a88;
    --accent: #a9b97a; --accent-ink: #c4d198; --warn: #d9a06a;
  }
}
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
.tab { display: flex; align-items: baseline; gap: 10px; margin-bottom: 28px; background: var(--paper); border: 1px solid var(--rule); border-right: 0; border-radius: 3px 0 0 3px; padding: 7px 14px 7px 12px; }
.tab .g { font: 500 22px/1 var(--sans); color: var(--accent-ink); }
.tab .t { font-size: 12.5px; color: var(--muted); max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tab .t b { color: var(--ink); font-weight: 600; }
.panel { width: 304px; max-height: calc(100vh - 16px); overflow-y: auto; background: var(--paper); border: 1px solid var(--rule); border-right: 0; border-bottom: 0; border-radius: 3px 0 0 0; }
.ph { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 14px 7px; border-bottom: 1px solid var(--rule); }
.ph b { font: 600 13.5px var(--serif); letter-spacing: .01em; }
.link { font-size: 12px; color: var(--muted); text-decoration: underline; text-decoration-color: var(--rule); text-underline-offset: 3px; }
.hero { padding: 14px 14px 6px; display: flex; align-items: flex-end; gap: 14px; }
.big { font: 300 66px/0.82 var(--sans); letter-spacing: -0.03em; color: var(--accent-ink); min-width: 38px; }
.meta { padding-bottom: 2px; min-width: 0; }
.meta b { display: block; font: 600 16px var(--serif); }
.meta span { display: block; color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scale { padding: 14px 14px 8px; }
.ruler { position: relative; height: 1px; background: var(--rule); margin: 0 0 28px; }
.done { position: absolute; left: 0; top: -1px; height: 3px; background: var(--accent); }
.ruler i { position: absolute; top: -4px; width: 1px; height: 9px; background: var(--muted); }
.ruler em { position: absolute; top: 8px; transform: translateX(-50%); font-style: normal; font-size: 10.5px; color: var(--muted); }
.gap { font: italic 12px var(--serif); color: var(--warn); }
.sec { padding: 9px 14px 8px; border-top: 1px solid var(--rule); }
.sec h3 { margin: 0 0 5px; font: 600 11px var(--sans); letter-spacing: .09em; text-transform: uppercase; color: var(--muted); }
.row { display: flex; align-items: baseline; gap: 6px; padding: 2px 0; }
.row .n { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
.row .lead { flex: 1; border-bottom: 1px dotted var(--rule); transform: translateY(-3px); min-width: 10px; }
.row .w { color: var(--muted); font-size: 12px; min-width: 32px; text-align: right; }
.row .p { min-width: 74px; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.row.none .p { color: var(--muted); font-style: italic; }
.note { padding: 0 14px 10px; font: italic 12.5px var(--serif); color: var(--warn); }
.small { margin-top: 5px; font-size: 12px; color: var(--muted); }
.foot { padding: 8px 14px 10px; font: italic 11px var(--serif); color: var(--muted); border-top: 1px solid var(--rule); }
`;