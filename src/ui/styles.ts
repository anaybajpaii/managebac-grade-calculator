export const STYLES = `
:host { all: initial; position: fixed; right: 0; bottom: 0; z-index: 2147483000; }
.root {
  --bg: #ffffff; --ink: #111111; --muted: #666666; --rule: #d6d6d6; --accent: #111111;
  --tab-bg: #111111; --tab-ink: #ffffff; --tab-muted: #bdbdbd;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
  display: flex; flex-direction: column; align-items: flex-end;
  font: 15px/1.45 var(--sans); color: var(--ink);
}
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
.tab { display: flex; align-items: center; gap: 14px; margin: 0 0 24px; padding: 12px 20px 12px 16px; background: var(--tab-bg); color: var(--tab-ink); border: 2px solid var(--tab-bg); border-right: 0; border-radius: 6px 0 0 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, .25); }
.tab .g { font: 600 38px/1 var(--sans); }
.tab .t { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; text-align: left; }
.tab .t b { font: 600 17px/1.2 var(--sans); }
.tab .t .s { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--tab-muted); }
.panel { width: 420px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); overflow-y: auto; margin: 0 16px 16px 0; background: var(--bg); color: var(--ink); border: 2px solid var(--ink); border-radius: 6px; box-shadow: 0 10px 36px rgba(0, 0, 0, .28); }
.ph { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 20px 12px; border-bottom: 1px solid var(--rule); }
.ph b { font: 600 17px var(--serif); letter-spacing: .01em; }
.link { font-size: 13px; color: var(--muted); text-decoration: underline; text-decoration-color: var(--rule); text-underline-offset: 3px; }
.hero { padding: 22px 20px 10px; display: flex; align-items: flex-end; gap: 20px; }
.big { font: 300 104px/0.8 var(--sans); letter-spacing: -0.04em; min-width: 60px; color: var(--ink); }
.meta { padding-bottom: 4px; min-width: 0; }
.meta b { display: block; font: 600 24px/1.15 var(--serif); }
.meta span { display: block; color: var(--muted); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scale { padding: 20px 20px 10px; }
.ruler { position: relative; height: 2px; background: var(--rule); margin: 0 0 34px; }
.done { position: absolute; left: 0; top: -2px; height: 6px; background: var(--accent); }
.ruler i { position: absolute; top: -6px; width: 2px; height: 14px; background: var(--muted); }
.ruler em { position: absolute; top: 14px; transform: translateX(-50%); font-style: normal; font-size: 12px; color: var(--muted); }
.gap { font: italic 14px var(--serif); color: var(--ink); }
.sec { padding: 14px 20px 12px; border-top: 1px solid var(--rule); }
.sec h3 { margin: 0 0 8px; font: 600 12px var(--sans); letter-spacing: .09em; text-transform: uppercase; color: var(--muted); }
.row { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; font-size: 15.5px; }
.row .n { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
.row .lead { flex: 1; border-bottom: 1px dotted var(--muted); transform: translateY(-4px); min-width: 10px; }
.row .w { color: var(--muted); font-size: 13px; min-width: 38px; text-align: right; }
.row .p { min-width: 84px; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }
.row.none .p { color: var(--muted); font-style: italic; font-weight: 400; }
.note { padding: 0 20px 14px; font: italic 14px var(--serif); color: var(--ink); }
.small { margin-top: 6px; font-size: 13px; color: var(--muted); }
.acts { display: flex; gap: 16px; }
.form .sec { padding: 16px 20px 14px; }
.wrows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.wrow { display: flex; align-items: center; gap: 8px; }
input, select { box-sizing: border-box; width: 100%; padding: 8px 10px; font: inherit; color: var(--ink); background: var(--bg); border: 1.5px solid var(--ink); border-radius: 4px; }
input:focus-visible, select:focus-visible, button:focus-visible { outline: 3px solid var(--muted); outline-offset: 1px; }
.wname { flex: 1; min-width: 0; }
.wnum { width: 76px; flex: none; text-align: right; }
.pc { color: var(--muted); }
.x { width: 30px; height: 30px; flex: none; font-size: 20px; line-height: 1; color: var(--muted); border: 1.5px solid var(--rule); border-radius: 4px; }
.x:hover { color: var(--ink); border-color: var(--ink); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 0; }
.adds { margin: 10px 0 0; }
.chips:empty { display: none; }
.chip { padding: 6px 12px; font-size: 13.5px; border: 1.5px solid var(--rule); border-radius: 999px; }
.chip:hover { border-color: var(--ink); }
.field { display: block; margin: 0 0 12px; }
.field span { display: block; margin: 0 0 4px; font-size: 13px; color: var(--muted); }
.check { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; cursor: pointer; }
.check input { width: 18px; height: 18px; margin: 0; accent-color: var(--ink); }
.starts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
.start { margin: 0; }
.err { min-height: 1.4em; margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--ink); }
.btns { display: flex; gap: 10px; margin: 0 0 14px; }
.btn { padding: 10px 22px; font-weight: 600; border: 2px solid var(--ink); border-radius: 4px; }
.btn.primary { background: var(--ink); color: var(--bg); }
.btn:disabled { opacity: .5; cursor: default; }
.locked .adds, .locked .chips, .locked .x { display: none; }
input:disabled { color: var(--muted); border-color: var(--rule); background: transparent; }
.xbox { margin-top: 16px; }
.xbox h4 { margin: 0 0 4px; font: 600 14px var(--sans); }
.xbox .small { margin: 0 0 10px; }
.xname { flex: 1; min-width: 0; }
.xnum { width: 76px; flex: none; text-align: right; }
.foot { padding: 10px 20px 14px; font: italic 12.5px var(--serif); color: var(--muted); border-top: 1px solid var(--rule); }
`;