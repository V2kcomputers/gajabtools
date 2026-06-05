const resume_id=new URLSearchParams(location.search).get("resume_id");resume_id||(alert("Invalid resume_id"),location.href="/resume-generator/");const raw=localStorage.getItem(resume_id);raw||(alert("Resume Not Found"),location.href="/resume-generator/");const data=JSON.parse(raw);r_name.textContent=data.candidateName||"",r_signature.textContent=data.candidateName||"",r_address.textContent=data.address||"",r_mobile.textContent=data.mobile||"",r_email.textContent=data.email||"",r_dob.textContent=data.dob||"",r_father.textContent=data.fatherName||"",r_mother.textContent=data.motherName||"",r_gender.textContent=data.gender||"",r_nationality.textContent=data.nationality||"",r_marital.textContent=data.maritalStatus||"",r_language.textContent=data.language||"",r_hobbies.textContent=data.hobbies||"",r_objective.textContent=data.objective||"",r_workExperience.textContent=data.workExperience||"",resumeType.textContent=data.type||"Resume",r_photo.src=data.photo||"";const academicTable=document.getElementById("academicData");data.academic.forEach(e=>{const t=document.createElement("tr");t.innerHTML=`
<td>${e.exam}</td>
<td>${e.board}</td>
<td>${e.year}</td>
<td>${e.marks}</td>
<td>${e.division}</td>
`,academicTable.appendChild(t)});const professionalTable=document.getElementById("professionalData");data.professional.forEach(e=>{const t=document.createElement("tr");t.innerHTML=`
<td>${e.exam}</td>
<td>${e.board}</td>
<td>${e.year}</td>
<td>${e.marks}</td>
<td>${e.division}</td>
`,professionalTable.appendChild(t)});const extraList=document.getElementById("extraQualificationList");data.extraQualifications.forEach(e=>{const t=document.createElement("li");t.textContent=e,extraList.appendChild(t)});function editResume(){location.href="/resume-generator/?resume_id="+resume_id}async function saveImage(){const e=document.getElementById("imgBtn"),t=e.innerHTML;e.innerHTML="Downloading JPG...",e.classList.add("loading");try{const t=document.querySelector(".resume"),n=await html2canvas(t,{scale:2,useCORS:!0}),e=document.createElement("a"),s=(data.candidateName||"resume").replace(/\s+/g,"-")+"-resume.jpg";e.download=s,e.href=n.toDataURL("image/jpeg",1),e.click()}finally{e.innerHTML=t,e.classList.remove("loading")}}async function savePDF(){const e=document.querySelector(".resume");e.classList.add("pdf-mode");const t=(data.candidateName||"resume").replace(/\s+/g,"-")+"-resume.pdf";try{await html2pdf().set({filename:t,margin:[15,15,15,15],image:{type:"jpeg",quality:1},html2canvas:{scale:3,useCORS:!0,scrollY:0},jsPDF:{unit:"mm",format:"letter",orientation:"portrait"},pagebreak:{mode:["avoid-all","css","legacy"]}}).from(e).save()}finally{e.classList.remove("pdf-mode")}}const PRINT_CSS=`
@page{
    size:A4;
    margin:2mm;
}


}
:root{

    /* Colors */
    --primary-color:#2a019b;
    --secondary-color:#8af1ff;
    --table-header-bg:#cdf9ff;

    --resume-bg:#ffffff;
    --text-color:#000000;

    --button-bg:#0d6efd;
    --button-text:#ffffff;

    --download-bg:#010057;
    --download-hover:#003010;

    /* Sizes */
    --page-width:230mm;
    --page-height:277mm;

    --photo-width:100px;
    --photo-height:120px;

    --title-size:28px;
    --body-font-size:16px;

    /* Borders */
    --resume-border-width:1px;
    --resume-border-color:#8af1ff;

    --table-border-color:#8af1ff;

    /* Spacing */
    --resume-padding:2mm;
    --resume-border-padding:5mm;

    --section-gap:20px;
    --footer-gap:20px;

    --button-padding:10px 18px;
    --button-radius:5px;

    --table-cell-padding:8px;

    --shadow:0 4px 10px rgba(0,0,0,.15);
}

.pdf-page{
    width:var(--page-width);
    min-height:var(--page-height);
    box-sizing:border-box;
    page-break-after:always;
    margin:auto;
}

.resume{
    width:100%;
    max-width:100%;
    box-sizing:border-box;
    margin:auto;
    background:var(--resume-bg);
    padding:var(--resume-padding);
    padding-bottom:40px;
    border:1px solid var(--resume-bg) !important;
    font-size:var(--body-font-size);
    color:var(--text-color);
}

.resume-border{
    border:var(--resume-border-width) solid var(--resume-border-color);
    padding:var(--resume-border-padding);
}

.title{
    text-align:center;
    font-size:var(--title-size);
    font-weight:bold;
    text-decoration:underline;
    margin-bottom:20px;
}

.resume-header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
}

.info{
    font-weight:bold;
    line-height:1.5;
}

.photo{
    width:var(--photo-width);
    height:var(--photo-height);
    border:1px solid #000;
    object-fit:cover;
}

.resume-section{
    margin-top:var(--section-gap);
}

.resume-section h3{
    border-bottom:1px solid var(--table-border-color);
    padding-bottom:5px;
    margin-bottom:10px;
    color:var(--primary-color);
}

table{
    width:100%;
    border-collapse:collapse;
}

th{
    color:var(--primary-color);
    background:var(--table-header-bg);
}

table th,
table td{
    border:1px solid var(--table-border-color);
    padding:var(--table-cell-padding);
    text-align:center;
}

.personal{
    border:none;
}

.personal td{
    border:none;
    text-align:left;
    padding:5px;
}

.signature{
    margin-top:40px;
    text-align:right;
    font-weight:bold;
}

.print-btn{
    display:block;
    margin:20px auto;
    padding:12px 25px;
    font-size:18px;
    cursor:pointer;
}

.resume-footer{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    margin-top:var(--footer-gap);
    width:100%;
    page-break-inside:avoid;
    break-inside:avoid;
}

hr{
    border:none;
    border-top:1px dotted #000;
    margin:15px 0;
}

.resume-footer .left{
    text-align:left;
}

.resume-footer .right{
    text-align:center;
    min-width:180px;
}

.resume-footer .left,
.resume-footer .right{
    page-break-inside:avoid;
    break-inside:avoid;
}

`;function printResume(){const t=document.querySelector(".resume").outerHTML,e=window.open("","_blank");e.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Resume Print</title>

        <style>
            ${PRINT_CSS}
        </style>

    </head>

    <body>

        ${t}

        <script>
        window.onload=function(){
            window.print();
            window.close();
        }
        <\/script>

    </body>
    </html>
    `),e.document.close()}async function savePDF(){const e=document.querySelector(".resume"),t={margin:10,filename:"resume.pdf",image:{type:"jpeg",quality:1},html2canvas:{scale:2},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}},n=html2pdf().set(t).from(e),s=await n.toPdf().get("pdf"),o=s.output("blob"),i=URL.createObjectURL(o);window.open(i,"_blank")}async function downloadPDF(){const e=document.getElementById("pdfBtn"),t=e.innerHTML;e.innerHTML="Downloading PDF...",e.classList.add("loading");try{const e=document.querySelector(".resume"),t=(data.candidateName||"resume").replace(/\s+/g,"-")+"-resume.pdf";await html2pdf().set({filename:t,margin:[10,10,10,10],image:{type:"jpeg",quality:1},html2canvas:{scale:2,useCORS:!0},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}}).from(e).save()}finally{e.innerHTML=t,e.classList.remove("loading")}}function toggleDownloadMenu(){document.getElementById("downloadOptions").classList.toggle("show")}document.addEventListener("click",function(e){const t=document.querySelector(".download-menu");t.contains(e.target)||document.getElementById("downloadOptions").classList.remove("show")})