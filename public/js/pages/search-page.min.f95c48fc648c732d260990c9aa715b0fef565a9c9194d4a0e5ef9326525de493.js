let fuse,data=[];const input=document.getElementById("searchInput"),resultsDiv=document.getElementById("results"),clearBtn=document.getElementById("clearBtn"),params=new URLSearchParams(window.location.search),queryParam=params.get("q")||"";input.value=queryParam;function highlight(e,t){let n=new RegExp(`(${t})`,"gi");return e.replace(n,`<mark>$1</mark>`)}let lastHTML="";function updateResults(e){if(e===lastHTML)return;lastHTML=e,resultsDiv.classList.add("fade-out"),setTimeout(()=>{resultsDiv.innerHTML=e,resultsDiv.classList.remove("fade-out"),resultsDiv.classList.add("fade-in")},120)}function runSearch(e){if(!fuse||e===""){updateResults("");return}let t=fuse.search(e).slice(0,6);if(t.length===0){updateResults(`<div class="no-result">No results found</div>`);return}let n=t.map(t=>{let n=t.item;return`
      <a href="${n.link}" class="result-card">
        <img src="${n.image||"/default.png"}" class="result-img">
        <div class="result-content">
          <div class="result-title">${highlight(n.title,e)}</div>
          <div class="result-desc">${n.content?n.content.substring(0,80):""}...</div>
        </div>
      </a>
    `}).join("");updateResults(n)}async function initSearch(){const e=await fetch("/index.json");data=await e.json(),fuse=new Fuse(data,{keys:["title","content"],threshold:.4,ignoreLocation:!0}),queryParam&&runSearch(queryParam)}initSearch();let timer;input.addEventListener("input",function(){const e=this.value.trim(),t=e?`/search/?q=${encodeURIComponent(e)}`:`/search/`;history.replaceState(null,"",t),clearBtn.style.display=e?"block":"none",clearTimeout(timer),timer=setTimeout(()=>{runSearch(e)},250)}),clearBtn.addEventListener("click",function(){input.value="",updateResults(""),clearBtn.style.display="none",history.replaceState(null,"","/search/"),input.focus()}),document.addEventListener("keydown",function(e){e.key==="Escape"&&(input.value="",updateResults(""),clearBtn.style.display="none")}),document.addEventListener("keydown",function(e){e.ctrlKey&&e.key.toLowerCase()==="k"&&(e.preventDefault(),input.focus())}),window.addEventListener("load",()=>{window.innerWidth>768&&input.focus()});const recentBox=document.getElementById("recentSearches");function saveSearch(e){if(!e)return;let t=JSON.parse(localStorage.getItem("recentSearches"))||[];t=t.filter(t=>t!==e),t.unshift(e),t=t.slice(0,6),localStorage.setItem("recentSearches",JSON.stringify(t))}function showRecent(){let e=JSON.parse(localStorage.getItem("recentSearches"))||[];if(e.length===0){recentBox.innerHTML="";return}let t=e.map(e=>`
    <div class="recent-item" onclick="selectRecent('${e}')">
      <span>${e}</span>
      🔍
    </div>
  `).join("");recentBox.innerHTML=t}function selectRecent(e){input.value=e,runSearch(e),saveSearch(e)}input.addEventListener("input",function(){const e=this.value.trim();e===""?(resultsDiv.innerHTML="",showRecent()):recentBox.innerHTML=""});function runSearch(e){if(!fuse||e===""){updateResults(""),showRecent();return}saveSearch(e);let t=fuse.search(e).slice(0,6);if(t.length===0){updateResults(`<div class="no-result">No results found</div>`);return}let n=t.map(t=>{let n=t.item;return`
      <a href="${n.link}" class="result-card">
        <div class="result-content">
          <div class="result-title">${highlight(n.title,e)}</div>
        </div>
      </a>
    `}).join("");updateResults(n)}window.addEventListener("load",()=>{input.value||showRecent()})