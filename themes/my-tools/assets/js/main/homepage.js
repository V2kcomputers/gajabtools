function toggleMenu(){
    const nav = document.getElementById("navLinks");
    nav.classList.toggle("active");

    // ⭐ ADD
    document.body.classList.toggle("menu-open");
}

function closeMenu(){
    const nav = document.getElementById("navLinks");
    nav.classList.remove("active");

    // ⭐ ADD
    document.body.classList.remove("menu-open");
}

/* Outside click close */
document.addEventListener("click", function(event){
    const nav = document.getElementById("navLinks");
    const menuBtn = document.querySelector(".menu-btn");

    if(!nav.contains(event.target) && !menuBtn.contains(event.target)){
        nav.classList.remove("active");
        document.body.classList.remove("menu-open"); // ⭐ ADD
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

//-------------------Click to Url Change-----------------------------
function goToSearchPage() {
    window.location.href = "/search/";
}