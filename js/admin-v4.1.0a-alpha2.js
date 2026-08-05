let rootHandle=null;
let people=[];
let activeTab="photos";
let photoFile=null,photoPreviewUrl=null,editingPhotoId=null;
let documentFile=null,documentPreviewUrl=null,editingDocumentId=null;
let photoSelectedPeople=new Set(),documentSelectedPeople=new Set();
let biographyFactsDraft=[];
let personEditorOpen=false;

const $=id=>document.getElementById(id);
const connectFolder=$("connectFolder"),folderStatus=$("folderStatus"),manager=$("manager"),personSelect=$("personSelect"),personSearch=$("personSearch"),clearPersonSearch=$("clearPersonSearch"),personSearchStatus=$("personSearchStatus");
const newPerson=$("newPerson"),newPhoto=$("newPhoto"),newDocument=$("newDocument"),personSummary=$("personSummary"),photosCount=$("photosCount"),documentsCount=$("documentsCount");
const expedientHeader=$("expedientHeader"),expedientId=$("expedientId"),expedientName=$("expedientName"),expedientLife=$("expedientLife"),expedientMeta=$("expedientMeta"),expedientVisibility=$("expedientVisibility"),expedientPhotos=$("expedientPhotos"),expedientDocuments=$("expedientDocuments"),expedientFacts=$("expedientFacts"),expedientPhotosCount=$("expedientPhotosCount"),expedientDocumentsCount=$("expedientDocumentsCount"),expedientFactsCount=$("expedientFactsCount");
const photoFraming=$("photoFraming"),framingPreviewImage=$("framingPreviewImage"),framingPreviewState=$("framingPreviewState"),framingPreviewName=$("framingPreviewName"),framingPreviewSummary=$("framingPreviewSummary"),photoPositionX=$("photoPositionX"),photoPositionY=$("photoPositionY"),photoPositionXValue=$("photoPositionXValue"),photoPositionYValue=$("photoPositionYValue"),savePhotoPosition=$("savePhotoPosition"),resetPhotoPosition=$("resetPhotoPosition");
const photosTab=$("photosTab"),documentsTab=$("documentsTab"),biographyTab=$("biographyTab"),galleryEmpty=$("galleryEmpty"),photoGallery=$("photoGallery"),documentGallery=$("documentGallery"),biographyPanel=$("biographyPanel"),managerResult=$("managerResult"),factsCount=$("factsCount");
const bioName=$("bioName"),bioBirthDate=$("bioBirthDate"),bioBirthPlace=$("bioBirthPlace"),bioDeathDate=$("bioDeathDate"),bioDeathPlace=$("bioDeathPlace"),bioProfession=$("bioProfession"),bioKnownName=$("bioKnownName"),bioSex=$("bioSex"),bioLifeStatus=$("bioLifeStatus"),bioState=$("bioState"),bioSummary=$("bioSummary"),bioVisible=$("bioVisible"),savePersonalData=$("savePersonalData");
const factsEditorList=$("factsEditorList"),addFact=$("addFact"),saveFacts=$("saveFacts"),biographyResult=$("biographyResult"),dangerZone=$("dangerZone"),deletePersonStatus=$("deletePersonStatus"),deletePerson=$("deletePerson");
const personEditor=$("personEditor"),closePersonEditor=$("closePersonEditor"),cancelPersonEdit=$("cancelPersonEdit"),personIdInput=$("personIdInput"),personNameInput=$("personNameInput"),personKnownNameInput=$("personKnownNameInput"),personSexInput=$("personSexInput"),personLifeStatusInput=$("personLifeStatusInput"),personStateInput=$("personStateInput"),personBirthDateInput=$("personBirthDateInput"),personBirthPlaceInput=$("personBirthPlaceInput"),personDeathDateInput=$("personDeathDateInput"),personDeathPlaceInput=$("personDeathPlaceInput"),personProfessionInput=$("personProfessionInput"),personNotesInput=$("personNotesInput"),personVisibleInput=$("personVisibleInput"),savePerson=$("savePerson"),personEditorResult=$("personEditorResult");
const photoEditor=$("photoEditor"),photoEditorEyebrow=$("photoEditorEyebrow"),photoEditorTitle=$("photoEditorTitle"),closePhotoEditor=$("closePhotoEditor"),cancelPhotoEdit=$("cancelPhotoEdit"),photoFilePickerLabel=$("photoFilePickerLabel"),photoInput=$("photoInput"),photoPreviewWrap=$("photoPreviewWrap"),photoPreview=$("photoPreview"),photoIdInput=$("photoIdInput"),photoTitleInput=$("photoTitleInput"),photoDateInput=$("photoDateInput"),photoPlaceInput=$("photoPlaceInput"),photoDescriptionInput=$("photoDescriptionInput"),photoTagsInput=$("photoTagsInput"),photoPeopleSearch=$("photoPeopleSearch"),photoPeopleChecklist=$("photoPeopleChecklist"),principalInput=$("principalInput"),savePhoto=$("savePhoto"),photoEditorResult=$("photoEditorResult");
const documentEditor=$("documentEditor"),documentEditorEyebrow=$("documentEditorEyebrow"),documentEditorTitle=$("documentEditorTitle"),closeDocumentEditor=$("closeDocumentEditor"),cancelDocumentEdit=$("cancelDocumentEdit"),documentFilePickerLabel=$("documentFilePickerLabel"),documentInput=$("documentInput"),documentPreviewWrap=$("documentPreviewWrap"),documentIdInput=$("documentIdInput"),documentTitleInput=$("documentTitleInput"),documentDateInput=$("documentDateInput"),documentDescriptionInput=$("documentDescriptionInput"),documentPeopleSearch=$("documentPeopleSearch"),documentPeopleChecklist=$("documentPeopleChecklist"),saveDocument=$("saveDocument"),documentEditorResult=$("documentEditorResult");

function stateLabel(state){
  const value=String(state||"").toLowerCase();
  if(value.includes("document"))return"DOCUMENTADO";
  if(value.includes("hipot"))return"HIPÓTESIS";
  if(value.includes("memoria"))return"MEMORIA FAMILIAR";
  if(value.includes("reconst"))return"FAMILIA RECONSTITUIDA";
  return"PENDIENTE";
}

