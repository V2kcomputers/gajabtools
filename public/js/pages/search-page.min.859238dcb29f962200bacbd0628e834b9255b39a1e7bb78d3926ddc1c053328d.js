let fuse,data=[];fetch("/index.json").then(e=>e.json()).then(e=>{data=e,fuse=new Fuse(data,{keys:["title","content"],threshold:.4,includeMatches:!0})});function highlight(e,t){let n=new RegExp(`(${t})`,"gi");return e.replace(n,`<mark>$1</mark>`)}document.getElementById("searchInput").addEventListener("input",function(){let e=this.value.trim(),t=document.getElementById("results");if(!fuse||e===""){t.innerHTML="";return}let n=fuse.search(e).slice(0,6);if(n.length===0){t.innerHTML=`<div class="no-result">No results found</div>`;return}let s=n.map(t=>{let n=t.item;return`
      <a href="${n.link}" class="result-card">
        <img src="${n.image||"/default.png"}" class="result-img">
        <div class="result-content">
          <div class="result-title">${highlight(n.title,e)}</div>
          <div class="result-desc">${n.content.substring(0,80)}...</div>
    
        </div>
      </a>
    `}).join("");t.innerHTML=s});const input=document.getElementById("searchInput"),clearBtn=document.getElementById("clearBtn"),results=document.getElementById("results");input.addEventListener("input",function(){clearBtn.style.display=this.value?"block":"none"}),clearBtn.addEventListener("click",function(){input.value="",results.innerHTML="",clearBtn.style.display="none",input.focus()})