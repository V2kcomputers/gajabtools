

function addAcademicRow(){

const row=document.createElement("tr");

row.innerHTML=`
<td><input type="text"></td>
<td><input type="text"></td>
<td><input type="text"></td>
<td><input type="text"></td>
<td><input type="text"></td>
<td>
<button type="button"
class="delete-btn"
onclick="this.closest('tr').remove();saveFormData();">
❌
</button>
</td>
`;

document.getElementById("academicTable")
.appendChild(row);
saveFormData();
}

function addProfessionalRow(){

const row=document.createElement("tr");

row.innerHTML=`
<td><input type="text"></td>
<td><input type="text"></td>
<td><input type="text"></td>
<td><input type="text"></td>
<td><input type="text"></td>
<td>
<button type="button"
class="delete-btn"
onclick="this.closest('tr').remove();saveFormData();">
❌
</button>
</td>
`;

document.getElementById("professionalTable")
.appendChild(row);
saveFormData();
}

function addExtraQualification(){

const div=document.createElement("div");

div.className="extra-row";

div.innerHTML=`
<input type="text"
placeholder="Extra Qualification">

<button type="button"
class="delete-btn"
onclick="this.parentElement.remove();saveFormData();">
❌
</button>
`;

document
.getElementById("extraQualificationContainer")
.appendChild(div);
saveFormData();
}

document
.getElementById("photoInput")
.addEventListener("change",function(){

    const file=this.files[0];

    if(!file) return;

    const reader=new FileReader();

    reader.onload=function(e){

        const imageData=e.target.result;

        document.getElementById(
        "preview"
        ).src=imageData;

        saveFormData(); // Photo save

    };

    reader.readAsDataURL(file);

});
const photoInput =
document.getElementById("photoInput");

const preview =
document.getElementById("preview");

const dropArea =
document.getElementById("photoDropArea");


// Preview Click
preview.addEventListener("click",()=>{

    photoInput.click();

});


// Drop Area Click
dropArea.addEventListener("click",()=>{

    photoInput.click();

});


// File Input Upload
photoInput.addEventListener(
"change",
function(){

    if(this.files[0]){
        loadPhoto(this.files[0]);
    }

});


// Drag Enter
dropArea.addEventListener(
"dragover",
e=>{

    e.preventDefault();

    dropArea.classList.add(
    "dragover"
    );

});


// Drag Leave
dropArea.addEventListener(
"dragleave",
()=>{

    dropArea.classList.remove(
    "dragover"
    );

});


// Drop
dropArea.addEventListener(
"drop",
e=>{

    e.preventDefault();

    dropArea.classList.remove(
    "dragover"
    );

    const file =
    e.dataTransfer.files[0];

    if(
    file &&
    file.type.startsWith(
    "image/"
    )
    ){
        loadPhoto(file);
    }

});


// Paste Image
document.addEventListener(
"paste",
e=>{

    const items =
    e.clipboardData.items;

    for(
    let item of items
    ){

        if(
        item.type.startsWith(
        "image/"
        )
        ){

            const file =
            item.getAsFile();

            loadPhoto(file);

            break;
        }

    }

});


// Load Image
function loadPhoto(file){

    const reader =
    new FileReader();

    reader.onload =
    function(e){

        preview.src =
        e.target.result;

        saveFormData();

    };

    reader.readAsDataURL(
    file
    );

}

function generateResume(){

    const academic = [];
    document.querySelectorAll("#academicTable tr").forEach((row,index)=>{
        if(index===0) return;

        const inputs=row.querySelectorAll("input");

        if(inputs.length<5) return;

        academic.push({
            exam:inputs[0].value,
            board:inputs[1].value,
            year:inputs[2].value,
            marks:inputs[3].value,
            division:inputs[4].value
        });
    });

    const professional = [];
    document.querySelectorAll("#professionalTable tr").forEach((row,index)=>{
        if(index===0) return;

        const inputs=row.querySelectorAll("input");

        if(inputs.length<5) return;

        professional.push({
            exam:inputs[0].value,
            board:inputs[1].value,
            year:inputs[2].value,
            marks:inputs[3].value,
            division:inputs[4].value
        });
    });

    const extraQualifications=[];

    document.querySelectorAll(
        "#extraQualificationContainer input"
    ).forEach(input=>{

        if(input.value.trim()){
            extraQualifications.push(
                input.value.trim()
            );
        }

    });

    let objective="";

    if(
        careerObjectiveSelect.value==="custom"
    ){
        objective=careerObjective.value;
    }else{
        objective=careerObjectiveSelect.value;
    }

    const data={

        type:
        document.querySelector(
        'input[name="type"]:checked'
        ).parentElement.textContent.trim(),

        candidateName:
        candidateName.value,

        address:
        address.value,

        mobile:
        mobile.value,

        email:
        email.value,

        dob:
        dob.value,

        fatherName:
        fatherName.value,

        motherName:
        motherName.value,

        gender:
        gender.value,

        nationality:
        nationality.value,

        maritalStatus:
        maritalStatus.value,

        language:
        language.value,

        hobbies:
        hobbies.value,

        objective:
        objective,

        workExperience:
        workExperience.value,

        academic:
        academic,

        professional:
        professional,

        extraQualifications:
        extraQualifications,

        photo:
        document.getElementById(
        "preview"
        ).src

    };

    const resume_id =
    "resume_" +
    Date.now();

    localStorage.setItem(
        resume_id,
        JSON.stringify(data)
    );
const selectedTemplateUrl =
document.querySelector(
'input[name="template"]:checked'
).value;

location.href =
selectedTemplateUrl +
"?resume_id=" +
resume_id;
}