function escapeHtml(value=""){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c])}
function showResult(box,message,error=false){box.innerHTML=message;box.classList.remove("hidden","error");if(error)box.classList.add("error")}
function hideResult(box){box.classList.add("hidden");box.classList.remove("error")}
function currentPerson(){return people.find(p=>p.id===personSelect.value)||null}
function currentPhotos(){const p=currentPerson();return p&&Array.isArray(p.fotografias)?p.fotografias:[]}
function currentDocuments(){const p=currentPerson();return p&&Array.isArray(p.documentos)?p.documentos:[]}
function setManagerEnabled(enabled){manager.classList.toggle("is-disabled",!enabled);manager.setAttribute("aria-disabled",String(!enabled));personSelect.disabled=!enabled;personSearch.disabled=!enabled;clearPersonSearch.disabled=!enabled;updateToolbarButtons()}
function updateToolbarButtons(){const connected=Boolean(rootHandle);const enabled=Boolean(rootHandle&&currentPerson());newPerson.disabled=!connected;newPhoto.disabled=!enabled;newDocument.disabled=!enabled}
function revokeUrl(kind){if(kind==="photo"&&photoPreviewUrl){URL.revokeObjectURL(photoPreviewUrl);photoPreviewUrl=null}if(kind==="document"&&documentPreviewUrl){URL.revokeObjectURL(documentPreviewUrl);documentPreviewUrl=null}}
function sanitizeFilename(name,fallback="archivo"){const dot=name.lastIndexOf(".");const ext=dot>=0?name.slice(dot).toLowerCase():"";const base=(dot>=0?name.slice(0,dot):name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)||fallback;return{base,ext}}
function titleFromFilename(name){const clean=name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ").replace(/\s+/g," ").trim();return clean?clean.charAt(0).toUpperCase()+clean.slice(1):""}
async function getPersonasFile(){const data=await rootHandle.getDirectoryHandle("data");return data.getFileHandle("personas.json")}
async function readPeople(){const handle=await getPersonasFile();const parsed=JSON.parse(await(await handle.getFile()).text());if(!Array.isArray(parsed))throw new Error("El archivo personas.json no contiene una lista válida.");return parsed}
async function writePeople(){const handle=await getPersonasFile();const writable=await handle.createWritable();await writable.write(JSON.stringify(people,null,2)+"\n");await writable.close()}
async function ensureAssetDirectory(type,personId){const assets=await rootHandle.getDirectoryHandle("assets");const group=await assets.getDirectoryHandle(type,{create:true});return group.getDirectoryHandle(personId,{create:true})}
async function uniqueFilename(dir,original,fallback){const{base,ext}=sanitizeFilename(original,fallback);let candidate=base+ext,n=2;while(true){try{await dir.getFileHandle(candidate);candidate=`${base}-${n}${ext}`;n++}catch(err){if(err.name==="NotFoundError")return candidate;throw err}}}
async function getFileFromPath(path){const parts=String(path||"").split("/").filter(Boolean);let dir=rootHandle;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i]);return(await dir.getFileHandle(parts.at(-1))).getFile()}
async function deleteFileFromPath(path){const parts=String(path||"").split("/").filter(Boolean);let dir=rootHandle;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i]);await dir.removeEntry(parts.at(-1))}
async function writeFile(dir,name,file){const handle=await dir.getFileHandle(name,{create:true});const writable=await handle.createWritable();await writable.write(file);await writable.close()}
let pdfjsPromise=null;
async function loadPdfJs(){if(!pdfjsPromise)pdfjsPromise=import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs").then(pdfjs=>{pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";return pdfjs});return pdfjsPromise}
function isPdf(docOrFile){const type=(docOrFile?.formato||docOrFile?.type||"").toLowerCase();const name=(docOrFile?.nombre_archivo||docOrFile?.name||docOrFile?.src||"").toLowerCase();return type.includes("pdf")||name.endsWith(".pdf")}
async function canvasToWebp(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("No se pudo generar la imagen de página.")),"image/webp",.88))}
async function removeDirectoryFromPath(path){const parts=String(path||"").split("/").filter(Boolean);let dir=rootHandle;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i]);await dir.removeEntry(parts.at(-1),{recursive:true})}
async function generatePdfPages(doc,file,ownerId,onProgress=()=>{}){
  const pdfjs=await loadPdfJs(); const data=await file.arrayBuffer(); const pdf=await pdfjs.getDocument({data}).promise;
  const ownerDir=await ensureAssetDirectory("documentos",ownerId); const folderName=`${doc.id.toLowerCase()}-paginas`;
  try{await ownerDir.removeEntry(folderName,{recursive:true})}catch(err){if(err.name!=="NotFoundError")throw err}
  const pagesDir=await ownerDir.getDirectoryHandle(folderName,{create:true}); const paths=[];
  for(let n=1;n<=pdf.numPages;n++){
    onProgress(n,pdf.numPages); const page=await pdf.getPage(n); const baseViewport=page.getViewport({scale:1});
    const scale=Math.min(2.2,1800/baseViewport.width); const viewport=page.getViewport({scale});
    const canvas=document.createElement("canvas"); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext("2d",{alpha:false}); ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:ctx,viewport}).promise; const blob=await canvasToWebp(canvas);
    const filename=`pagina-${String(n).padStart(3,"0")}.webp`; await writeFile(pagesDir,filename,blob);
    paths.push(`assets/documentos/${ownerId}/${folderName}/${filename}`); canvas.width=canvas.height=1;
  }
  return paths;
}


function nextPersonId(){
  let max=0;
  for(const person of people){
    const match=String(person.id||"").match(/^P(\d+)$/i);
    if(match)max=Math.max(max,Number(match[1]));
  }
  return `P${String(max+1).padStart(5,"0")}`;
}

function nextId(prefix,field){let max=0;for(const person of people)for(const item of(person[field]||[])){const m=String(item.id||"").match(new RegExp(`^${prefix}(\\d+)$`));if(m)max=Math.max(max,Number(m[1]))}return `${prefix}${String(max+1).padStart(6,"0")}`}
function nextPhotoId(){return nextId("F","fotografias")}
function nextDocumentId(){return nextId("D","documentos")}

function ensureData(){
  normalizeShared("fotografias","F",["etiquetas"]);
  normalizeShared("documentos","D",[]);
}
function normalizeShared(field,prefix,arrayFields){
  const bySrc=new Map();
  for(const person of people){
    if(!Array.isArray(person[field]))person[field]=[];
    for(const item of person[field]){
      if(!item.id)item.id=bySrc.get(item.src)||nextId(prefix,field);
      if(item.src)bySrc.set(item.src,item.id);
      if(!Array.isArray(item.personas))item.personas=[person.id];
      if(!item.personas.includes(person.id))item.personas.push(person.id);
      for(const key of arrayFields)if(!Array.isArray(item[key]))item[key]=[];
    }
  }
  const linked=new Map();
  for(const person of people)for(const item of(person[field]||[])){
    if(!linked.has(item.id))linked.set(item.id,new Set());
    linked.get(item.id).add(person.id);for(const id of(item.personas||[]))linked.get(item.id).add(id);
  }
  for(const person of people)for(const item of(person[field]||[]))item.personas=[...(linked.get(item.id)||new Set([person.id]))];
}
function normalizedSearchText(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/\s+/g," ").trim()}
function filteredPeopleForAdmin(){const q=normalizedSearchText(personSearch.value);const sorted=[...people].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));if(!q)return sorted;return sorted.filter(p=>[p.id,p.nombre,p.nombre_conocido,p.nombreConocido,p.profesion,p.lugar_nacimiento,p.lugar_defuncion].map(normalizedSearchText).join(" ").includes(q))}
function populatePeople(preserveSelection=true){const previous=preserveSelection?personSelect.value:"";const list=filteredPeopleForAdmin();personSelect.innerHTML='<option value="">Selecciona una persona…</option>'+list.map(p=>{const hidden=p.visible===false?" · OCULTA":"";const known=p.nombre_conocido||p.nombreConocido;const knownText=known?` · “${known}”`:"";return `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre)}${escapeHtml(knownText)} · ${escapeHtml(p.id)}${hidden}</option>`}).join("");if(previous&&list.some(p=>p.id===previous))personSelect.value=previous;else if(previous){personSelect.value="";closeEditors();renderManager()}const q=personSearch.value.trim();personSearchStatus.textContent=q?`${list.length} coincidencia${list.length===1?"":"s"} de ${people.length} personas.`:`${people.length} persona${people.length===1?"":"s"} disponibles en Administración.`}
function copies(field,id){const result=[];for(const person of people){const index=(person[field]||[]).findIndex(x=>x.id===id);if(index>=0)result.push({person,index,item:person[field][index]})}return result}
function canonical(field,id){return copies(field,id)[0]?.item||null}
function syncAssociations(field,itemData,personIds){const wanted=new Set(personIds);for(const person of people){if(!Array.isArray(person[field]))person[field]=[];const index=person[field].findIndex(x=>x.id===itemData.id);if(wanted.has(person.id)){const copy={...itemData,personas:[...wanted]};if(Array.isArray(itemData.etiquetas))copy.etiquetas=[...itemData.etiquetas];if(index>=0)person[field][index]=copy;else person[field].push(copy)}else if(index>=0){person[field].splice(index,1);if(field==="fotografias"&&person.fotografia_principal===itemData.src)person.fotografia_principal=person.fotografias[0]?.src||""}}}

