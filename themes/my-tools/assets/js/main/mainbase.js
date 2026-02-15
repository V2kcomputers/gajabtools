function toggleMenu(){
    document.getElementById("navLinks").classList.toggle("active");
}

function closeMenu(){
    document.getElementById("navLinks").classList.remove("active");
}

/* Outside click close */
document.addEventListener("click", function(event){
    const nav = document.getElementById("navLinks");
    const menuBtn = document.querySelector(".menu-btn");

    if(!nav.contains(event.target) && !menuBtn.contains(event.target)){
        nav.classList.remove("active");
    }
});

function toggleDarkMode(){
    document.body.classList.toggle("dark");
    const btn = document.querySelector(".toggle-btn");
    if(document.body.classList.contains("dark")){
        localStorage.setItem("theme","dark");
        btn.textContent="☀";
    }else{
        localStorage.setItem("theme","light");
        btn.textContent="🌙";
    }
}

if(localStorage.getItem("theme")==="dark"){
    document.body.classList.add("dark");
    document.querySelector(".toggle-btn").textContent="☀";
}

function searchTool(){
    let input = document.getElementById("searchInput").value.toLowerCase();
    let cards = document.querySelectorAll(".tool-card");

    cards.forEach(card=>{
        let title = card.querySelector("h3").textContent.toLowerCase();
        card.style.display = title.includes(input) ? "block" : "none";
    });
}