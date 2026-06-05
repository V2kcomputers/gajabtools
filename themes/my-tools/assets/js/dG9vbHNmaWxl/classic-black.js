

const resume_id=
new URLSearchParams(
location.search
).get("resume_id");

if(!resume_id){

alert("Invalid resume_id");
location.href="/resume-generator/";

}

const raw=
localStorage.getItem(resume_id);

if(!raw){

alert("Resume Not Found");
location.href="/resume-generator/";

}

const data=
JSON.parse(raw);

// Basic Details

r_name.textContent=
data.candidateName||"";

r_signature.textContent=
data.candidateName||"";

r_address.textContent=
data.address||"";

r_mobile.textContent=
data.mobile||"";

r_email.textContent=
data.email||"";

r_dob.textContent=
data.dob||"";

r_father.textContent=
data.fatherName||"";

r_mother.textContent=
data.motherName||"";

r_gender.textContent=
data.gender||"";

r_nationality.textContent=
data.nationality||"";

r_marital.textContent=
data.maritalStatus||"";

r_language.textContent=
data.language||"";

r_hobbies.textContent=
data.hobbies||"";

r_objective.textContent=
data.objective||"";

r_workExperience.textContent=
data.workExperience||"";

resumeType.textContent=
data.type||"Resume";

r_photo.src=
data.photo||"";


// Academic Qualification

const academicTable=
document.getElementById(
"academicData"
);

data.academic.forEach(item=>{

const tr=
document.createElement("tr");

tr.innerHTML=`
<td>${item.exam}</td>
<td>${item.board}</td>
<td>${item.year}</td>
<td>${item.marks}</td>
<td>${item.division}</td>
`;

academicTable.appendChild(tr);

});


// Professional Qualification

const professionalTable=
document.getElementById(
"professionalData"
);

data.professional.forEach(item=>{

const tr=
document.createElement("tr");

tr.innerHTML=`
<td>${item.exam}</td>
<td>${item.board}</td>
<td>${item.year}</td>
<td>${item.marks}</td>
<td>${item.division}</td>
`;

professionalTable.appendChild(tr);

});


// Extra Qualification

const extraList=
document.getElementById(
"extraQualificationList"
);

data.extraQualifications.forEach(
item=>{

const li=
document.createElement("li");

li.textContent=item;

extraList.appendChild(li);

});



// Edit Resume

function editResume(){

    location.href =
    "/resume-generator/?resume_id=" + resume_id;

}


// Save as Image
async function saveImage(){

    const btn =
    document.getElementById("imgBtn");

    const oldText =
    btn.innerHTML;

    btn.innerHTML =
    "Downloading JPG...";

    btn.classList.add("loading");

    try{

        const resume =
        document.querySelector(".resume");

        const canvas =
        await html2canvas(resume,{
            scale:2,
            useCORS:true
        });

        const link =
        document.createElement("a");

        const fileName =
        (data.candidateName || "resume")
        .replace(/\s+/g,"-")
        + "-resume.jpg";

        link.download =
        fileName;

        link.href =
        canvas.toDataURL(
            "image/jpeg",
            1
        );

        link.click();

    }finally{

        btn.innerHTML =
        oldText;

        btn.classList.remove(
            "loading"
        );

    }

}

// Save as PDF

async function savePDF(){

    const element =
    document.querySelector(".resume");

    // PDF Mode ON
    element.classList.add("pdf-mode");

    const fileName =
    (data.candidateName || "resume")
    .replace(/\s+/g,"-")
    + "-resume.pdf";

    try{

        await html2pdf()
        .set({

            filename:fileName,

           margin:[15,15,15,15],

            image:{
                type:"jpeg",
                quality:1
            },

            html2canvas:{
                scale:3,
                useCORS:true,
                scrollY:0
            },

            jsPDF:{
                unit:"mm",
                format:"letter",
                orientation:"portrait"
            },

            pagebreak:{
                mode:["avoid-all","css","legacy"]
            }

        })
        .from(element)
        .save();

    }finally{

        // PDF Mode OFF
        element.classList.remove("pdf-mode");

    }

}



const PRINT_CSS = `
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
`;


// PRINT

function printResume(){

    const resumeHtml =
    document.querySelector(".resume").outerHTML;

    const printWindow =
    window.open("", "_blank");

    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Resume Print</title>

        <style>
            ${PRINT_CSS}
        </style>

    </head>

    <body>

        ${resumeHtml}

        <script>
        window.onload=function(){
            window.print();
            window.close();
        }
        <\/script>

    </body>
    </html>
    `);

    printWindow.document.close();

}


// PDF

async function savePDF(){

    const element = document.querySelector(".resume");

    const opt = {
        margin: 10,
        filename: "resume.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
        }
    };

    const worker = html2pdf().set(opt).from(element);

    const pdf = await worker.toPdf().get('pdf');

    const blob = pdf.output('blob');

    const url = URL.createObjectURL(blob);

    window.open(url, '_blank');
}

async function downloadPDF(){

    const btn =
    document.getElementById("pdfBtn");

    const oldText =
    btn.innerHTML;

    btn.innerHTML =
    "Downloading PDF...";

    btn.classList.add("loading");

    try{

        const element =
        document.querySelector(".resume");

        const fileName =
        (data.candidateName || "resume")
        .replace(/\s+/g,"-")
        + "-resume.pdf";

        await html2pdf()
        .set({
            filename:fileName,
            margin:[10,10,10,10],
            image:{
                type:"jpeg",
                quality:1
            },
            html2canvas:{
                scale:2,
                useCORS:true
            },
            jsPDF:{
                unit:"mm",
                format:"a4",
                orientation:"portrait"
            }
        })
        .from(element)
        .save();

    }finally{

        btn.innerHTML =
        oldText;

        btn.classList.remove(
            "loading"
        );

    }

}

    function toggleDownloadMenu(){

    document
    .getElementById("downloadOptions")
    .classList
    .toggle("show");

}

document.addEventListener(
"click",
function(e){

    const menu =
    document.querySelector(".download-menu");

    if(!menu.contains(e.target)){

        document
        .getElementById("downloadOptions")
        .classList
        .remove("show");

    }

});