function renderChecklist(kind,selectedIds=null){
  const search=kind==="photo"?photoPeopleSearch:documentPeopleSearch;
  const box=kind==="photo"?photoPeopleChecklist:documentPeopleChecklist;
  if(selectedIds!==null){if(kind==="photo")photoSelectedPeople=new Set(selectedIds);else documentSelectedPeople=new Set(selectedIds)}
  const selected=kind==="photo"?photoSelectedPeople:documentSelectedPeople;
  const q=search.value.trim().toLocaleLowerCase("es");
  const visible=[...people].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).filter(p=>!q||p.nombre.toLocaleLowerCase("es").includes(q)||p.id.toLowerCase().includes(q));
  box.innerHTML=visible.length?visible.map(p=>`<label class="person-check"><input type="checkbox" value="${escapeHtml(p.id)}" ${selected.has(p.id)?"checked":""}><span>${escapeHtml(p.nombre)}<small>${escapeHtml(p.id)}</small></span></label>`).join(""):'<div class="people-empty">No se han encontrado personas.</div>';
}
function selectFromChecklist(kind,event){const input=event.target.closest('input[type="checkbox"]');if(!input)return;const selected=kind==="photo"?photoSelectedPeople:documentSelectedPeople;if(input.checked)selected.add(input.value);else selected.delete(input.value);updateSaveStates()}

function switchTab(tab){
  const documentEmptyState=galleryEmpty;
  if(tab==="biography" && documentEmptyState){
    documentEmptyState.classList.add("hidden");
  }

  activeTab=tab;
  photosTab.classList.toggle("active",tab==="photos");
  documentsTab.classList.toggle("active",tab==="documents");
  biographyTab.classList.toggle("active",tab==="biography");
  photosTab.setAttribute("aria-selected",String(tab==="photos"));
  documentsTab.setAttribute("aria-selected",String(tab==="documents"));
  biographyTab.setAttribute("aria-selected",String(tab==="biography"));
  photoGallery.classList.toggle("hidden",tab!=="photos");
  documentGallery.classList.toggle("hidden",tab!=="documents");
  biographyPanel.classList.toggle("hidden",tab!=="biography");
  closeEditors();
  renderManager();
}
async function loadCardImage(img,path){try{const file=await getFileFromPath(path);const url=URL.createObjectURL(file);img.src=url;img.onload=()=>URL.revokeObjectURL(url)}catch{img.replaceWith(Object.assign(document.createElement("span"),{textContent:"Archivo no encontrado"}))}}
function documentFormat(doc){const name=doc.nombre_archivo||doc.src||"";const ext=name.split(".").pop()?.toUpperCase()||"ARCHIVO";return ext.slice(0,8)}
function isImageDocument(doc){return /\.(jpe?g|png|webp)$/i.test(doc.src||doc.nombre_archivo||"")}


function parsePhotoPosition(person){
  const raw=String(person?.fotoPosicion||"").trim();
  const match=raw.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if(!match)return{x:50,y:50};
  return{
    x:Math.min(100,Math.max(0,Number(match[1]))),
    y:Math.min(100,Math.max(0,Number(match[2])))
  };
}

function updateFramingPreview(){
  const person=currentPerson();
  if(!person||!person.fotografia_principal)return;
  const x=Number(photoPositionX.value);
  const y=Number(photoPositionY.value);
  framingPreviewImage.style.objectPosition=`${x}% ${y}%`;
  photoPositionXValue.textContent=`${x}%`;
  photoPositionYValue.textContent=`${y}%`;
}

async function renderPhotoFraming(person){
  if(!person||!person.fotografia_principal){
    photoFraming.classList.add("hidden");
    framingPreviewImage.removeAttribute("src");
    return;
  }

  const position=parsePhotoPosition(person);
  photoPositionX.value=String(position.x);
  photoPositionY.value=String(position.y);
  framingPreviewName.textContent=person.nombre||"";
  framingPreviewSummary.textContent=person.datos_resumen||person.rol||"";
  framingPreviewState.textContent=stateLabel(person.estado);

  try{
    const file=await getFileFromPath(person.fotografia_principal);
    const url=URL.createObjectURL(file);
    const previous=framingPreviewImage.dataset.objectUrl;
    if(previous)URL.revokeObjectURL(previous);
    framingPreviewImage.dataset.objectUrl=url;
    framingPreviewImage.src=url;
  }catch{
    framingPreviewImage.removeAttribute("src");
  }

  updateFramingPreview();
  photoFraming.classList.remove("hidden");
}


function normalizeStateValue(value){
  const text=String(value||"").toLowerCase();
  if(text.includes("document"))return"documentado";
  if(text.includes("memoria"))return"memoria familiar";
  if(text.includes("hipot"))return"hipótesis";
  if(text.includes("reconst"))return"familia reconstituida";
  return"pendiente";
}

function factTypeValue(value){
  const text=String(value||"").toLowerCase();
  if(text.includes("document"))return"documentado";
  if(text.includes("hipot"))return"hipótesis";
  return"memoria familiar";
}

function readFactsFromEditor(){
  return [...factsEditorList.querySelectorAll(".fact-editor-row")].map(row=>({
    tipo:row.querySelector("[data-fact-type]").value,
    texto:row.querySelector("[data-fact-text]").value.trim()
  })).filter(item=>item.texto);
}

function renderFactsEditor(){
  factsCount.textContent=String(biographyFactsDraft.length);
  if(!biographyFactsDraft.length){
    factsEditorList.innerHTML='<div class="bio-empty">Todavía no hay afirmaciones biográficas. Pulsa «Añadir evidencia» para crear la primera.</div>';
    return;
  }

  factsEditorList.innerHTML=biographyFactsDraft.map((fact,index)=>`
    <article class="fact-editor-row" data-fact-index="${index}">
      <div class="fact-editor-main">
        <label>Tipo
          <select data-fact-type>
            <option value="documentado" ${factTypeValue(fact.tipo)==="documentado"?"selected":""}>Documentado</option>
            <option value="memoria familiar" ${factTypeValue(fact.tipo)==="memoria familiar"?"selected":""}>Memoria familiar</option>
            <option value="hipótesis" ${factTypeValue(fact.tipo)==="hipótesis"?"selected":""}>Hipótesis</option>
          </select>
        </label>
        <label class="fact-text-label">Texto
          <textarea data-fact-text rows="3" placeholder="Describe el dato o recuerdo.">${escapeHtml(fact.texto||"")}</textarea>
        </label>
      </div>
      <div class="fact-editor-actions">
        <button type="button" class="secondary" data-fact-action="up" ${index===0?"disabled":""} aria-label="Subir evidencia">↑</button>
        <button type="button" class="secondary" data-fact-action="down" ${index===biographyFactsDraft.length-1?"disabled":""} aria-label="Bajar evidencia">↓</button>
        <button type="button" class="danger" data-fact-action="delete">Eliminar</button>
      </div>
    </article>
  `).join("");
}


function arrayLength(value){
  return Array.isArray(value) ? value.length : 0;
}

function meaningfulText(value){
  return String(value||"").trim().length>0;
}