document.querySelectorAll(
'input[name="template"]'
).forEach(radio=>{

    radio.addEventListener("change",function(){

        const url =
        new URL(location.href);

        url.searchParams.set(
            "template",
            this.dataset.slug
        );

        history.replaceState(
            {},
            "",
            url
        );

    });

});



const currentTemplate =
new URLSearchParams(
location.search
).get("template");

if(currentTemplate){

    const radio =
    document.querySelector(
        `input[data-slug="${currentTemplate}"]`
    );

    if(radio){
        radio.checked = true;
    }

}



const objectiveSelect =
document.getElementById("careerObjectiveSelect");

const objectiveTextarea =
document.getElementById("careerObjective");

objectiveSelect.addEventListener("change", function(){

    if(this.value === "custom"){

        objectiveTextarea.style.display = "block";
        objectiveTextarea.value = "";
        objectiveTextarea.focus();

    }else{

        objectiveTextarea.style.display = "none";

        if(this.value){
            objectiveTextarea.value = this.value;
        }

    }

});



;


    function clearForm(){

    if(
        !confirm(
        "Are you sure you want to clear all form data?"
        )
    ){
        return;
    }

    localStorage.removeItem(
    "resumeFormData"
    );

    localStorage.removeItem(
    "resumeDraft"
    );

    location.reload();

}

    function fillExampleData(){

    candidateName.value = "Vikram Singh";
    address.value = "Tikrapara, Raipur, Chhattisgarh";
    mobile.value = "9876543210";
    email.value = "vikram@example.com";
    dob.value = "15-05-1998";

    fatherName.value = "Ramesh Singh";
    motherName.value = "Sushila Singh";

    document.getElementById("gender").value = "male";
document.getElementById("maritalStatus").value = "single";
    nationality.value = "Indian";
   

    updateProfileImage();

    language.value = "Hindi, English";
    hobbies.value = "Reading, Computer, Video Editing";

    careerObjectiveSelect.value = "To obtain a position that allows me to apply my technical and communication skills for organizational growth.";
    careerObjective.value = careerObjectiveSelect.value;

    workExperience.value =
    "2 Years experience in Computer Operator and Web Development.";

    document.querySelectorAll(
    "#academicTable tr:not(:first-child)"
    ).forEach(row=>row.remove());

    document.querySelectorAll(
    "#professionalTable tr:not(:first-child)"
    ).forEach(row=>row.remove());

    document.getElementById(
    "extraQualificationContainer"
    ).innerHTML="";

    // Academic

    addAcademicRow();

    let row =
    document.querySelectorAll(
    "#academicTable tr"
    )[1];

    let inputs =
    row.querySelectorAll("input");

    inputs[0].value="10th";
    inputs[1].value="CBSE";
    inputs[2].value="2014";
    inputs[3].value="78";
    inputs[4].value="First";

    addAcademicRow();

    row =
    document.querySelectorAll(
    "#academicTable tr"
    )[2];

    inputs =
    row.querySelectorAll("input");

    inputs[0].value="12th";
    inputs[1].value="CBSE";
    inputs[2].value="2016";
    inputs[3].value="82";
    inputs[4].value="First";

    addAcademicRow();

    row =
    document.querySelectorAll(
    "#academicTable tr"
    )[3];

    inputs =
    row.querySelectorAll("input");

    inputs[0].value="BCA";
    inputs[1].value="Pt. Ravishankar University";
    inputs[2].value="2019";
    inputs[3].value="75";
    inputs[4].value="First";

    // Professional

    addProfessionalRow();

    row =
    document.querySelectorAll(
    "#professionalTable tr"
    )[1];

    inputs =
    row.querySelectorAll("input");

    inputs[0].value="PGDCA";
    inputs[1].value="Makhanlal University";
    inputs[2].value="2020";
    inputs[3].value="85";
    inputs[4].value="First";

    // Extra Qualification

    addExtraQualification();

    document.querySelector(
    "#extraQualificationContainer input"
    ).value =
    "HTML, CSS, JavaScript";

    addExtraQualification();

    document.querySelectorAll(
    "#extraQualificationContainer input"
    )[1].value =
    "MS Office & Internet";
  
    saveFormData();

}

document.getElementById("gender").addEventListener("change", () => {
    updateProfileImage();
    saveFormData();
});

function updateProfileImage() {
    const gender = document.getElementById("gender").value;
    const preview = document.getElementById("preview");

    preview.src =
        gender === "female"
            ? "/svg/girl.svg"
            : "/svg/man.svg";
}

document.addEventListener("DOMContentLoaded", () => {

    const savedData = JSON.parse(localStorage.getItem("resumeData"));

    if (savedData?.gender) {
        document.getElementById("gender").value = savedData.gender;
    }

    updateProfileImage();

});
function saveFormData() {
    const data = {
        gender: document.getElementById("gender").value
    };

    localStorage.setItem("resumeData", JSON.stringify(data));
}
