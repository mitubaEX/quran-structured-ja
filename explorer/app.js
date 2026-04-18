// クルアーン日本語リーダー — app.js
// Vanilla JS, no build step. Reads window.quranStructuredJaData.

const data = window.quranStructuredJaData;
if (!data) throw new Error("quranStructuredJaData is not loaded.");

const chapters = data.chapters;
const chapterMap = new Map(chapters.map(c => [c.surah, c]));
const index = data.included_surahs;

const state = {
  view: "reading",        // reading | index | search | parallel
  surah: chapters[0]?.surah ?? 1,
  theme: "light",
  search: "",
  searchTheme: "",
  scrollToAyah: null,
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style" && typeof v === "object") {
      Object.assign(el.style, v);
    } else if (k.startsWith("on")) {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "className") {
      el.className = v;
    } else if (k === "dir" || k === "type" || k === "placeholder" || k === "autocomplete") {
      el.setAttribute(k, v);
    } else if (k === "htmlContent") {
      el.innerHTML = v;
    } else {
      el.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      el.appendChild(document.createTextNode(String(child)));
    } else if (Array.isArray(child)) {
      child.forEach(c => c && el.appendChild(c));
    } else {
      el.appendChild(child);
    }
  }
  return el;
};

function esc(s) { return String(s); }

// ───────── Render ─────────
function render() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderShell());
}

function renderShell() {
  const shell = h("div", { className: "app-shell" });
  shell.appendChild(renderStanceBanner());
  shell.appendChild(renderTopBar());

  switch (state.view) {
    case "reading":  shell.appendChild(renderReadingView()); break;
    case "index":    shell.appendChild(renderIndexView()); break;
    case "search":   shell.appendChild(renderSearchView()); break;
    case "parallel": shell.appendChild(renderParallelView()); break;
  }
  return shell;
}

// ───────── Stance Banner ─────────
function renderStanceBanner() {
  return h("div", { className: "stance-banner" },
    h("span", { className: "notice-label" }, "NOTICE"),
    "このデータは理解支援のための整理情報です。礼拝・朗誦・正式引用には採用する底本や訳を別途ご確認ください。"
  );
}

// ───────── Top Bar ─────────
function renderTopBar() {
  const chapter = chapterMap.get(state.surah);
  let contextText = "";
  if (state.view === "reading") contextText = `第${chapter.surah}章 ${chapter.chapter_name_ja} · ${chapter.chapter_name_en}`;
  else if (state.view === "index") contextText = "目次 · Index of Chapters";
  else if (state.view === "search") contextText = "検索 · Search";
  else if (state.view === "parallel") contextText = "対訳モード · Parallel view";

  const navItems = [
    { key: "reading", label: "読解" },
    { key: "parallel", label: "対訳" },
    { key: "index", label: "目次" },
    { key: "search", label: "検索" },
  ];

  return h("div", { className: "top-bar" },
    h("div", { className: "top-bar-left" },
      h("span", { className: "top-bar-title" }, "クルアーン日本語リーダー"),
      h("span", { className: "top-bar-subtitle-en" }, "Qur'ān · Structured · JA"),
      h("span", { className: "top-bar-context" }, contextText)
    ),
    h("div", { className: "top-bar-right" },
      navItems.map(n =>
        h("button", {
          className: "nav-link" + (state.view === n.key ? " active" : ""),
          onClick: () => { state.view = n.key; render(); }
        }, n.label)
      ),
      h("button", {
        className: "theme-toggle",
        onClick: () => { state.theme = state.theme === "light" ? "dark" : "light"; render(); }
      }, state.theme === "light" ? "☽ Dark" : "☀ Light")
    )
  );
}

// ───────── Reading View ─────────
function renderReadingView() {
  const chapter = chapterMap.get(state.surah);
  const main = h("div", { className: "main-content" });
  main.appendChild(renderLeftRail(chapter));
  main.appendChild(renderCenterColumn(chapter));
  main.appendChild(renderRightMargin(chapter));
  return main;
}