function relationDependencies(person){
  const id=person.id;

  const directFather=meaningfulText(person.padre)?1:0;
  const directMother=meaningfulText(person.madre)?1:0;
  const legacyParents=arrayLength(person.padres);

  const spouses=new Set([
    ...(Array.isArray(person.conyuges)?person.conyuges:[]),
    ...(Array.isArray(person.conyuge)?person.conyuge:[])
  ].filter(Boolean));

  const directChildren=people.filter(candidate =>
    candidate.id!==id && (
      candidate.padre===id ||
      candidate.madre===id ||
      (Array.isArray(candidate.padres)&&candidate.padres.includes(id))
    )
  ).length;

  const legacyChildren=new Set(
    Array.isArray(person.hijos)?person.hijos.filter(Boolean):[]
  );

  const referencedAsSpouse=people.filter(candidate =>
    candidate.id!==id &&
    (
      (Array.isArray(candidate.conyuges)&&candidate.conyuges.includes(id)) ||
      (Array.isArray(candidate.conyuge)&&candidate.conyuge.includes(id))
    )
  );

  for(const candidate of referencedAsSpouse)spouses.add(candidate.id);

  return {
    father:directFather,
    mother:directMother,
    legacyParents,
    spouses:spouses.size,
    children:Math.max(directChildren,legacyChildren.size)
  };
}

function personDeletionDependencies(person){
  const relations=relationDependencies(person);
  const notes=[
    person.notas,
    person.datos_resumen,
    person.nombre_conocido,
    person.nombreConocido,
    person.profesion,
    person.fecha_nacimiento,
    person.lugar_nacimiento,
    person.fecha_defuncion,
    person.lugar_defuncion
  ].some(meaningfulText)?1:0;

  return {
    photographs:arrayLength(person.fotografias),
    documents:arrayLength(person.documentos),
    facts:arrayLength(person.hechos),
    father:relations.father,
    mother:relations.mother,
    legacyParents:relations.legacyParents,
    spouses:relations.spouses,
    children:relations.children,
    biography:notes
  };
}

function deletionBlockers(person){
  const d=personDeletionDependencies(person);
  return [
    ["Fotografías",d.photographs],
    ["Documentos",d.documents],
    ["Evidencias",d.facts],
    ["Datos biográficos",d.biography],
    ["Padre",d.father],
    ["Madre",d.mother],
    ["Progenitores heredados",d.legacyParents],
    ["Cónyuges",d.spouses],
    ["Hijos",d.children]
  ].filter(([,count])=>count>0);
}

function renderDangerZone(person){
  if(!person){
    dangerZone.classList.add("hidden");
    deletePerson.disabled=true;
    deletePersonStatus.innerHTML="";
    return;
  }

  dangerZone.classList.remove("hidden");
  const blockers=deletionBlockers(person);

  if(blockers.length){
    deletePerson.disabled=true;
    deletePersonStatus.innerHTML=`
      <div class="delete-blocked">
        <strong>Esta persona no puede eliminarse.</strong>
        <p>Primero debes eliminar o desvincular la información asociada:</p>
        <ul>${blockers.map(([label,count])=>`<li><span>${escapeHtml(label)}</span><b>${count}</b></li>`).join("")}</ul>
        <p class="delete-hint">Puedes desmarcar «Visible en el archivo público» para ocultarla sin perder información.</p>
      </div>`;
  }else{
    deletePerson.disabled=false;
    deletePersonStatus.innerHTML=`
      <div class="delete-allowed">
        <strong>Esta persona puede eliminarse.</strong>
        <p>No tiene fotografías, documentos, evidencias, datos biográficos ni relaciones familiares asociadas.</p>
      </div>`;
  }
}

function renderBiographyPanel(person){
  if(!person)return;
  personalName.value=person.nombre||"";
  personalBirthDate.value=person.fecha_nacimiento||"";
  personalBirthPlace.value=person.lugar_nacimiento||"";
  personalDeathDate.value=person.fecha_defuncion||"";
  personalDeathPlace.value=person.lugar_defuncion||"";
  personalProfession.value=person.profesion||"";
  personalKnownName.value=person.nombre_conocido||person.nombreConocido||"";
  personalSex.value=person.sexo||"desconocido";
  personalLifeStatus.value=person.situacion_vital||"desconocida";
  personalInformationStatus.value=person.estado_informacion||"documentado";
  personalVisible.checked=person.visible!==false;
  personalNotes.value=person.notas||"";

  if(!person)return;
  bioName.value=person.nombre||"";
  bioBirthDate.value=person.fecha_nacimiento||"";
  bioBirthPlace.value=person.lugar_nacimiento||"";
  bioDeathDate.value=person.fecha_defuncion||"";
  bioDeathPlace.value=person.lugar_defuncion||"";
  bioProfession.value=person.profesion||"";
  bioKnownName.value=person.nombre_conocido||person.nombreConocido||"";
  bioSex.value=person.sexo||"";
  bioLifeStatus.value=person.situacion_vital||person.situacionVital||"desconocido";
  bioState.value=normalizeStateValue(person.estado);
  bioSummary.value=person.notas||person.datos_resumen||"";
  bioVisible.checked=person.visible!==false;
  biographyFactsDraft=(Array.isArray(person.hechos)?person.hechos:[]).map(item=>({
    tipo:factTypeValue(item?.tipo),
    texto:String(item?.texto||"")
  }));
  renderFactsEditor();
  renderDangerZone(person);
}


function extractYear(value){const m=String(value||"").match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/g);return m?.length?m[m.length-1]:""}
function expedientLifeText(person){const b=extractYear(person.fecha_nacimiento),d=extractYear(person.fecha_defuncion);if(b&&d)return `${b} – ${d}`;if(b&&person.situacion_vital==="vivo")return `${b} –`;if(b)return `n. ${b}`;if(d)return `† ${d}`;if(person.situacion_vital==="vivo")return "Persona viva";if(person.situacion_vital==="fallecido")return "Persona fallecida";return "Fechas no documentadas"}
function renderExpedientHeader(person){
  if(!person){expedientHeader.classList.add("hidden");return}
  const photos=Array.isArray(person.fotografias)?person.fotografias.length:0;
  const docs=Array.isArray(person.documentos)?person.documentos.length:0;
  const facts=Array.isArray(person.hechos)?person.hechos.length:0;
  expedientId.textContent=person.id||"—";
  expedientName.textContent=person.nombre||"Persona sin nombre";
  expedientLife.textContent=expedientLifeText(person);
  const meta=[person.lugar_nacimiento,person.profesion].filter(Boolean).join(" · ");
  expedientMeta.textContent=meta;expedientMeta.classList.toggle("hidden",!meta);
  const visible=person.visible!==false;
  expedientVisibility.textContent=visible?"Visible":"No visible";
  expedientVisibility.classList.toggle("visible",visible);
  expedientVisibility.classList.toggle("not-visible",!visible);
  expedientPhotosCount.textContent=photos;expedientDocumentsCount.textContent=docs;expedientFactsCount.textContent=facts;
  expedientHeader.classList.remove("hidden");
}

