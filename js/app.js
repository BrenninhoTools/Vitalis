import { api } from "./api.js";
import { webAudio } from "./audio.js";
import { clear, debounce, el, icon } from "./dom.js";

const views = ["documentary", "protocols", "assessment", "insights"];
const titles = {
  documentary: "Docuseries",
  protocols: "Disease Protocols",
  assessment: "Symptom Assessment",
  insights: "Clinical Insights"
};

const state = {
  episodes: [],
  activeEpisode: null,
  diseases: new Map(),
  filter: "all",
  query: "",
  symptoms: [],
  selected: new Set(),
  requestId: 0
};

const $ = (id) => document.getElementById(id);

let toastTimer;
function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("visible"), 2800);
}

function errorState(message, retry) {
  return el(
    "div",
    { class: "error-state", role: "alert" },
    icon("alert"),
    el("h3", { text: "Something went wrong" }),
    el("p", { text: message }),
    el("button", { class: "button button-ghost", type: "button", onclick: retry }, "Try again")
  );
}

function parseHash() {
  const raw = location.hash.slice(1);
  const episode = raw.match(/^episode-(\d+)$/);
  if (episode) return { view: "documentary", episode: Number(episode[1]) };
  return { view: views.includes(raw) ? raw : "documentary", episode: null };
}

