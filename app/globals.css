:root {
  --ink: #0f1720;
  --steel: #4a5a68;
  --steel-light: #8a97a3;
  --accent: #c5730a;
  --line: #e2e7eb;
  --panel: #ffffff;
  --bg: #eef1f4;
  --ok: #2f7a4f;
  --ok-bg: #e7f4ec;
  --low: #8a6d1f;
  --low-bg: #fbf3de;
  --zero: #9aa5af;
  --zero-bg: #f1f3f5;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
}

.wrap { max-width: 1180px; margin: 0 auto; padding: 28px 20px 60px; }

header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 3px solid var(--ink);
  padding-bottom: 14px; margin-bottom: 22px; flex-wrap: wrap; gap: 10px;
}
header .brand { display: flex; align-items: center; gap: 16px; }
header .brand .logo { height: 34px; width: auto; display: block; }

.panel {
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 18px 20px; margin-bottom: 18px;
}

.btn {
  border: none; border-radius: 7px; padding: 9px 16px; font-size: 13px;
  font-weight: 600; cursor: pointer; background: var(--ink); color: #fff;
}
.btn:hover { background: var(--steel); }
.btn.accent { background: var(--accent); }

input[type="email"], input[type="password"], input[type="text"], select {
  border: 1px solid var(--line); border-radius: 7px; padding: 9px 12px;
  font-size: 14px; width: 100%; font-family: var(--sans); background: #fff;
}

label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--steel); display: block; margin-bottom: 6px; }

.error { color: #b3401f; font-size: 13px; margin-top: 8px; }
.ok-msg { color: var(--ok); font-size: 13px; margin-top: 8px; }

/* ---- tabel met vaste (sticky) kolomkoppen ---- */
.tablewrap { padding: 0; overflow: auto; max-height: 70vh; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th {
  position: sticky; top: 0; z-index: 2;
  background: var(--ink); color: #fff; text-align: left; padding: 8px 10px;
  font-size: 11px; text-transform: uppercase; white-space: nowrap;
  box-shadow: 0 1px 0 rgba(0,0,0,.15);
}
tbody td { padding: 8px 10px; border-bottom: 1px solid var(--line); }
tbody tr:hover { background: #f5f8fa; }

.flag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.flag-ok { background: var(--ok-bg); color: var(--ok); }
.flag-low { background: var(--low-bg); color: var(--low); }
.flag-zero { background: var(--zero-bg); color: var(--zero); }

.login-box {
  max-width: 380px; margin: 80px auto; background: var(--panel);
  border: 1px solid var(--line); border-radius: 12px; padding: 32px;
}