async function renderManager(){
  hideResult(managerResult);photoGallery.innerHTML="";documentGallery.innerHTML="";updateToolbarButtons();
  const person=currentPerson();
  if(!person){renderExpedientHeader(null);personSummary.classList.add("hidden");photoFraming.classList.add("hidden");biographyPanel.classList.add("hidden");dangerZone.classList.add("hidden");photosCount.textContent="0";documentsCount.textContent="0";factsCount.textContent="0";galleryEmpty.textContent="Selecciona una persona para gestionar su archivo.";galleryEmpty.classList.remove("hidden");return}
  renderExpedientHeader(person);
  const photos=currentPhotos(),docs=currentDocuments();photosCount.textContent=photos.length;documentsCount.textContent=docs.length;
  personSummary.innerHTML=`<div><div class="person-summary-title"><h3>${escapeHtml(person.nombre)}</h3>${person.visible===false?'<span class="hidden-person-badge">No visible</span>':""}</div><p>${escapeHtml(person.id)} · ${photos.length} fotografía${photos.length===1?"":"s"} · ${docs.length} documento${docs.length===1?"":"s"} · ${(person.hechos||[]).length} evidencia${(person.hechos||[]).length===1?"":"s"}</p></div>`;personSummary.classList.remove("hidden");await renderPhotoFraming(person);renderBiographyPanel(person);biographyPanel.classList.toggle("hidden",activeTab!=="biography");
  const items=activeTab==="photos"?photos:docs;
  if(!items.length){galleryEmpty.textContent=activeTab==="photos"?"Esta persona todavía no tiene fotografías.":"Esta persona todavía no tiene documentos archivados.";galleryEmpty.classList.remove("hidden")}else galleryEmpty.classList.add("hidden");
  if(activeTab==="photos"){
    photos.forEach((photo,index)=>{const principal=person.fotografia_principal===photo.src,linked=new Set(photo.personas||[person.id]).size;const card=document.createElement("article");card.className="photo-card";card.innerHTML=`<div class="photo-thumb"><img alt="${escapeHtml(photo.titulo||"Fotografía")}"></div><div class="photo-body">${principal?'<span class="principal-badge">★ Principal</span>':""}${linked>1?`<span class="shared-badge">👥 ${linked} personas</span>`:""}<span class="photo-id">${escapeHtml(photo.id||"")}</span><h4>${escapeHtml(photo.titulo||"Sin título")}</h4><p class="photo-meta">${escapeHtml([photo.fecha,photo.lugar].filter(Boolean).join(" · ")||"Sin fecha ni lugar")}</p><div class="card-actions"><button class="small-button" data-photo-action="edit" data-index="${index}">Editar</button>${principal?"":`<button class="small-button" data-photo-action="principal" data-index="${index}">Principal</button>`}<button class="small-button danger" data-photo-action="delete" data-index="${index}">Eliminar</button><span class="order-actions"><button class="small-button" data-photo-action="up" data-index="${index}" ${index===0?"disabled":""}>↑</button><button class="small-button" data-photo-action="down" data-index="${index}" ${index===photos.length-1?"disabled":""}>↓</button></span></div></div>`;photoGallery.appendChild(card);loadCardImage(card.querySelector("img"),photo.src)})
  }else{
    docs.forEach((doc,index)=>{const linked=new Set(doc.personas||[person.id]).size;const card=document.createElement("article");card.className="document-card";const thumb=isImageDocument(doc)?`<div class="document-thumb"><img alt="${escapeHtml(doc.titulo||"Documento")}"><span class="document-format">${escapeHtml(documentFormat(doc))}</span></div>`:`<div class="document-thumb"><span class="document-icon">📄</span><span class="document-format">${escapeHtml(documentFormat(doc))}</span></div>`;card.innerHTML=`${thumb}<div class="document-body">${linked>1?`<span class="shared-badge">👥 ${linked} personas</span>`:""}<span class="document-id">${escapeHtml(doc.id||"")}</span><h4>${escapeHtml(doc.titulo||"Sin título")}</h4><p class="document-meta">${escapeHtml(doc.fecha||"Sin fecha")}</p>${doc.descripcion?`<p class="document-description">${escapeHtml(doc.descripcion)}</p>`:""}<div class="card-actions"><button class="small-button" data-document-action="open" data-index="${index}">Abrir</button>${isPdf(doc)?`<button class="small-button" data-document-action="generate" data-index="${index}">${Array.isArray(doc.paginas)&&doc.paginas.length?"Regenerar vista":"Generar vista"}</button>`:""}<button class="small-button" data-document-action="edit" data-index="${index}">Editar</button><button class="small-button danger" data-document-action="delete" data-index="${index}">Eliminar</button><span class="order-actions"><button class="small-button" data-document-action="up" data-index="${index}" ${index===0?"disabled":""}>↑</button><button class="small-button" data-document-action="down" data-index="${index}" ${index===docs.length-1?"disabled":""}>↓</button></span></div></div>`;documentGallery.appendChild(card);if(isImageDocument(doc))loadCardImage(card.querySelector("img"),doc.src)})
  }
}


function resetPersonEditor(){
  personIdInput.value=nextPersonId();
  personNameInput.value="";
  personKnownNameInput.value="";
  personSexInput.value="";
  personLifeStatusInput.value="desconocido";
  personStateInput.value="pendiente";
  personBirthDateInput.value="";
  personBirthPlaceInput.value="";
  personDeathDateInput.value="";
  personDeathPlaceInput.value="";
  personProfessionInput.value="";
  personNotesInput.value="";
  personVisibleInput.checked=true;
  hideResult(personEditorResult);
  updatePersonSaveState();
}

function updatePersonSaveState(){
  savePerson.disabled=!(rootHandle&&personNameInput.value.trim());
}

function openNewPerson(){
  closeEditors();
  resetPersonEditor();
  personEditorOpen=true;
  personEditor.classList.remove("hidden");
  personEditor.setAttribute("aria-hidden","false");
  personEditor.scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>personNameInput.focus(),250);
}

function closePersonPanel(){
  personEditorOpen=false;
  personEditor.classList.add("hidden");
  personEditor.setAttribute("aria-hidden","true");
}

function possibleDuplicateNames(name){
  const normalized=String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/\s+/g," ").trim();
  if(!normalized)return[];
  return people.filter(person=>{
    const candidate=String(person.nombre||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/\s+/g," ").trim();
    return candidate===normalized;
  });
}

function resetPhotoEditor(){editingPhotoId=null;photoFile=null;photoInput.value="";photoIdInput.value=nextPhotoId();photoTitleInput.value="";photoDateInput.value="";photoPlaceInput.value="";photoDescriptionInput.value="";photoTagsInput.value="";photoPeopleSearch.value="";renderChecklist("photo",currentPerson()?[currentPerson().id]:[]);principalInput.checked=false;photoFilePickerLabel.classList.remove("hidden");revokeUrl("photo");photoPreview.removeAttribute("src");photoPreviewWrap.classList.add("hidden");hideResult(photoEditorResult);updateSaveStates()}
function openNewPhoto(){closeDocumentPanel();resetPhotoEditor();photoEditorEyebrow.textContent="Nueva fotografía";photoEditorTitle.textContent="Añadir fotografía";photoEditor.classList.remove("hidden");photoEditor.setAttribute("aria-hidden","false");photoEditor.scrollIntoView({behavior:"smooth",block:"start"})}
async function openEditPhoto(index){const person=currentPerson(),photo=currentPhotos()[index];if(!person||!photo)return;resetPhotoEditor();editingPhotoId=photo.id;photoEditorEyebrow.textContent="Editar fotografía";photoEditorTitle.textContent=photo.titulo||"Fotografía";photoIdInput.value=photo.id;photoTitleInput.value=photo.titulo||"";photoDateInput.value=photo.fecha||"";photoPlaceInput.value=photo.lugar||"";photoDescriptionInput.value=photo.descripcion||"";photoTagsInput.value=(photo.etiquetas||[]).join(", ");renderChecklist("photo",photo.personas||[person.id]);principalInput.checked=person.fotografia_principal===photo.src;photoFilePickerLabel.classList.add("hidden");try{const f=await getFileFromPath(photo.src);photoPreviewUrl=URL.createObjectURL(f);photoPreview.src=photoPreviewUrl;photoPreviewWrap.classList.remove("hidden")}catch{showResult(photoEditorResult,"La imagen física no se ha encontrado, pero puedes editar sus datos.",true)}photoEditor.classList.remove("hidden");photoEditor.setAttribute("aria-hidden","false");updateSaveStates();photoEditor.scrollIntoView({behavior:"smooth",block:"start"})}
function closePhotoPanel(){revokeUrl("photo");photoEditor.classList.add("hidden");photoEditor.setAttribute("aria-hidden","true")}