function showView(view) {
  for (const name of views) {
    $(`view-${name}`).hidden = name !== view;
  }
  document.querySelectorAll(".main-nav a").forEach((link) => {
    if (link.dataset.view === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = `${titles[view]} | Vitalis`;
}

function route() {
  const { view, episode } = parseHash();
  showView(view);
  if (episode && state.episodes.some((item) => item.id === episode)) {
    selectEpisode(episode, { autoplay: false, syncHash: false });
  }
  window.scrollTo({ top: 0 });
}

function embedUrl(episode) {
  return `https://www.youtube-nocookie.com/embed/${episode.videoId}?rel=0&modestbranding=1`;
}

function posterUrl(episode, quality = "hq720") {
  return `https://i.ytimg.com/vi/${episode.videoId}/${quality}.jpg`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function posterImage(episode, attrs = {}) {
  const image = el("img", { src: posterUrl(episode), alt: "", ...attrs });
  image.addEventListener(
    "error",
    () => {
      image.addEventListener("error", () => image.remove(), { once: true });
      image.src = posterUrl(episode, "mqdefault");
    },
    { once: true }
  );
  return image;
}

function renderRail() {
  const list = clear($("episodeList"));
  $("playlistCount").textContent = `${state.episodes.length} episodes`;

  state.episodes.forEach((episode) => {
    list.append(
      el(
        "button",
        {
          class: "rail-card",
          type: "button",
          role: "listitem",
          "data-id": episode.id,
          "aria-current": "false",
          onclick: () => selectEpisode(episode.id, { autoplay: true, syncHash: true })
        },
        el(
          "span",
          { class: "rail-poster" },
          posterImage(episode, { loading: "lazy", width: 1280, height: 720 }),
          el("span", { class: "rail-now", text: "Now showing", hidden: true }),
          el("span", { class: "rail-number", text: String(episode.id).padStart(2, "0") }),
          el("span", { class: "rail-time", text: formatTime(episode.seconds) })
        ),
        el(
          "span",
          { class: "rail-meta" },
          el("span", { class: "kicker", text: episode.category }),
          el("span", { class: "name", text: episode.title })
        )
      )
    );
  });
}

function showPoster() {
  const player = $("videoPlayer");
  player.removeAttribute("src");
  player.hidden = true;
  $("stagePoster").hidden = false;
  $("stagePlay").hidden = false;
  $("stageTime").hidden = false;
}

function playActive() {
  const episode = state.episodes.find((item) => item.id === state.activeEpisode);
  if (!episode) return;
  const player = $("videoPlayer");
  player.src = `${embedUrl(episode)}&autoplay=1`;
  player.hidden = false;
  $("stagePoster").hidden = true;
  $("stagePlay").hidden = true;
  $("stageTime").hidden = true;
}

function selectEpisode(id, { autoplay, syncHash }) {
  const episode = state.episodes.find((item) => item.id === id);
  if (!episode) return;

  state.activeEpisode = id;

  $("epTitle").textContent = episode.title;
  $("epTagline").textContent = episode.tagline;
  $("epCategory").textContent = `Episode ${episode.id} / ${episode.category}`;
  $("epDescription").textContent = episode.description;
  $("epSource").textContent = episode.source;
  $("epTopic").textContent = episode.topic;
  $("epRuntime").textContent = formatTime(episode.seconds);
  $("epLevel").textContent = episode.level;
  $("stageTime").textContent = formatTime(episode.seconds);
  $("cinemaBackdrop").style.backgroundImage = `url("${posterUrl(episode, "mqdefault")}")`;

  const poster = $("stagePoster");
  poster.onerror = () => {
    poster.onerror = null;
    poster.src = posterUrl(episode, "mqdefault");
  };
  poster.src = posterUrl(episode);

  const index = state.episodes.findIndex((item) => item.id === id);
  $("prevEpisode").disabled = index <= 0;
  $("nextEpisode").disabled = index >= state.episodes.length - 1;

  document.querySelectorAll(".rail-card").forEach((card) => {
    const active = Number(card.dataset.id) === id;
    card.setAttribute("aria-current", String(active));
    card.querySelector(".rail-now").hidden = !active;
  });

  showPoster();
  $("cinema").classList.add("ready");
  if (autoplay) {
    playActive();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (syncHash) history.replaceState(null, "", `#episode-${id}`);
}

function stepEpisode(offset) {
  const index = state.episodes.findIndex((item) => item.id === state.activeEpisode);
  const next = state.episodes[index + offset];
  if (next) selectEpisode(next.id, { autoplay: true, syncHash: true });
}

function scrollRail(direction) {
  const rail = $("episodeList");
  rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: "smooth" });
}

async function shareEpisode() {
  const link = `${location.origin}${location.pathname}#episode-${state.activeEpisode}`;
  try {
    await navigator.clipboard.writeText(link);
    toast("Episode link copied to clipboard");
  } catch {
    toast("Copy is not available in this browser");
  }
}

async function loadEpisodes() {
  const list = $("episodeList");
  list.replaceChildren(...Array.from({ length: 4 }, () => el("div", { class: "skeleton rail-skeleton" })));

  try {
    const { items } = await api.episodes();
    state.episodes = items;
    renderRail();
    const requested = parseHash().episode;
    const first = items.find((item) => item.id === requested) || items[0];
    if (first) selectEpisode(first.id, { autoplay: false, syncHash: false });
  } catch (error) {
    list.replaceChildren(errorState(error.message, loadEpisodes));
  }
}

const diseaseIcons = { flu: "activity", respiratory: "droplet", fever: "thermometer" };

function diseaseCard(disease) {
  return el(
    "article",
    { class: "card disease-card", "data-type": disease.type },
    el(
      "div",
      { class: "body" },
      el("span", { class: "disease-icon" }, icon(diseaseIcons[disease.type] || "activity")),
      el("span", { class: "badge", text: disease.category }),
      el("h3", { text: disease.name }),
      el("p", { text: disease.shortDesc })
    ),
    el(
      "button",
      { class: "button button-ghost", type: "button", onclick: () => openProtocol(disease.id) },
      "View Treatment Protocol",
      icon("arrow")
    )
  );
}

async function loadDiseases() {
  const grid = $("diseaseGrid");
  const requestId = ++state.requestId;

  if (!grid.children.length) {
    grid.replaceChildren(...Array.from({ length: 3 }, () => el("div", { class: "skeleton" })));
  }

  try {
    const { items, total } = await api.diseases({ type: state.filter, q: state.query });
    if (requestId !== state.requestId) return;

    items.forEach((item) => state.diseases.set(item.id, item));
    $("diseaseCount").textContent = `${total} ${total === 1 ? "condition" : "conditions"}`;

    if (!items.length) {
      grid.replaceChildren(
        el(
          "div",
          { class: "empty" },
          icon("search", "icon icon-xl"),
          el("h3", { text: "No conditions found" }),
          el("p", { text: "Try a different search term or choose another category." })
        )
      );
      return;
    }
    grid.replaceChildren(...items.map(diseaseCard));
  } catch (error) {
    if (requestId !== state.requestId) return;
    $("diseaseCount").textContent = "";
    grid.replaceChildren(errorState(error.message, loadDiseases));
  }
}

function setFilter(type) {
  state.filter = type;
  document.querySelectorAll("#diseaseFilters .chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.type === type));
  });
  loadDiseases();
}

async function openProtocol(id) {
  let disease = state.diseases.get(id);

  if (!disease) {
    try {
      disease = await api.disease(id);
      state.diseases.set(id, disease);
    } catch (error) {
      toast(error.message);
      return;
    }
  }

  $("dialogCategory").textContent = disease.category;
  $("dialogTitle").textContent = disease.name;
  $("dialogDescription").textContent = disease.fullDesc;
  $("dialogTimeline").textContent = disease.timeline;
  clear($("dialogProtocols")).append(...disease.protocols.map((text) => checkItem(text)));

  const dialog = $("protocolDialog");
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function checkItem(text) {
  return el("li", {}, el("span", { class: "tick" }, icon("check")), el("span", { text }));
}

function updateSymptomControls() {
  const count = state.selected.size;
  $("symptomCount").textContent = count ? `${count} selected` : "None selected";
  $("evaluateButton").disabled = count === 0;
  $("clearButton").disabled = count === 0;
}

function renderSymptoms() {
  $("symptomList").replaceChildren(
    ...state.symptoms.map((symptom) =>
      el(
        "button",
        {
          class: "chip",
          type: "button",
          "data-key": symptom.key,
          "aria-pressed": "false",
          onclick: (event) => toggleSymptom(event.currentTarget, symptom.key)
        },
        symptom.label
      )
    )
  );
  updateSymptomControls();
}

function toggleSymptom(button, key) {
  const active = !state.selected.has(key);
  if (active) state.selected.add(key);
  else state.selected.delete(key);
  button.setAttribute("aria-pressed", String(active));
  updateSymptomControls();
}

function clearSymptoms() {
  state.selected.clear();
  document.querySelectorAll("#symptomList .chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  updateSymptomControls();
}

const severityLabels = {
  mild: "Mild profile",
  elevated: "Elevated profile",
  urgent: "Urgent attention"
};

function renderResult(result) {
  const container = $("assessmentResult");
  const body = el(
    "div",
    { class: `result-body tone-${result.severity}` },
    el(
      "div",
      { class: "result-top" },
      el("span", { class: "label", text: "Assessment Result" }),
      el("span", { class: `severity severity-${result.severity}`, text: severityLabels[result.severity] })
    ),
    el("div", {}, el("h3", { text: result.headline }), el("p", { class: "summary", text: result.summary })),
    el(
      "div",
      { class: "result-section" },
      el("h4", { text: "Closest matching conditions" }),
      el(
        "div",
        { class: "matches" },
        ...result.matches.map((match) => {
          const fill = el("span");
          fill.style.width = "0%";
          requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${match.score}%`)));
          return el(
            "button",
            {
              class: "match",
              type: "button",
              "aria-label": `${match.name}, ${match.score} percent match. Open protocol`,
              onclick: () => openProtocol(match.id)
            },
            el("span", { class: "name", text: match.name }),
            el("span", { class: "score", text: `${match.score}%` }),
            el("span", { class: "meter" }, fill)
          );
        })
      )
    ),
    el(
      "div",
      { class: "result-section" },
      el("h4", { text: "Recommended action steps" }),
      el("ul", { class: "checklist" }, ...result.steps.map((step) => checkItem(step)))
    )
  );

  container.replaceChildren(
    body,
    el("p", {
      class: "disclaimer",
      text: "This educational platform provides clinical context and does not replace professional emergency care or a medical diagnosis."
    })
  );
  container.focus({ preventScroll: true });
  if (window.matchMedia("(max-width: 1080px)").matches) container.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function evaluate() {
  const button = $("evaluateButton");
  button.disabled = true;
  button.textContent = "Evaluating";

  try {
    const result = await api.assess([...state.selected]);
    renderResult(result);
    if (result.severity !== "mild") webAudio.playHeartbeatPulse();
  } catch (error) {
    toast(error.message);
  } finally {
    button.textContent = "Evaluate Profile";
    updateSymptomControls();
  }
}

async function loadSymptoms() {
  try {
    const { items } = await api.symptoms();
    state.symptoms = items;
    renderSymptoms();
  } catch (error) {
    $("symptomList").replaceChildren(errorState(error.message, loadSymptoms));
  }
}

function syncSoundToggle() {
  const toggle = $("soundToggle");
  toggle.setAttribute("aria-pressed", String(webAudio.enabled));
  toggle.setAttribute("aria-label", webAudio.enabled ? "Disable interface sounds" : "Enable interface sounds");
  $("soundIcon").setAttribute("href", webAudio.enabled ? "#i-volume" : "#i-mute");
}

function bindEvents() {
  $("shareEpisode").addEventListener("click", shareEpisode);
  $("watchButton").addEventListener("click", playActive);
  $("stagePlay").addEventListener("click", playActive);
  $("railPrev").addEventListener("click", () => scrollRail(-1));
  $("railNext").addEventListener("click", () => scrollRail(1));
  $("prevEpisode").addEventListener("click", () => stepEpisode(-1));
  $("nextEpisode").addEventListener("click", () => stepEpisode(1));

  $("diseaseSearch").addEventListener(
    "input",
    debounce((event) => {
      state.query = event.target.value.trim();
      loadDiseases();
    }, 220)
  );

  $("diseaseFilters").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip) setFilter(chip.dataset.type);
  });

  $("evaluateButton").addEventListener("click", evaluate);
  $("clearButton").addEventListener("click", clearSymptoms);

  const dialog = $("protocolDialog");
  $("dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  $("soundToggle").addEventListener("click", () => {
    webAudio.setEnabled(!webAudio.enabled);
    syncSoundToggle();
    webAudio.playInterfaceClick();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("button:not(:disabled), a[href]") && !event.target.closest("#soundToggle")) {
      webAudio.playInterfaceClick();
    }
  });

  window.addEventListener("hashchange", route);
}

function setupInstall() {
  const button = $("installButton");
  let promptEvent = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    promptEvent = null;
    button.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    promptEvent = null;
    button.hidden = true;
    toast("Vitalis was installed");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
}

bindEvents();
setupInstall();
syncSoundToggle();
showView(parseHash().view);
Promise.all([loadEpisodes(), loadDiseases(), loadSymptoms()]).then(route);