function renderLeftRail(chapter) {
  const includedCount = index.filter(c => c.ayah_count_included > 0).length;
  const rail = h("div", { className: "left-rail" });

  // Header
  rail.appendChild(h("div", { className: "left-rail-header" },
    h("span", { className: "small-cap" }, "章 Chapters"),
    h("div", { className: "left-rail-stats" }, `${chapters.length}章中 ${includedCount}章を収録`)
  ));

  // Chapter list
  for (const c of index) {
    const active = c.surah === state.surah;
    const hasData = chapterMap.has(c.surah);
    const partial = c.ayah_count_included > 0 && c.ayah_count_included < c.ayah_count_total;
    const full = c.ayah_count_included === c.ayah_count_total;
    const empty = c.ayah_count_included === 0;

    let countText = "—";
    let countClass = "chapter-item-count";
    if (full) { countText = `${c.ayah_count_total}節`; }
    else if (partial) { countText = `${c.ayah_count_included}/${c.ayah_count_total}`; countClass += " partial"; }

    const item = h("div", {
      className: "chapter-item" + (active ? " active" : "") + (empty ? " empty" : ""),
      onClick: () => {
        if (hasData) { state.surah = c.surah; render(); }
      }
    },
      h("div", { className: "chapter-item-top" },
        h("div", { className: "chapter-item-left" },
          h("span", { className: "chapter-item-num" }, String(c.surah)),
          h("span", { className: "chapter-item-name" + (active ? " active-name" : "") }, c.chapter_name_ja)
        ),
        h("span", { className: "chapter-item-ar", dir: "rtl" }, c.chapter_name_ar)
      ),
      h("div", { className: "chapter-item-bottom" },
        h("span", { className: "chapter-item-en" }, c.chapter_name_en.toUpperCase()),
        h("span", { className: countClass }, countText)
      )
    );
    rail.appendChild(item);
  }

  // Divider + ayah jump
  rail.appendChild(h("div", { className: "left-rail-divider" }));
  const jumpSection = h("div", { className: "ayah-jump-section" });
  jumpSection.appendChild(h("span", { className: "small-cap" }, "節に移動"));
  const grid = h("div", { className: "ayah-jump-grid" });
  for (const a of chapter.ayahs) {
    grid.appendChild(h("button", {
      className: "ayah-jump-btn",
      onClick: () => {
        const target = document.getElementById(`ayah-${a.ayah}`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, String(a.ayah)));
  }
  jumpSection.appendChild(grid);
  rail.appendChild(jumpSection);

  return rail;
}

function renderCenterColumn(chapter) {
  const col = h("div", { className: "center-column" });

  // Chapter header
  const hdr = h("div", { className: "chapter-header" },
    h("div", { className: "chapter-header-meta" },
      h("span", { className: "small-cap" }, `Surah ${chapter.surah} · 全 ${chapter.ayah_count_total} 節`),
      h("span", { className: "small-cap" }, chapter.approximate_theme)
    ),
    h("div", { className: "chapter-header-title-row" },
      h("h1", {}, chapter.chapter_name_ja),
      h("span", { className: "chapter-header-latin" }, chapter.chapter_name_en),
      h("span", { className: "chapter-header-ar", dir: "rtl" }, chapter.chapter_name_ar)
    ),
    h("p", { className: "chapter-header-summary" }, chapter.summary_ja)
  );
  col.appendChild(hdr);

  // Ayah entries
  for (const ayah of chapter.ayahs) {
    col.appendChild(renderAyahEntry(ayah, chapter.surah));
  }

  return col;
}

function renderAyahEntry(ayah, surah) {
  const entry = h("div", { className: "ayah-entry", id: `ayah-${ayah.ayah}` });

  // Header
  entry.appendChild(h("div", { className: "ayah-entry-header" },
    h("div", { className: "ayah-entry-header-left" },
      h("span", { className: "small-cap" }, `第 ${ayah.ayah} 節 · Ayah ${ayah.ayah}`),
      h("span", { className: "ayah-entry-romanized" }, ayah.romanized)
    ),
    h("span", { className: "ayah-entry-ref" }, `§${surah}:${ayah.ayah}`)
  ));

  // Arabic
  entry.appendChild(h("div", { className: "ayah-arabic", dir: "rtl" }, ayah.arabic));

  // Dotted rule
  entry.appendChild(h("div", { className: "dotted-rule", style: { marginBottom: "22px" } }));

  // Body grid
  const body = h("div", { className: "ayah-body" });

  // Literal
  body.appendChild(h("span", { className: "small-cap" }, "逐語"));
  body.appendChild(h("div", { className: "ayah-literal" }, ayah.literal_ja));

  // Modern
  body.appendChild(h("span", { className: "small-cap" }, "現代日本語"));
  body.appendChild(h("div", { className: "ayah-modern" }, ayah.modern_ja));

  // Summary
  body.appendChild(h("span", { className: "small-cap" }, "要約"));
  body.appendChild(h("div", { className: "ayah-summary" }, ayah.summary_ja));

  // Themes
  body.appendChild(h("span", { className: "small-cap" }, "テーマ"));
  body.appendChild(h("div", {},
    ayah.themes.map(th => h("span", { className: "tag" }, th))
  ));

  // Notes
  if (ayah.notes && ayah.notes.length > 0) {
    body.appendChild(h("span", { className: "small-cap", style: { color: "var(--note)" } }, "注記"));
    const list = h("ol", { className: "ayah-notes" });
    ayah.notes.forEach((n, i) => {
      list.appendChild(h("li", {},
        h("span", { className: "note-num" }, `${i + 1}.`),
        h("span", {}, n)
      ));
    });
    body.appendChild(list);
  }

  // Caution
  if (ayah.caution && ayah.caution.length > 0) {
    body.appendChild(h("span", { className: "small-cap", style: { color: "var(--caution)" } }, "注意"));
    const box = h("div", { className: "ayah-caution-box" });
    ayah.caution.forEach((c, i) => {
      box.appendChild(h("div", { style: { marginBottom: i < ayah.caution.length - 1 ? "6px" : "0" } }, c));
    });
    body.appendChild(box);
  }

  entry.appendChild(body);
  return entry;
}

function renderRightMargin(chapter) {
  const margin = h("div", { className: "right-margin" });

  // Caution summary
  margin.appendChild(h("span", { className: "small-cap" }, "この章の注意点"));

  const cautionAyahs = chapter.ayahs.filter(a => a.caution && a.caution.length > 0);
  if (cautionAyahs.length > 0) {
    const text = h("div", { className: "right-margin-text" });
    text.innerHTML = `本章には${cautionAyahs.length}箇所の注意事項があります。各節の<span class="right-margin-accent">注意</span>欄をご確認ください。`;
    margin.appendChild(text);
  } else {
    margin.appendChild(h("div", { className: "right-margin-text" }, "本章に特記すべき注意事項はありません。"));
  }

  margin.appendChild(h("div", { className: "right-margin-divider" }));

  // Theme distribution
  margin.appendChild(h("span", { className: "small-cap" }, "テーマ分布"));
  const themeCounts = {};
  chapter.ayahs.forEach(a => a.themes.forEach(th => { themeCounts[th] = (themeCounts[th] || 0) + 1; }));
  const maxCount = Math.max(...Object.values(themeCounts), 1);
  const themeDiv = h("div", { style: { marginTop: "10px" } });
  for (const [theme, count] of Object.entries(themeCounts)) {
    const pct = (count / maxCount) * 100;
    themeDiv.appendChild(h("div", { className: "theme-bar" },
      h("span", { className: "theme-bar-label" }, theme),
      h("div", { className: "theme-bar-track" },
        h("div", { className: "theme-bar-fill", style: { width: `${pct}%` } })
      )
    ));
  }
  margin.appendChild(themeDiv);

  margin.appendChild(h("div", { className: "right-margin-divider" }));

  // Display options
  margin.appendChild(h("span", { className: "small-cap" }, "表示"));
  const opts = h("div", { style: { marginTop: "10px" } });
  opts.appendChild(h("div", { className: "display-option" }, "✓ アラビア語原文"));
  opts.appendChild(h("div", { className: "display-option" }, "✓ 逐語訳"));
  opts.appendChild(h("div", { className: "display-option" }, "✓ 現代日本語訳"));
  opts.appendChild(h("div", { className: "display-option disabled" }, "— ローマナイズ"));
  margin.appendChild(opts);

  return margin;
}

// ───────── Index View ─────────
function renderIndexView() {
  const content = h("div", { className: "index-content" });

  const includedCount = index.filter(c => c.ayah_count_included > 0).length;
  const totalAyahs = index.reduce((s, c) => s + c.ayah_count_included, 0);
  const totalAyahsAll = index.reduce((s, c) => s + c.ayah_count_total, 0);

  // Header
  content.appendChild(h("div", { className: "index-header" },
    h("div", {},
      h("h1", {}, "目次"),
      h("div", { className: "index-header-subtitle" }, `Index of Surahs · ${index.length}章`)
    ),
    h("div", { className: "index-stats" },
      h("div", {},
        h("span", { className: "small-cap" }, "収録済み"),
        h("div", {},
          h("span", { className: "index-stat-value" }, String(includedCount)),
          h("span", { className: "index-stat-total" }, ` / ${index.length}`)
        )
      ),
      h("div", {},
        h("span", { className: "small-cap" }, "収録節数"),
        h("div", {},
          h("span", { className: "index-stat-value" }, String(totalAyahs)),
          h("span", { className: "index-stat-total" }, ` / ${totalAyahsAll.toLocaleString()}`)
        )
      )
    )
  ));

  content.appendChild(h("div", { className: "rule" }));

  // Table header
  content.appendChild(h("div", { className: "index-table-header" },
    h("div", {}, "№"),
    h("div", {}, "章名（日本語）"),
    h("div", {}, "اَلْعَرَبِيَّةُ"),
    h("div", {}, "Transliteration"),
    h("div", {}, "主題"),
    h("div", { style: { textAlign: "right" } }, "節数"),
    h("div", { style: { textAlign: "right" } }, "収録")
  ));

  // Rows
  for (const c of index) {
    const partial = c.ayah_count_included > 0 && c.ayah_count_included < c.ayah_count_total;
    const full = c.ayah_count_included === c.ayah_count_total;
    const empty = c.ayah_count_included === 0;
    const hasData = chapterMap.has(c.surah);
    const ch = chapterMap.get(c.surah);

    let statusEl;
    if (full) statusEl = h("span", { className: "status-full" }, "● 完");
    else if (partial) statusEl = h("span", { className: "status-partial" }, `◐ ${c.ayah_count_included}/${c.ayah_count_total}`);
    else statusEl = h("span", { className: "status-empty" }, "○ 未");

    content.appendChild(h("div", {
      className: "index-table-row" + (empty ? " empty" : ""),
      onClick: () => {
        if (hasData) { state.surah = c.surah; state.view = "reading"; render(); }
      }
    },
      h("div", { className: "index-row-num" }, String(c.surah)),
      h("div", { className: "index-row-name" }, c.chapter_name_ja),
      h("div", { className: "index-row-ar", dir: "rtl" }, c.chapter_name_ar),
      h("div", { className: "index-row-en" }, c.chapter_name_en),
      h("div", { className: "index-row-theme" }, ch?.approximate_theme || ""),
      h("div", { className: "index-row-count" }, String(c.ayah_count_total)),
      h("div", { className: "index-row-status" }, statusEl)
    ));
  }

  const notIncluded = 114 - index.length;
  if (notIncluded > 0) {
    content.appendChild(h("div", { className: "index-footer" }, `· · ·  残り ${notIncluded} 章は未収録  · · ·`));
  }

  return content;
}

// ───────── Search View ─────────
function renderSearchView() {
  const layout = h("div", { className: "search-layout" });

  // Collect all themes with counts
  const themeCounts = {};
  for (const ch of chapters) {
    for (const a of ch.ayahs) {
      a.themes.forEach(th => { themeCounts[th] = (themeCounts[th] || 0) + 1; });
    }
  }

  // Sidebar
  const sidebar = h("div", { className: "search-sidebar" });
  sidebar.appendChild(h("span", { className: "small-cap" }, "フィールド"));
  const fieldList = h("div", { className: "field-list" });
  fieldList.appendChild(h("div", {}, "✓ 現代日本語 (modern_ja)"));
  fieldList.appendChild(h("div", {}, "✓ 逐語 (literal_ja)"));
  fieldList.appendChild(h("div", {}, "✓ 要約 (summary_ja)"));
  fieldList.appendChild(h("div", { className: "disabled" }, "□ 注記 (notes)"));
  fieldList.appendChild(h("div", { className: "disabled" }, "□ 注意 (caution)"));
  fieldList.appendChild(h("div", { className: "disabled" }, "□ ローマナイズ"));
  sidebar.appendChild(fieldList);

  sidebar.appendChild(h("div", { className: "search-divider" }));

  sidebar.appendChild(h("span", { className: "small-cap" }, "テーマで絞り込み"));
  const tagsDiv = h("div", { className: "search-theme-tags" });
  for (const [theme, count] of Object.entries(themeCounts).sort((a, b) => a[0].localeCompare(b[0], "ja"))) {
    tagsDiv.appendChild(h("button", {
      className: "search-theme-tag" + (state.searchTheme === theme ? " active" : ""),
      onClick: () => {
        state.searchTheme = state.searchTheme === theme ? "" : theme;
        render();
      }
    },
      h("span", {}, theme),
      h("span", { className: "count" }, String(count))
    ));
  }
  sidebar.appendChild(tagsDiv);

  sidebar.appendChild(h("div", { className: "search-divider" }));

  sidebar.appendChild(h("span", { className: "small-cap" }, "章で絞り込み"));
  const chList = h("div", { className: "search-chapter-list" });
  for (const c of index) {
    const has = c.ayah_count_included > 0;
    chList.appendChild(h("div", { className: has ? "" : "disabled" },
      `${has ? "✓" : "□"} 第${c.surah}章 ${c.chapter_name_ja} (${c.ayah_count_included})`
    ));
  }
  sidebar.appendChild(chList);
  layout.appendChild(sidebar);

  // Results area
  const results = h("div", { className: "search-results" });

  // Search bar
  const barWrapper = h("div", { className: "search-bar-wrapper" });
  const searchResults = getSearchResults();

  const bar = h("div", { className: "search-bar" });
  bar.appendChild(h("span", { className: "search-bar-icon" }, "⌕"));
  const input = h("input", {
    type: "search",
    placeholder: "慈悲、導き、祈り…",
    autocomplete: "off",
  });
  input.value = state.search;
  input.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    render();
  });
  // Restore focus after render
  setTimeout(() => {
    const inp = $(".search-bar input");
    if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
  }, 0);
  bar.appendChild(input);
  bar.appendChild(h("span", { className: "search-bar-count" }, `${searchResults.length} 件`));
  barWrapper.appendChild(bar);

  const activeFields = ["現代日本語", "逐語", "要約"];
  let infoText = `${activeFields.join(" · ")} の3フィールドを検索`;
  if (state.searchTheme) infoText += ` / テーマ「${state.searchTheme}」で絞り込み`;
  barWrapper.appendChild(h("div", { className: "search-info" }, infoText));
  results.appendChild(barWrapper);

  // Result items
  for (const r of searchResults) {
    const item = h("div", {
      className: "search-result-item",
      onClick: () => { state.surah = r.surah; state.view = "reading"; render(); }
    });

    item.appendChild(h("div", { className: "search-result-top" },
      h("div", { className: "search-result-ref" },
        h("span", { className: "search-result-num" }, `${r.surah}:${r.ayah}`),
        h("span", { className: "search-result-chapter" }, `${r.chapterName} · 第${r.ayah}節`)
      ),
      h("span", { className: "tag" }, r.matchTheme || r.themes[0] || "")
    ));

    // Highlight match
    const textEl = h("div", { className: "search-result-text" });
    if (state.search && r.snippet.includes(state.search)) {
      textEl.innerHTML = r.snippet.split(state.search)
        .map((part, i, arr) => {
          const escaped = escapeHtml(part);
          return i < arr.length - 1
            ? escaped + `<span class="search-highlight">${escapeHtml(state.search)}</span>`
            : escaped;
        }).join("");
    } else {
      textEl.textContent = r.snippet;
    }
    item.appendChild(textEl);

    item.appendChild(h("div", { className: "search-result-meta" },
      `match in ${r.field} · この節に移動 →`
    ));
    results.appendChild(item);
  }

  if (searchResults.length === 0 && (state.search || state.searchTheme)) {
    results.appendChild(h("div", { className: "empty-state" }, "条件に合う結果がありません。"));
  }

  layout.appendChild(results);
  return layout;
}

function getSearchResults() {
  const results = [];
  const query = state.search.toLowerCase().normalize("NFKC");

  for (const ch of chapters) {
    for (const a of ch.ayahs) {
      if (state.searchTheme && !a.themes.includes(state.searchTheme)) continue;

      if (!query) {
        if (state.searchTheme) {
          results.push({
            surah: ch.surah, ayah: a.ayah,
            chapterName: ch.chapter_name_ja,
            snippet: a.modern_ja, field: "modern_ja",
            themes: a.themes, matchTheme: state.searchTheme
          });
        }
        continue;
      }

      const fields = [
        { key: "modern_ja", text: a.modern_ja },
        { key: "literal_ja", text: a.literal_ja },
        { key: "summary_ja", text: a.summary_ja },
      ];
      for (const f of fields) {
        if (f.text.toLowerCase().normalize("NFKC").includes(query)) {
          results.push({
            surah: ch.surah, ayah: a.ayah,
            chapterName: ch.chapter_name_ja,
            snippet: f.text, field: f.key,
            themes: a.themes, matchTheme: state.searchTheme || null
          });
          break;
        }
      }
    }
  }
  return results;
}

// ───────── Parallel View ─────────
function renderParallelView() {
  const chapter = chapterMap.get(state.surah);
  const content = h("div", { className: "parallel-content" });

  // Header
  content.appendChild(h("div", { className: "parallel-header" },
    h("div", {},
      h("span", { className: "small-cap" }, `Surah ${chapter.surah} · ${chapter.chapter_name_ja}`),
      h("h1", {}, "対訳で読む")
    ),
    h("div", { className: "parallel-mode-buttons" },
      ["積重", "対訳", "原文のみ", "日本語のみ"].map((v, i) =>
        h("span", { className: "parallel-mode-btn" + (i === 1 ? " active" : "") }, v)
      )
    )
  ));

  // Rows
  for (const a of chapter.ayahs) {
    const row = h("div", { className: "parallel-row" });

    // Number
    row.appendChild(h("div", { className: "parallel-num" }, String(a.ayah)));

    // Japanese side
    const jaCol = h("div", {});
    jaCol.appendChild(h("div", { className: "parallel-ja-modern" }, a.modern_ja));
    jaCol.appendChild(h("div", { className: "parallel-ja-literal" }, `逐語: ${a.literal_ja}`));
    if (a.caution && a.caution.length > 0) {
      jaCol.appendChild(h("div", { className: "parallel-caution" }, `注意: ${a.caution[0]}`));
    }
    row.appendChild(jaCol);

    // Divider
    row.appendChild(h("div", { className: "parallel-divider" }));

    // Arabic side
    const arCol = h("div", { dir: "rtl" });
    arCol.appendChild(h("div", { className: "parallel-arabic" }, a.arabic));
    const romanDiv = h("div", { className: "parallel-romanized", dir: "ltr" });
    romanDiv.textContent = a.romanized;
    arCol.appendChild(romanDiv);
    row.appendChild(arCol);

    content.appendChild(row);
  }

  return content;
}

// ───────── Helpers ─────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ───────── Init ─────────
render();