function resetDocumentEditor(){editingDocumentId=null;documentFile=null;documentInput.value="";documentIdInput.value=nextDocumentId();documentTitleInput.value="";documentDateInput.value="";documentDescriptionInput.value="";documentPeopleSearch.value="";renderChecklist("document",currentPerson()?[currentPerson().id]:[]);documentFilePickerLabel.classList.remove("hidden");revokeUrl("document");documentPreviewWrap.innerHTML="";documentPreviewWrap.classList.add("hidden");hideResult(documentEditorResult);updateSaveStates()}
function renderDocumentPreview(file,url){documentPreviewWrap.innerHTML="";documentPreviewWrap.classList.remove("hidden");if(file.type.startsWith("image/")){const img=document.createElement("img");img.src=url;img.alt="Vista previa del documento";documentPreviewWrap.appendChild(img)}else if(file.type==="application/pdf"){const iframe=document.createElement("iframe");iframe.src=url;iframe.title="Vista previa del PDF";documentPreviewWrap.appendChild(iframe)}else{documentPreviewWrap.innerHTML=`<div class="file-summary"><span class="document-icon">📄</span><strong>${escapeHtml(file.name)}</strong><small>${Math.ceil(file.size/1024)} KB</small></div>`}}
function openNewDocument(){closePhotoPanel();resetDocumentEditor();documentEditorEyebrow.textContent="Nuevo documento";documentEditorTitle.textContent="Archivar documento";documentEditor.classList.remove("hidden");documentEditor.setAttribute("aria-hidden","false");documentEditor.scrollIntoView({behavior:"smooth",block:"start"})}
async function openEditDocument(index){const person=currentPerson(),doc=currentDocuments()[index];if(!person||!doc)return;resetDocumentEditor();editingDocumentId=doc.id;documentEditorEyebrow.textContent="Editar documento";documentEditorTitle.textContent=doc.titulo||"Documento";documentIdInput.value=doc.id;documentTitleInput.value=doc.titulo||"";documentDateInput.value=doc.fecha||"";documentDescriptionInput.value=doc.descripcion||"";renderChecklist("document",doc.personas||[person.id]);documentFilePickerLabel.classList.add("hidden");try{const file=await getFileFromPath(doc.src);documentPreviewUrl=URL.createObjectURL(file);renderDocumentPreview(file,documentPreviewUrl)}catch{showResult(documentEditorResult,"El archivo físico no se ha encontrado, pero puedes editar sus datos.",true)}documentEditor.classList.remove("hidden");documentEditor.setAttribute("aria-hidden","false");updateSaveStates();documentEditor.scrollIntoView({behavior:"smooth",block:"start"})}
function closeDocumentPanel(){revokeUrl("document");documentEditor.classList.add("hidden");documentEditor.setAttribute("aria-hidden","true")}
function closeEditors(){closePersonPanel();closePhotoPanel();closeDocumentPanel()}
function updateSaveStates(){savePhoto.disabled=!(rootHandle&&currentPerson()&&photoTitleInput.value.trim()&&(editingPhotoId||photoFile)&&photoSelectedPeople.size);saveDocument.disabled=!(rootHandle&&currentPerson()&&documentTitleInput.value.trim()&&(editingDocumentId||documentFile)&&documentSelectedPeople.size)}

connectFolder.addEventListener("click",async()=>{hideResult(managerResult);if(!("showDirectoryPicker" in window)){showResult(managerResult,"Este navegador no permite modificar una carpeta local. Abre la página en <strong>Chrome o Edge desde Windows</strong>.",true);return}try{rootHandle=await window.showDirectoryPicker({mode:"readwrite"});people=await readPeople();ensureData();personSearch.value="";populatePeople(false);folderStatus.textContent=`Carpeta conectada: ${rootHandle.name}. Se han cargado ${people.length} personas.`;folderStatus.classList.add("ok");setManagerEnabled(true);renderManager()}catch(err){if(err.name!=="AbortError"){rootHandle=null;setManagerEnabled(false);showResult(managerResult,`No se pudo abrir el archivo: ${escapeHtml(err.message)}`,true)}}});
personSearch.addEventListener("input",()=>populatePeople());
personSearch.addEventListener("keydown",event=>{if(event.key!=="Enter")return;const matches=filteredPeopleForAdmin();if(matches.length===1){personSelect.value=matches[0].id;closeEditors();renderManager()}});
clearPersonSearch.addEventListener("click",()=>{personSearch.value="";populatePeople();personSearch.focus()});
expedientPhotos.addEventListener("click",()=>{if(currentPerson())switchTab("photos")});
expedientDocuments.addEventListener("click",()=>{if(currentPerson())switchTab("documents")});
expedientFacts.addEventListener("click",()=>{if(currentPerson())switchTab("biography")});
personSelect.addEventListener("change",()=>{closeEditors();renderManager()});
photosTab.addEventListener("click",()=>switchTab("photos"));documentsTab.addEventListener("click",()=>switchTab("documents"));biographyTab.addEventListener("click",()=>switchTab("biography"));
newPhoto.addEventListener("click",openNewPhoto);newDocument.addEventListener("click",openNewDocument);
closePhotoEditor.addEventListener("click",closePhotoPanel);cancelPhotoEdit.addEventListener("click",closePhotoPanel);closeDocumentEditor.addEventListener("click",closeDocumentPanel);cancelDocumentEdit.addEventListener("click",closeDocumentPanel);
photoPeopleChecklist.addEventListener("change",e=>selectFromChecklist("photo",e));documentPeopleChecklist.addEventListener("change",e=>selectFromChecklist("document",e));
photoPeopleSearch.addEventListener("input",()=>renderChecklist("photo"));documentPeopleSearch.addEventListener("input",()=>renderChecklist("document"));
photoTitleInput.addEventListener("input",updateSaveStates);documentTitleInput.addEventListener("input",updateSaveStates);
photoInput.addEventListener("change",()=>{hideResult(photoEditorResult);photoFile=photoInput.files?.[0]||null;revokeUrl("photo");if(photoFile){photoPreviewUrl=URL.createObjectURL(photoFile);photoPreview.src=photoPreviewUrl;photoPreviewWrap.classList.remove("hidden");if(!photoTitleInput.value.trim())photoTitleInput.value=titleFromFilename(photoFile.name)}else photoPreviewWrap.classList.add("hidden");updateSaveStates()});
documentInput.addEventListener("change",()=>{hideResult(documentEditorResult);documentFile=documentInput.files?.[0]||null;revokeUrl("document");if(documentFile){documentPreviewUrl=URL.createObjectURL(documentFile);renderDocumentPreview(documentFile,documentPreviewUrl);if(!documentTitleInput.value.trim())documentTitleInput.value=titleFromFilename(documentFile.name)}else{documentPreviewWrap.innerHTML="";documentPreviewWrap.classList.add("hidden")}updateSaveStates()});

