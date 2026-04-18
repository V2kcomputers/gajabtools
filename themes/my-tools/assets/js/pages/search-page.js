let fuse;
let data = [];

const input = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const clearBtn = document.getElementById("clearBtn");

// 🔹 URL से query लो
const params = new URLSearchParams(window.location.search);
const queryParam = params.get("q") || "";

// 🔹 input में set करो
input.value = queryParam;

// 🔹 Highlight function
function highlight(text, query) {
  let regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, `<mark>$1</mark>`);
}

// 🔹 Smooth update system
let lastHTML = "";

function updateResults(html) {
  if (html === lastHTML) return;

  lastHTML = html;

  resultsDiv.classList.add("fade-out");

  setTimeout(() => {
    resultsDiv.innerHTML = html;
    resultsDiv.classList.remove("fade-out");
    resultsDiv.classList.add("fade-in");
  }, 120);
}

// 🔹 Search function
function runSearch(query) {
  if (!fuse || query === "") {
    updateResults("");
    return;
  }

  let results = fuse.search(query).slice(0, 16);

  if (results.length === 0) {
    updateResults(`<div class="no-result">No results found</div>`);
    return;
  }

  let output = results.map(r => {
    let item = r.item;

    return `
      <a href="${item.link}" class="result-card">
        <img src="${item.image || '/default.png'}" class="result-img">
        <div class="result-content">
          <div class="result-title">${highlight(item.title, query)}</div>
          <div class="result-desc">${item.content ? item.content.substring(0, 80) : ""}...</div>
        </div>
      </a>
    `;
  }).join("");

  updateResults(output);
}

// 🔹 JSON load + Fuse init
async function initSearch() {
  const res = await fetch("/index.json");
  data = await res.json();

  fuse = new Fuse(data, {
    keys: ["title", "content"],
    threshold: 0.4,
    ignoreLocation: true
  });

  // Page load search
  if (queryParam) {
    runSearch(queryParam);
  }
}

initSearch();

// 🔹 Debounce system
let timer;

input.addEventListener("input", function () {
  const query = this.value.trim();

  // URL update
  const newURL = query 
    ? `/search/?q=${encodeURIComponent(query)}`
    : `/search/`;

  history.replaceState(null, "", newURL);

  // Clear button toggle
  clearBtn.style.display = query ? "block" : "none";

  // Debounce search
  clearTimeout(timer);
  timer = setTimeout(() => {
    runSearch(query);
  }, 250);
});

// 🔹 Clear button
clearBtn.addEventListener("click", function () {
  input.value = "";
  updateResults("");
  clearBtn.style.display = "none";
  history.replaceState(null, "", "/search/");
  input.focus();
});

// 🔹 ESC key
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    input.value = "";
    updateResults("");
    clearBtn.style.display = "none";
  }
});

// 🔹 Ctrl + K
document.addEventListener("keydown", function(e) {
  if (e.ctrlKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    input.focus();
  }
});

// 🔹 Auto focus
window.addEventListener("load", () => {
  if (window.innerWidth > 768) {
    input.focus();
  }
});

