const data = window.quranStructuredJaData;

if (!data) {
  throw new Error("quranStructuredJaData is not loaded.");
}

const chapters = data.chapters;
const chapterMap = new Map(chapters.map((chapter) => [chapter.surah, chapter]));
const state = {
  surah: chapters[0]?.surah ?? 1,
  search: "",
  tag: "",
  selectedAyah: 1,
};

const elements = {
  chapterSelect: document.querySelector("#chapter-select"),
  searchInput: document.querySelector("#search-input"),
  clearFilters: document.querySelector("#clear-filters"),
  tagCloud: document.querySelector("#tag-cloud"),
  activeFilters: document.querySelector("#active-filters"),
  chapterSummary: document.querySelector("#chapter-summary"),
  ayahList: document.querySelector("#ayah-list"),
  detailContent: document.querySelector("#detail-content"),
  resultCount: document.querySelector("#result-count"),
};

initialize();

function initialize() {
  renderChapterOptions();
  bindEvents();
  render();
}

function bindEvents() {
  elements.chapterSelect.addEventListener("change", (event) => {
    state.surah = Number(event.target.value);
    state.selectedAyah = 1;
    state.tag = "";
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    render();
  });

  elements.clearFilters.addEventListener("click", () => {
    state.search = "";
    state.tag = "";
    elements.searchInput.value = "";
    render();
  });
}

function render() {
  const chapter = chapterMap.get(state.surah);
  const visibleAyahs = getVisibleAyahs(chapter);

  if (!visibleAyahs.some((ayah) => ayah.ayah === state.selectedAyah)) {
    state.selectedAyah = visibleAyahs[0]?.ayah ?? chapter.ayahs[0]?.ayah ?? 1;
  }

  renderChapterSummary(chapter, visibleAyahs.length);
  renderTagCloud(chapter);
  renderActiveFilters();
  renderAyahList(visibleAyahs);
  renderDetail(chapter);
  elements.resultCount.textContent = `${visibleAyahs.length} / ${chapter.ayahs.length} 節`;
}

function renderChapterOptions() {
  chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = String(chapter.surah);
    option.textContent = `${chapter.surah}. ${chapter.chapter_name_ja} / ${chapter.chapter_name_en}`;
    elements.chapterSelect.append(option);
  });
  elements.chapterSelect.value = String(state.surah);
}

function renderChapterSummary(chapter, visibleCount) {
  elements.chapterSummary.innerHTML = `
    <div class="chapter-header">
      <div>
        <p class="section-kicker">Surah ${chapter.surah}</p>
        <h2>${escapeHtml(chapter.chapter_name_ja)}</h2>
        <p class="chapter-en">${escapeHtml(chapter.chapter_name_en)}</p>
      </div>
      <div class="arabic-block">${escapeHtml(chapter.chapter_name_ar)}</div>
    </div>
    <div class="chapter-meta-grid">
      <div class="meta-card">
        <span class="meta-label">主題</span>
        <p>${escapeHtml(chapter.approximate_theme)}</p>
      </div>
      <div class="meta-card">
        <span class="meta-label">要約</span>
        <p>${escapeHtml(chapter.summary_ja)}</p>
      </div>
      <div class="meta-card">
        <span class="meta-label">収録状況</span>
        <p>${chapter.ayah_count_included} / ${chapter.ayah_count_total} 節を収録。現在の表示件数は ${visibleCount} 節です。</p>
      </div>
    </div>
  `;
}