photoGallery.addEventListener("click",async e=>{const button=e.target.closest("button[data-photo-action]");if(!button)return;const index=Number(button.dataset.index),action=button.dataset.photoAction,person=currentPerson(),photos=currentPhotos();if(!person||!photos[index])return;try{if(action==="edit")return openEditPhoto(index);if(action==="principal"){person.fotografia_principal=photos[index].src;person.fotoPosicion="50% 50%";await writePeople();await renderManager();showResult(managerResult,"Fotografía principal actualizada. Ajusta ahora su encuadre si es necesario.");return}if(action==="up"||action==="down"){const target=action==="up"?index-1:index+1;[photos[index],photos[target]]=[photos[target],photos[index]];await writePeople();await renderManager();showResult(managerResult,"Orden de las fotografías actualizado.");return}if(action==="delete"){const photo=photos[index],all=copies("fotografias",photo.id);if(!confirm(`Se eliminará «${photo.titulo||"Sin título"}» de ${all.length} ficha${all.length===1?"":"s"} y también su archivo físico. ¿Continuar?`))return;try{await deleteFileFromPath(photo.src)}catch(err){if(err.name!=="NotFoundError")throw err}for(const copy of all){copy.person.fotografias.splice(copy.index,1);if(copy.person.fotografia_principal===photo.src)copy.person.fotografia_principal=copy.person.fotografias[0]?.src||""}await writePeople();await renderManager();showResult(managerResult,"Fotografía eliminada de todas las fichas correctamente.")}}catch(err){showResult(managerResult,`No se pudo completar la operación: ${escapeHtml(err.message)}`,true)}});

documentGallery.addEventListener("click",async e=>{const button=e.target.closest("button[data-document-action]");if(!button)return;const index=Number(button.dataset.index),action=button.dataset.documentAction,person=currentPerson(),docs=currentDocuments();if(!person||!docs[index])return;try{if(action==="edit")return openEditDocument(index);if(action==="open"){const file=await getFileFromPath(docs[index].src);const url=URL.createObjectURL(file);window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000);return}if(action==="generate"){const doc=docs[index];const file=await getFileFromPath(doc.src);button.disabled=true;button.textContent="Preparando…";const pages=await generatePdfPages(doc,file,doc.src.split("/")[2],(n,total)=>{button.textContent=`Página ${n}/${total}`});doc.paginas=pages;syncAssociations("documentos",doc,doc.personas||[person.id]);await writePeople();await renderManager();showResult(managerResult,`Vista generada correctamente: ${pages.length} página${pages.length===1?"":"s"}.`);return}if(action==="up"||action==="down"){const target=action==="up"?index-1:index+1;[docs[index],docs[target]]=[docs[target],docs[index]];await writePeople();await renderManager();showResult(managerResult,"Orden de los documentos actualizado.");return}if(action==="delete"){const doc=docs[index],all=copies("documentos",doc.id);if(!confirm(`Se eliminará «${doc.titulo||"Sin título"}» de ${all.length} ficha${all.length===1?"":"s"} y también su archivo físico. ¿Continuar?`))return;try{await deleteFileFromPath(doc.src)}catch(err){if(err.name!=="NotFoundError")throw err}for(const copy of all)copy.person.documentos.splice(copy.index,1);await writePeople();await renderManager();showResult(managerResult,"Documento eliminado de todas las fichas correctamente.")}}catch(err){showResult(managerResult,`No se pudo completar la operación: ${escapeHtml(err.message)}`,true)}});




newPerson.addEventListener("click",openNewPerson);
closePersonEditor.addEventListener("click",closePersonPanel);
cancelPersonEdit.addEventListener("click",closePersonPanel);
personNameInput.addEventListener("input",updatePersonSaveState);

savePerson.addEventListener("click",async()=>{
  hideResult(personEditorResult);
  const name=personNameInput.value.trim();
  if(!name){
    showResult(personEditorResult,"El nombre completo es obligatorio.",true);
    return;
  }

  const duplicates=possibleDuplicateNames(name);
  if(duplicates.length){
    const duplicateText=duplicates.map(person=>`${person.nombre} (${person.id})`).join(", ");
    if(!confirm(`Ya existe una persona con el mismo nombre: ${duplicateText}. ¿Quieres crearla de todos modos?`))return;
  }

  savePerson.disabled=true;
  savePerson.textContent="Creando…";

  try{
    const id=nextPersonId();
    const now=new Date().toISOString();

    const person={
      id,
      nombre:name,
      nombre_conocido:personKnownNameInput.value.trim(),
      sexo:personSexInput.value,
      situacion_vital:personLifeStatusInput.value,
      fecha_nacimiento:personBirthDateInput.value.trim(),
      lugar_nacimiento:personBirthPlaceInput.value.trim(),
      fecha_defuncion:personDeathDateInput.value.trim(),
      lugar_defuncion:personDeathPlaceInput.value.trim(),
      profesion:personProfessionInput.value.trim(),
      estado:personStateInput.value,
      notas:personNotesInput.value.trim(),
      datos_resumen:personNotesInput.value.trim(),
      visible:personVisibleInput.checked,
      padres:[],
      conyuges:[],
      hijos:[],
      hechos:[],
      fotografias:[],
      documentos:[],
      fecha_creacion:now,
      ultima_modificacion:now
    };

    people.push(person);
    person.ultima_modificacion=new Date().toISOString();
    await writePeople();
    populatePeople();
    personSelect.value=id;
    closePersonPanel();
    switchTab("biography");
    await renderManager();
    showResult(managerResult,`Persona creada correctamente: <strong>${escapeHtml(name)}</strong> (${escapeHtml(id)}).`);
  }catch(err){
    showResult(personEditorResult,`No se pudo crear la persona: ${escapeHtml(err.message)}`,true);
  }finally{
    savePerson.textContent="Crear persona";
    updatePersonSaveState();
  }
});


deletePerson.addEventListener("click",async()=>{
  const person=currentPerson();
  if(!person)return;

  const blockers=deletionBlockers(person);
  if(blockers.length){
    renderDangerZone(person);
    showResult(biographyResult,"La persona no puede eliminarse mientras tenga información o relaciones asociadas.",true);
    return;
  }

  const confirmation=prompt(
    `Vas a eliminar definitivamente:\n\n${person.nombre}\n${person.id}\n\nEsta acción no puede deshacerse.\n\nEscribe exactamente el ID ${person.id} para confirmar.`
  );

  if(confirmation===null)return;
  if(confirmation.trim()!==person.id){
    showResult(biographyResult,"El identificador introducido no coincide. No se ha eliminado la persona.",true);
    return;
  }

  deletePerson.disabled=true;
  deletePerson.textContent="Eliminando…";
  hideResult(biographyResult);

  try{
    const index=people.findIndex(item=>item.id===person.id);
    if(index<0)throw new Error("La persona ya no existe en personas.json.");

    const deletedName=person.nombre;
    const deletedId=person.id;
    people.splice(index,1);

    await writePeople();

    personSelect.value="";
    personSearch.value="";
    populatePeople(false);
    await renderManager();

    showResult(
      managerResult,
      `Persona eliminada correctamente: <strong>${escapeHtml(deletedName)}</strong> (${escapeHtml(deletedId)}). Recuerda hacer Commit y Push para publicar el cambio.`
    );
  }catch(err){
    showResult(biographyResult,`No se pudo eliminar la persona: ${escapeHtml(err.message)}`,true);
    deletePerson.disabled=false;
  }finally{
    deletePerson.textContent="🗑 Eliminar definitivamente";
  }
});

savePersonalData.addEventListener("click",async()=>{
  const person=currentPerson();
  if(!person)return;
  savePersonalData.disabled=true;
  savePersonalData.textContent="Guardando…";
  hideResult(biographyResult);
  try{
    const name=bioName.value.trim();
    if(!name)throw new Error("El nombre no puede quedar vacío.");

    person.nombre=name;
    person.fecha_nacimiento=bioBirthDate.value.trim();
    person.lugar_nacimiento=bioBirthPlace.value.trim();
    person.fecha_defuncion=bioDeathDate.value.trim();
    person.lugar_defuncion=bioDeathPlace.value.trim();
    person.profesion=bioProfession.value.trim();
    person.nombre_conocido=bioKnownName.value.trim();
    person.sexo=bioSex.value;
    person.situacion_vital=bioLifeStatus.value;
    person.estado=bioState.value;
    person.notas=bioSummary.value.trim();
    person.datos_resumen=bioSummary.value.trim();
    person.visible=bioVisible.checked;
    delete person.rol;

    await writePeople();
    populatePeople();
    personSelect.value=person.id;
    await renderManager();
    renderDangerZone(person);showResult(biographyResult,"Datos personales guardados correctamente.");
  }catch(err){
    showResult(biographyResult,`No se pudieron guardar los datos: ${escapeHtml(err.message)}`,true);
  }finally{
    savePersonalData.disabled=false;
    savePersonalData.textContent="Guardar datos personales";
  }
});

