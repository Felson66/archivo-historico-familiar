let rootHandle=null;
let people=[];
let activeTab="photos";
let photoFile=null,photoPreviewUrl=null,editingPhotoId=null;
let documentFile=null,documentPreviewUrl=null,editingDocumentId=null;
let photoSelectedPeople=new Set(),documentSelectedPeople=new Set();

const $=id=>document.getElementById(id);
const connectFolder=$("connectFolder"),folderStatus=$("folderStatus"),manager=$("manager"),personSelect=$("personSelect");
const newPhoto=$("newPhoto"),newDocument=$("newDocument"),personSummary=$("personSummary"),photosCount=$("photosCount"),documentsCount=$("documentsCount");
const photoFraming=$("photoFraming"),framingPreviewImage=$("framingPreviewImage"),framingPreviewState=$("framingPreviewState"),framingPreviewName=$("framingPreviewName"),framingPreviewSummary=$("framingPreviewSummary"),photoPositionX=$("photoPositionX"),photoPositionY=$("photoPositionY"),photoPositionXValue=$("photoPositionXValue"),photoPositionYValue=$("photoPositionYValue"),savePhotoPosition=$("savePhotoPosition"),resetPhotoPosition=$("resetPhotoPosition");
const photosTab=$("photosTab"),documentsTab=$("documentsTab"),galleryEmpty=$("galleryEmpty"),photoGallery=$("photoGallery"),documentGallery=$("documentGallery"),managerResult=$("managerResult");
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
function setManagerEnabled(enabled){manager.classList.toggle("is-disabled",!enabled);manager.setAttribute("aria-disabled",String(!enabled));personSelect.disabled=!enabled;updateToolbarButtons()}
function updateToolbarButtons(){const enabled=Boolean(rootHandle&&currentPerson());newPhoto.disabled=!enabled;newDocument.disabled=!enabled}
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
function populatePeople(){personSelect.innerHTML='<option value="">Selecciona una persona…</option>'+[...people].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre)} · ${escapeHtml(p.id)}</option>`).join("")}
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

function switchTab(tab){activeTab=tab;photosTab.classList.toggle("active",tab==="photos");documentsTab.classList.toggle("active",tab==="documents");photosTab.setAttribute("aria-selected",String(tab==="photos"));documentsTab.setAttribute("aria-selected",String(tab==="documents"));photoGallery.classList.toggle("hidden",tab!=="photos");documentGallery.classList.toggle("hidden",tab!=="documents");closeEditors();renderManager()}
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

async function renderManager(){
  hideResult(managerResult);photoGallery.innerHTML="";documentGallery.innerHTML="";updateToolbarButtons();
  const person=currentPerson();
  if(!person){personSummary.classList.add("hidden");photoFraming.classList.add("hidden");photosCount.textContent="0";documentsCount.textContent="0";galleryEmpty.textContent="Selecciona una persona para gestionar su archivo.";galleryEmpty.classList.remove("hidden");return}
  const photos=currentPhotos(),docs=currentDocuments();photosCount.textContent=photos.length;documentsCount.textContent=docs.length;
  personSummary.innerHTML=`<div><h3>${escapeHtml(person.nombre)}</h3><p>${escapeHtml(person.id)} · ${photos.length} fotografía${photos.length===1?"":"s"} · ${docs.length} documento${docs.length===1?"":"s"}</p></div>`;personSummary.classList.remove("hidden");await renderPhotoFraming(person);
  const items=activeTab==="photos"?photos:docs;
  if(!items.length){galleryEmpty.textContent=activeTab==="photos"?"Esta persona todavía no tiene fotografías.":"Esta persona todavía no tiene documentos archivados.";galleryEmpty.classList.remove("hidden")}else galleryEmpty.classList.add("hidden");
  if(activeTab==="photos"){
    photos.forEach((photo,index)=>{const principal=person.fotografia_principal===photo.src,linked=new Set(photo.personas||[person.id]).size;const card=document.createElement("article");card.className="photo-card";card.innerHTML=`<div class="photo-thumb"><img alt="${escapeHtml(photo.titulo||"Fotografía")}"></div><div class="photo-body">${principal?'<span class="principal-badge">★ Principal</span>':""}${linked>1?`<span class="shared-badge">👥 ${linked} personas</span>`:""}<span class="photo-id">${escapeHtml(photo.id||"")}</span><h4>${escapeHtml(photo.titulo||"Sin título")}</h4><p class="photo-meta">${escapeHtml([photo.fecha,photo.lugar].filter(Boolean).join(" · ")||"Sin fecha ni lugar")}</p><div class="card-actions"><button class="small-button" data-photo-action="edit" data-index="${index}">Editar</button>${principal?"":`<button class="small-button" data-photo-action="principal" data-index="${index}">Principal</button>`}<button class="small-button danger" data-photo-action="delete" data-index="${index}">Eliminar</button><span class="order-actions"><button class="small-button" data-photo-action="up" data-index="${index}" ${index===0?"disabled":""}>↑</button><button class="small-button" data-photo-action="down" data-index="${index}" ${index===photos.length-1?"disabled":""}>↓</button></span></div></div>`;photoGallery.appendChild(card);loadCardImage(card.querySelector("img"),photo.src)})
  }else{
    docs.forEach((doc,index)=>{const linked=new Set(doc.personas||[person.id]).size;const card=document.createElement("article");card.className="document-card";const thumb=isImageDocument(doc)?`<div class="document-thumb"><img alt="${escapeHtml(doc.titulo||"Documento")}"><span class="document-format">${escapeHtml(documentFormat(doc))}</span></div>`:`<div class="document-thumb"><span class="document-icon">📄</span><span class="document-format">${escapeHtml(documentFormat(doc))}</span></div>`;card.innerHTML=`${thumb}<div class="document-body">${linked>1?`<span class="shared-badge">👥 ${linked} personas</span>`:""}<span class="document-id">${escapeHtml(doc.id||"")}</span><h4>${escapeHtml(doc.titulo||"Sin título")}</h4><p class="document-meta">${escapeHtml(doc.fecha||"Sin fecha")}</p>${doc.descripcion?`<p class="document-description">${escapeHtml(doc.descripcion)}</p>`:""}<div class="card-actions"><button class="small-button" data-document-action="open" data-index="${index}">Abrir</button>${isPdf(doc)?`<button class="small-button" data-document-action="generate" data-index="${index}">${Array.isArray(doc.paginas)&&doc.paginas.length?"Regenerar vista":"Generar vista"}</button>`:""}<button class="small-button" data-document-action="edit" data-index="${index}">Editar</button><button class="small-button danger" data-document-action="delete" data-index="${index}">Eliminar</button><span class="order-actions"><button class="small-button" data-document-action="up" data-index="${index}" ${index===0?"disabled":""}>↑</button><button class="small-button" data-document-action="down" data-index="${index}" ${index===docs.length-1?"disabled":""}>↓</button></span></div></div>`;documentGallery.appendChild(card);if(isImageDocument(doc))loadCardImage(card.querySelector("img"),doc.src)})
  }
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
function closeEditors(){closePhotoPanel();closeDocumentPanel()}
function updateSaveStates(){savePhoto.disabled=!(rootHandle&&currentPerson()&&photoTitleInput.value.trim()&&(editingPhotoId||photoFile)&&photoSelectedPeople.size);saveDocument.disabled=!(rootHandle&&currentPerson()&&documentTitleInput.value.trim()&&(editingDocumentId||documentFile)&&documentSelectedPeople.size)}

connectFolder.addEventListener("click",async()=>{hideResult(managerResult);if(!("showDirectoryPicker" in window)){showResult(managerResult,"Este navegador no permite modificar una carpeta local. Abre la página en <strong>Chrome o Edge desde Windows</strong>.",true);return}try{rootHandle=await window.showDirectoryPicker({mode:"readwrite"});people=await readPeople();ensureData();populatePeople();folderStatus.textContent=`Carpeta conectada: ${rootHandle.name}. Se han cargado ${people.length} personas.`;folderStatus.classList.add("ok");setManagerEnabled(true);renderManager()}catch(err){if(err.name!=="AbortError"){rootHandle=null;setManagerEnabled(false);showResult(managerResult,`No se pudo abrir el archivo: ${escapeHtml(err.message)}`,true)}}});
personSelect.addEventListener("change",()=>{closeEditors();renderManager()});
photosTab.addEventListener("click",()=>switchTab("photos"));documentsTab.addEventListener("click",()=>switchTab("documents"));
newPhoto.addEventListener("click",openNewPhoto);newDocument.addEventListener("click",openNewDocument);
closePhotoEditor.addEventListener("click",closePhotoPanel);cancelPhotoEdit.addEventListener("click",closePhotoPanel);closeDocumentEditor.addEventListener("click",closeDocumentPanel);cancelDocumentEdit.addEventListener("click",closeDocumentPanel);
photoPeopleChecklist.addEventListener("change",e=>selectFromChecklist("photo",e));documentPeopleChecklist.addEventListener("change",e=>selectFromChecklist("document",e));
photoPeopleSearch.addEventListener("input",()=>renderChecklist("photo"));documentPeopleSearch.addEventListener("input",()=>renderChecklist("document"));
photoTitleInput.addEventListener("input",updateSaveStates);documentTitleInput.addEventListener("input",updateSaveStates);
photoInput.addEventListener("change",()=>{hideResult(photoEditorResult);photoFile=photoInput.files?.[0]||null;revokeUrl("photo");if(photoFile){photoPreviewUrl=URL.createObjectURL(photoFile);photoPreview.src=photoPreviewUrl;photoPreviewWrap.classList.remove("hidden");if(!photoTitleInput.value.trim())photoTitleInput.value=titleFromFilename(photoFile.name)}else photoPreviewWrap.classList.add("hidden");updateSaveStates()});
documentInput.addEventListener("change",()=>{hideResult(documentEditorResult);documentFile=documentInput.files?.[0]||null;revokeUrl("document");if(documentFile){documentPreviewUrl=URL.createObjectURL(documentFile);renderDocumentPreview(documentFile,documentPreviewUrl);if(!documentTitleInput.value.trim())documentTitleInput.value=titleFromFilename(documentFile.name)}else{documentPreviewWrap.innerHTML="";documentPreviewWrap.classList.add("hidden")}updateSaveStates()});

photoGallery.addEventListener("click",async e=>{const button=e.target.closest("button[data-photo-action]");if(!button)return;const index=Number(button.dataset.index),action=button.dataset.photoAction,person=currentPerson(),photos=currentPhotos();if(!person||!photos[index])return;try{if(action==="edit")return openEditPhoto(index);if(action==="principal"){person.fotografia_principal=photos[index].src;person.fotoPosicion="50% 50%";await writePeople();await renderManager();showResult(managerResult,"Fotografía principal actualizada. Ajusta ahora su encuadre si es necesario.");return}if(action==="up"||action==="down"){const target=action==="up"?index-1:index+1;[photos[index],photos[target]]=[photos[target],photos[index]];await writePeople();await renderManager();showResult(managerResult,"Orden de las fotografías actualizado.");return}if(action==="delete"){const photo=photos[index],all=copies("fotografias",photo.id);if(!confirm(`Se eliminará «${photo.titulo||"Sin título"}» de ${all.length} ficha${all.length===1?"":"s"} y también su archivo físico. ¿Continuar?`))return;try{await deleteFileFromPath(photo.src)}catch(err){if(err.name!=="NotFoundError")throw err}for(const copy of all){copy.person.fotografias.splice(copy.index,1);if(copy.person.fotografia_principal===photo.src)copy.person.fotografia_principal=copy.person.fotografias[0]?.src||""}await writePeople();await renderManager();showResult(managerResult,"Fotografía eliminada de todas las fichas correctamente.")}}catch(err){showResult(managerResult,`No se pudo completar la operación: ${escapeHtml(err.message)}`,true)}});

documentGallery.addEventListener("click",async e=>{const button=e.target.closest("button[data-document-action]");if(!button)return;const index=Number(button.dataset.index),action=button.dataset.documentAction,person=currentPerson(),docs=currentDocuments();if(!person||!docs[index])return;try{if(action==="edit")return openEditDocument(index);if(action==="open"){const file=await getFileFromPath(docs[index].src);const url=URL.createObjectURL(file);window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000);return}if(action==="generate"){const doc=docs[index];const file=await getFileFromPath(doc.src);button.disabled=true;button.textContent="Preparando…";const pages=await generatePdfPages(doc,file,doc.src.split("/")[2],(n,total)=>{button.textContent=`Página ${n}/${total}`});doc.paginas=pages;syncAssociations("documentos",doc,doc.personas||[person.id]);await writePeople();await renderManager();showResult(managerResult,`Vista generada correctamente: ${pages.length} página${pages.length===1?"":"s"}.`);return}if(action==="up"||action==="down"){const target=action==="up"?index-1:index+1;[docs[index],docs[target]]=[docs[target],docs[index]];await writePeople();await renderManager();showResult(managerResult,"Orden de los documentos actualizado.");return}if(action==="delete"){const doc=docs[index],all=copies("documentos",doc.id);if(!confirm(`Se eliminará «${doc.titulo||"Sin título"}» de ${all.length} ficha${all.length===1?"":"s"} y también su archivo físico. ¿Continuar?`))return;try{await deleteFileFromPath(doc.src)}catch(err){if(err.name!=="NotFoundError")throw err}for(const copy of all)copy.person.documentos.splice(copy.index,1);await writePeople();await renderManager();showResult(managerResult,"Documento eliminado de todas las fichas correctamente.")}}catch(err){showResult(managerResult,`No se pudo completar la operación: ${escapeHtml(err.message)}`,true)}});


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