function renderTagCloud(chapter) {
  const counts = new Map();
  chapter.ayahs.forEach((ayah) => {
    ayah.themes.forEach((theme) => {
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
    });
  });

  const tags = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "ja"));
  elements.tagCloud.innerHTML = "";

  tags.forEach(([tag, count]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-chip${state.tag === tag ? " is-active" : ""}`;
    button.textContent = `${tag} (${count})`;
    button.addEventListener("click", () => {
      state.tag = state.tag === tag ? "" : tag;
      render();
    });
    elements.tagCloud.append(button);
  });
}

function renderActiveFilters() {
  const active = [];
  if (state.search) {
    active.push(`検索: ${state.search}`);
  }
  if (state.tag) {
    active.push(`テーマ: ${state.tag}`);
  }

  elements.activeFilters.innerHTML = active.length
    ? active.map((item) => `<span class="active-chip">${escapeHtml(item)}</span>`).join("")
    : '<span class="active-hint">検索語やテーマで節を絞り込めます。</span>';
}

function renderAyahList(ayahs) {
  elements.ayahList.innerHTML = "";

  if (!ayahs.length) {
    elements.ayahList.innerHTML = '<div class="empty-state">条件に合う節がありません。別の言葉で試してください。</div>';
    return;
  }

  ayahs.forEach((ayah) => {
    const card = document.createElement("article");
    card.className = `ayah-card${state.selectedAyah === ayah.ayah ? " is-selected" : ""}`;
    card.innerHTML = `
      <div class="ayah-card-top">
        <span class="ayah-number">${ayah.ayah}</span>
        <div class="ayah-tags">
          ${ayah.themes.map((theme) => `<span>${escapeHtml(theme)}</span>`).join("")}
        </div>
      </div>
      <p class="ayah-modern">${escapeHtml(ayah.modern_ja)}</p>
      <p class="ayah-summary">${escapeHtml(ayah.summary_ja)}</p>
    `;
    card.addEventListener("click", () => {
      state.selectedAyah = ayah.ayah;
      render();
    });
    elements.ayahList.append(card);
  });
}

function renderDetail(chapter) {
  const ayah = chapter.ayahs.find((item) => item.ayah === state.selectedAyah) ?? chapter.ayahs[0];

  elements.detailContent.innerHTML = `
    <div class="detail-heading">
      <p class="detail-label">第${chapter.surah}章 第${ayah.ayah}節</p>
      <h3>${escapeHtml(chapter.chapter_name_ja)} ${ayah.ayah}</h3>
    </div>
    ${ayah.arabic ? `<p class="detail-arabic">${escapeHtml(ayah.arabic)}</p>` : ""}
    ${ayah.romanized ? `<p class="detail-romanized">${escapeHtml(ayah.romanized)}</p>` : ""}
    <section class="detail-section">
      <h4>逐語寄りの表現</h4>
      <p>${escapeHtml(ayah.literal_ja)}</p>
    </section>
    <section class="detail-section emphasis">
      <h4>現代日本語での表現</h4>
      <p>${escapeHtml(ayah.modern_ja)}</p>
    </section>
    <section class="detail-section">
      <h4>要約</h4>
      <p>${escapeHtml(ayah.summary_ja)}</p>
    </section>
    <section class="detail-section">
      <h4>テーマ</h4>
      <div class="detail-tags">${ayah.themes.map((theme) => `<span>${escapeHtml(theme)}</span>`).join("")}</div>
    </section>
    ${chapter.coverage_note ? `<section class="detail-section">
      <h4>収録範囲メモ</h4>
      <p>${escapeHtml(chapter.coverage_note)}</p>
    </section>` : ""}
    <section class="detail-section">
      <h4>注記</h4>
      <ul>${ayah.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
    </section>
    <section class="detail-section caution-box">
      <h4>注意</h4>
      <ul>${ayah.caution.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function getVisibleAyahs(chapter) {
  const query = buildSearchText(state.search);

  return chapter.ayahs.filter((ayah) => {
    const matchesTag = !state.tag || ayah.themes.includes(state.tag);
    if (!matchesTag) {
      return false;
    }

    if (!query) {
      return true;
    }

    const doc = buildSearchText([
      ayah.arabic ?? "",
      ayah.romanized ?? "",
      ayah.literal_ja,
      ayah.modern_ja,
      ayah.summary_ja,
      ...ayah.themes,
      ...ayah.notes,
      ...ayah.caution,
    ].join(" "));

    return doc.includes(query);
  });
}

function buildSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