addFact.addEventListener("click",()=>{
  biographyFactsDraft=readFactsFromEditor();
  biographyFactsDraft.push({tipo:"memoria familiar",texto:""});
  renderFactsEditor();
  factsEditorList.querySelector(".fact-editor-row:last-child textarea")?.focus();
});

factsEditorList.addEventListener("input",()=>{
  biographyFactsDraft=readFactsFromEditor();
  factsCount.textContent=String(biographyFactsDraft.length);
});

factsEditorList.addEventListener("click",event=>{
  const button=event.target.closest("[data-fact-action]");
  if(!button)return;
  const row=button.closest(".fact-editor-row");
  const index=Number(row?.dataset.factIndex);
  if(!Number.isInteger(index))return;

  biographyFactsDraft=readFactsFromEditor();
  const action=button.dataset.factAction;

  if(action==="delete"){
    biographyFactsDraft.splice(index,1);
  }else if(action==="up"&&index>0){
    [biographyFactsDraft[index-1],biographyFactsDraft[index]]=[biographyFactsDraft[index],biographyFactsDraft[index-1]];
  }else if(action==="down"&&index<biographyFactsDraft.length-1){
    [biographyFactsDraft[index+1],biographyFactsDraft[index]]=[biographyFactsDraft[index],biographyFactsDraft[index+1]];
  }
  renderFactsEditor();
});

saveFacts.addEventListener("click",async()=>{
  const person=currentPerson();
  if(!person)return;
  saveFacts.disabled=true;
  saveFacts.textContent="Guardando…";
  hideResult(biographyResult);
  try{
    biographyFactsDraft=readFactsFromEditor();
    person.hechos=biographyFactsDraft.map(item=>({
      tipo:item.tipo,
      texto:item.texto
    }));
    await writePeople();
    await renderManager();
    renderDangerZone(person);showResult(biographyResult,"Biografía y evidencias guardadas correctamente.");
  }catch(err){
    showResult(biographyResult,`No se pudo guardar la biografía: ${escapeHtml(err.message)}`,true);
  }finally{
    saveFacts.disabled=false;
    saveFacts.textContent="Guardar biografía y evidencias";
  }
});

photoPositionX.addEventListener("input",updateFramingPreview);
photoPositionY.addEventListener("input",updateFramingPreview);

resetPhotoPosition.addEventListener("click",()=>{
  photoPositionX.value="50";
  photoPositionY.value="50";
  updateFramingPreview();
});

savePhotoPosition.addEventListener("click",async()=>{
  const person=currentPerson();
  if(!person||!person.fotografia_principal)return;
  savePhotoPosition.disabled=true;
  savePhotoPosition.textContent="Guardando…";
  try{
    const x=Number(photoPositionX.value);
    const y=Number(photoPositionY.value);
    person.fotoPosicion=`${x}% ${y}%`;
    await writePeople();
    showResult(managerResult,`Encuadre guardado para ${escapeHtml(person.nombre)}.`);
  }catch(err){
    showResult(managerResult,`No se pudo guardar el encuadre: ${escapeHtml(err.message)}`,true);
  }finally{
    savePhotoPosition.disabled=false;
    savePhotoPosition.textContent="Guardar encuadre";
  }
});

savePhoto.addEventListener("click",async()=>{hideResult(photoEditorResult);savePhoto.disabled=true;savePhoto.textContent="Guardando…";try{const owner=currentPerson();if(!owner)throw new Error("No se ha encontrado la persona seleccionada.");const ids=[...photoSelectedPeople];if(!ids.length)throw new Error("Selecciona al menos una persona.");let photo;if(!editingPhotoId){const dir=await ensureAssetDirectory("fotos",owner.id);const filename=await uniqueFilename(dir,photoFile.name,"fotografia");await writeFile(dir,filename,photoFile);photo={id:photoIdInput.value||nextPhotoId(),src:`assets/fotos/${owner.id}/${filename}`}}else{photo=canonical("fotografias",editingPhotoId);if(!photo)throw new Error("No se ha encontrado la fotografía.")}photo={...photo,titulo:photoTitleInput.value.trim(),fecha:photoDateInput.value.trim(),lugar:photoPlaceInput.value.trim(),descripcion:photoDescriptionInput.value.trim(),etiquetas:photoTagsInput.value.split(",").map(x=>x.trim()).filter(Boolean),personas:ids};syncAssociations("fotografias",photo,ids);if(principalInput.checked||!owner.fotografia_principal){owner.fotografia_principal=photo.src;if(!owner.fotoPosicion)owner.fotoPosicion="50% 50%";}else if(editingPhotoId&&owner.fotografia_principal===photo.src&&!principalInput.checked)owner.fotografia_principal=owner.fotografias.find(x=>x.src!==photo.src)?.src||"";await writePeople();closePhotoPanel();await renderManager();showResult(managerResult,editingPhotoId?`Fotografía actualizada en ${ids.length} persona${ids.length===1?"":"s"}.`:`Fotografía añadida y asociada a ${ids.length} persona${ids.length===1?"":"s"}.`)}catch(err){showResult(photoEditorResult,`No se pudo guardar la fotografía: ${escapeHtml(err.message)}`,true)}finally{savePhoto.textContent="Guardar fotografía";updateSaveStates()}});

saveDocument.addEventListener("click",async()=>{hideResult(documentEditorResult);saveDocument.disabled=true;saveDocument.textContent="Archivando…";try{const owner=currentPerson();if(!owner)throw new Error("No se ha encontrado la persona seleccionada.");const ids=[...documentSelectedPeople];if(!ids.length)throw new Error("Selecciona al menos una persona relacionada.");let doc;if(!editingDocumentId){const dir=await ensureAssetDirectory("documentos",owner.id);const filename=await uniqueFilename(dir,documentFile.name,"documento");await writeFile(dir,filename,documentFile);doc={id:documentIdInput.value||nextDocumentId(),src:`assets/documentos/${owner.id}/${filename}`,nombre_archivo:filename,formato:(documentFile.type||filename.split(".").pop()||"").toLowerCase()}}else{doc=canonical("documentos",editingDocumentId);if(!doc)throw new Error("No se ha encontrado el documento.")}doc={...doc,titulo:documentTitleInput.value.trim(),fecha:documentDateInput.value.trim(),descripcion:documentDescriptionInput.value.trim(),personas:ids};if(!editingDocumentId&&isPdf(documentFile)){saveDocument.textContent="Generando páginas…";doc.paginas=await generatePdfPages(doc,documentFile,owner.id,(n,total)=>{saveDocument.textContent=`Generando página ${n}/${total}`})}syncAssociations("documentos",doc,ids);await writePeople();closeDocumentPanel();await renderManager();showResult(managerResult,editingDocumentId?`Documento actualizado en ${ids.length} persona${ids.length===1?"":"s"}.`:`Documento archivado y asociado a ${ids.length} persona${ids.length===1?"":"s"}.`)}catch(err){showResult(documentEditorResult,`No se pudo archivar el documento: ${escapeHtml(err.message)}`,true)}finally{saveDocument.textContent="Archivar documento";updateSaveStates()}});

setManagerEnabled(false);renderManager();
