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
.pdf-page{
    width:190mm;
    min-height:277mm;
    border:2px solid #000;
    box-sizing:border-box;
  
    margin:auto;
    page-break-after:always;
}
.resume{
    max-width:100%;
    margin:auto;
    background:#fff;
    padding:5px;
    border:none;
}
.resume-border{
    border:1px solid rgb(10, 10, 10);
    padding:3mm;
    page-break-after:always;
}
.title{
    text-align:center;
    font-size:28px;
    font-weight:bold;
    text-decoration:underline;
    margin-bottom:10px;
}

.resume-header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
}

.photo{
    width:100px;
    height:120px;
    border:1px solid #000;
    object-fit:cover;
}

.resume-section{
    margin-top: 5px;
    page-break-inside:avoid;
    break-inside:avoid;
}

.resume-section h3{
    border-bottom:1px solid #000;
    padding-bottom:2px;
    margin-bottom:5px;
}

table{
    width:100%;
    border-collapse:collapse;
}

table th,
table td{
    border:1px solid #000;
    padding:8px;
    text-align:center;
}

.personal td{
    border:none;
    text-align:left;
}

.resume-footer{
    display:flex;
    justify-content:space-between;
    margin-top:10px;
    page-break-inside:avoid;
    break-inside:avoid;
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