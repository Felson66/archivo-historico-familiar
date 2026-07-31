let rootHandle = null;
let people = [];
let selectedFile = null;
let editingIndex = null;
let previewUrl = null;
let editingPhotoId = null;
let selectedPeople = new Set();

const $ = (id) => document.getElementById(id);
const connectFolder = $("connectFolder");
const folderStatus = $("folderStatus");
const manager = $("manager");
const personSelect = $("personSelect");
const newPhoto = $("newPhoto");
const personSummary = $("personSummary");
const galleryEmpty = $("galleryEmpty");
const photoGallery = $("photoGallery");
const managerResult = $("managerResult");
const editor = $("editor");
const editorEyebrow = $("editorEyebrow");
const editorTitle = $("editorTitle");
const closeEditor = $("closeEditor");
const cancelEdit = $("cancelEdit");
const filePickerLabel = $("filePickerLabel");
const photoInput = $("photoInput");
const previewWrap = $("previewWrap");
const preview = $("preview");
const photoIdInput = $("photoIdInput");
const titleInput = $("titleInput");
const dateInput = $("dateInput");
const placeInput = $("placeInput");
const descriptionInput = $("descriptionInput");
const tagsInput = $("tagsInput");
const peopleSearch = $("peopleSearch");
const peopleChecklist = $("peopleChecklist");
const principalInput = $("principalInput");
const savePhoto = $("savePhoto");
const editorResult = $("editorResult");

function escapeHtml(value=""){
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}
function showResult(box,message,error=false){box.innerHTML=message;box.classList.remove("hidden","error");if(error)box.classList.add("error")}
function hideResult(box){box.classList.add("hidden");box.classList.remove("error")}
function currentPerson(){return people.find(p=>p.id===personSelect.value)||null}
function currentPhotos(){const p=currentPerson();return p&&Array.isArray(p.fotografias)?p.fotografias:[]}
function setManagerEnabled(enabled){manager.classList.toggle("is-disabled",!enabled);manager.setAttribute("aria-disabled",String(!enabled));personSelect.disabled=!enabled;newPhoto.disabled=!enabled||!personSelect.value}
function revokePreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}}
function setPreview(src){if(src){preview.src=src;previewWrap.classList.remove("hidden")}else{preview.removeAttribute("src");previewWrap.classList.add("hidden")}}
function sanitizeFilename(name){const dot=name.lastIndexOf(".");const ext=dot>=0?name.slice(dot).toLowerCase():".jpg";const base=(dot>=0?name.slice(0,dot):name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)||"fotografia";return{base,ext}}
async function getPersonasFile(){const dataDir=await rootHandle.getDirectoryHandle("data");return dataDir.getFileHandle("personas.json")}
async function readPeople(){const handle=await getPersonasFile();const parsed=JSON.parse(await(await handle.getFile()).text());if(!Array.isArray(parsed))throw new Error("El archivo personas.json no contiene una lista válida.");return parsed}
async function writePeople(){const handle=await getPersonasFile();const writable=await handle.createWritable();await writable.write(JSON.stringify(people,null,2)+"\n");await writable.close()}
async function ensurePhotoDirectory(personId){const assets=await rootHandle.getDirectoryHandle("assets");const fotos=await assets.getDirectoryHandle("fotos",{create:true});return fotos.getDirectoryHandle(personId,{create:true})}
async function uniqueFilename(dirHandle,originalName){const{base,ext}=sanitizeFilename(originalName);let candidate=`${base}${ext}`,n=2;while(true){try{await dirHandle.getFileHandle(candidate);candidate=`${base}-${n}${ext}`;n++}catch(err){if(err.name==="NotFoundError")return candidate;throw err}}}
function nextPhotoId(){let max=0;for(const person of people){for(const photo of(person.fotografias||[])){const match=String(photo.id||"").match(/^F(\d+)$/);if(match)max=Math.max(max,Number(match[1]))}}return `F${String(max+1).padStart(6,"0")}`}
function ensurePhotoIds(){
  const bySrc=new Map();
  for(const person of people){
    if(!Array.isArray(person.fotografias))person.fotografias=[];
    for(const photo of person.fotografias){
      if(!photo.id){photo.id=bySrc.get(photo.src)||nextPhotoId()}
      if(photo.src)bySrc.set(photo.src,photo.id);
      if(!Array.isArray(photo.personas))photo.personas=[person.id];
      if(!photo.personas.includes(person.id))photo.personas.push(person.id);
      if(!Array.isArray(photo.etiquetas))photo.etiquetas=[];
    }
  }
  // Unifica la lista de personas de todas las copias que comparten ID.
  const linked=new Map();
  for(const person of people)for(const photo of(person.fotografias||[])){
    if(!linked.has(photo.id))linked.set(photo.id,new Set());
    linked.get(photo.id).add(person.id);
    for(const id of(photo.personas||[]))linked.get(photo.id).add(id);
  }
  for(const person of people)for(const photo of(person.fotografias||[]))photo.personas=[...(linked.get(photo.id)||new Set([person.id]))];
}
function populatePeople(){personSelect.innerHTML=`<option value="">Selecciona una persona…</option>`+[...people].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre)} · ${escapeHtml(p.id)}</option>`).join("")}
async function getFileFromPath(path){const parts=path.split("/").filter(Boolean);let dir=rootHandle;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i]);return(await dir.getFileHandle(parts.at(-1))).getFile()}
async function deleteFileFromPath(path){const parts=path.split("/").filter(Boolean);let dir=rootHandle;for(let i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i]);await dir.removeEntry(parts.at(-1))}
async function loadCardImage(img,path){try{const file=await getFileFromPath(path);const url=URL.createObjectURL(file);img.src=url;img.onload=()=>URL.revokeObjectURL(url)}catch{img.replaceWith(Object.assign(document.createElement("span"),{textContent:"Imagen no encontrada"}))}}
function photoCopies(photoId){const copies=[];for(const person of people){const index=(person.fotografias||[]).findIndex(photo=>photo.id===photoId);if(index>=0)copies.push({person,index,photo:person.fotografias[index]})}return copies}
function canonicalPhoto(photoId){return photoCopies(photoId)[0]?.photo||null}
function selectedPersonIds(){return [...selectedPeople]}
function renderPeopleChecklist(selectedIds=null){
  if(selectedIds!==null)selectedPeople=new Set(selectedIds);
  const query=peopleSearch.value.trim().toLocaleLowerCase("es");
  const selected=selectedPeople;
  const sorted=[...people].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
  const visible=sorted.filter(person=>!query||person.nombre.toLocaleLowerCase("es").includes(query)||person.id.toLowerCase().includes(query));
  peopleChecklist.innerHTML=visible.length?visible.map(person=>`<label class="person-check"><input type="checkbox" value="${escapeHtml(person.id)}" ${selected.has(person.id)?"checked":""}><span>${escapeHtml(person.nombre)}<small>${escapeHtml(person.id)}</small></span></label>`).join(""):'<div class="people-empty">No se han encontrado personas.</div>';
}
async function renderGallery(){
  hideResult(managerResult);photoGallery.innerHTML="";const person=currentPerson();newPhoto.disabled=!rootHandle||!person;
  if(!person){personSummary.classList.add("hidden");galleryEmpty.textContent="Selecciona una persona para gestionar sus fotografías.";galleryEmpty.classList.remove("hidden");return}
  const photos=currentPhotos();personSummary.innerHTML=`<div><h3>${escapeHtml(person.nombre)}</h3><p>${escapeHtml(person.id)} · ${photos.length} fotografía${photos.length===1?"":"s"}</p></div>`;personSummary.classList.remove("hidden");
  if(!photos.length){galleryEmpty.textContent="Esta persona todavía no tiene fotografías.";galleryEmpty.classList.remove("hidden");return}
  galleryEmpty.classList.add("hidden");
  photos.forEach((photo,index)=>{
    const principal=person.fotografia_principal===photo.src;
    const linkedCount=new Set(photo.personas||[person.id]).size;
    const card=document.createElement("article");card.className="photo-card";
    card.innerHTML=`<div class="photo-thumb"><img alt="${escapeHtml(photo.titulo||"Fotografía")}"></div><div class="photo-body">${principal?'<span class="principal-badge">★ Principal</span>':""}${linkedCount>1?`<span class="shared-badge">👥 ${linkedCount} personas</span>`:""}<span class="photo-id">${escapeHtml(photo.id||"")}</span><h4>${escapeHtml(photo.titulo||"Sin título")}</h4><p class="photo-meta">${escapeHtml([photo.fecha,photo.lugar].filter(Boolean).join(" · ")||"Sin fecha ni lugar")}</p><div class="card-actions"><button class="small-button" data-action="edit" data-index="${index}">Editar</button>${principal?"":`<button class="small-button" data-action="principal" data-index="${index}">Principal</button>`}<button class="small-button danger" data-action="delete" data-index="${index}">Eliminar</button><span class="order-actions"><button class="small-button" data-action="up" data-index="${index}" ${index===0?"disabled":""}>↑</button><button class="small-button" data-action="down" data-index="${index}" ${index===photos.length-1?"disabled":""}>↓</button></span></div></div>`;
    photoGallery.appendChild(card);loadCardImage(card.querySelector("img"),photo.src)
  })
}
function resetEditor(){editingIndex=null;editingPhotoId=null;selectedFile=null;photoInput.value="";photoIdInput.value=nextPhotoId();titleInput.value="";dateInput.value="";placeInput.value="";descriptionInput.value="";tagsInput.value="";peopleSearch.value="";renderPeopleChecklist(currentPerson()?[currentPerson().id]:[]);principalInput.checked=false;filePickerLabel.classList.remove("hidden");setPreview("");hideResult(editorResult);updateSaveState()}
function openNewEditor(){resetEditor();editorEyebrow.textContent="Nueva fotografía";editorTitle.textContent="Añadir fotografía";editor.classList.remove("hidden");editor.setAttribute("aria-hidden","false");editor.scrollIntoView({behavior:"smooth",block:"start"})}
async function openEditEditor(index){
  const person=currentPerson(),photo=currentPhotos()[index];if(!person||!photo)return;
  resetEditor();editingIndex=index;editingPhotoId=photo.id;editorEyebrow.textContent="Editar fotografía";editorTitle.textContent=photo.titulo||"Fotografía";photoIdInput.value=photo.id||nextPhotoId();titleInput.value=photo.titulo||"";dateInput.value=photo.fecha||"";placeInput.value=photo.lugar||"";descriptionInput.value=photo.descripcion||"";tagsInput.value=(photo.etiquetas||[]).join(", ");peopleSearch.value="";renderPeopleChecklist(photo.personas||[person.id]);principalInput.checked=person.fotografia_principal===photo.src;filePickerLabel.classList.add("hidden");
  try{const file=await getFileFromPath(photo.src);revokePreview();previewUrl=URL.createObjectURL(file);setPreview(previewUrl)}catch{setPreview("");showResult(editorResult,"La imagen física no se ha encontrado, pero puedes editar sus datos.",true)}
  editor.classList.remove("hidden");editor.setAttribute("aria-hidden","false");updateSaveState();editor.scrollIntoView({behavior:"smooth",block:"start"})
}
function closeEditorPanel(){revokePreview();editor.classList.add("hidden");editor.setAttribute("aria-hidden","true");resetEditor()}
function updateSaveState(){savePhoto.disabled=!(rootHandle&&currentPerson()&&titleInput.value.trim()&&(editingIndex!==null||selectedFile)&&selectedPersonIds().length)}
function syncPhotoAssociations(photoData,personIds){
  const wanted=new Set(personIds);
  for(const person of people){
    if(!Array.isArray(person.fotografias))person.fotografias=[];
    const index=person.fotografias.findIndex(photo=>photo.id===photoData.id);
    if(wanted.has(person.id)){
      const copy={...photoData,personas:[...wanted],etiquetas:[...(photoData.etiquetas||[])]};
      if(index>=0)person.fotografias[index]=copy;else person.fotografias.push(copy);
    }else if(index>=0){
      person.fotografias.splice(index,1);
      if(person.fotografia_principal===photoData.src)person.fotografia_principal=person.fotografias[0]?.src||"";
    }
  }
}

connectFolder.addEventListener("click",async()=>{hideResult(managerResult);if(!("showDirectoryPicker" in window)){showResult(managerResult,"Este navegador no permite modificar una carpeta local. Abre la página en <strong>Chrome o Edge desde Windows</strong>.",true);return}try{rootHandle=await window.showDirectoryPicker({mode:"readwrite"});people=await readPeople();ensurePhotoIds();populatePeople();folderStatus.textContent=`Carpeta conectada: ${rootHandle.name}. Se han cargado ${people.length} personas.`;folderStatus.classList.add("ok");setManagerEnabled(true);renderGallery()}catch(err){if(err.name!=="AbortError"){rootHandle=null;setManagerEnabled(false);showResult(managerResult,`No se pudo abrir el archivo: ${escapeHtml(err.message)}`,true)}}});
personSelect.addEventListener("change",()=>{closeEditorPanel();renderGallery()});newPhoto.addEventListener("click",openNewEditor);closeEditor.addEventListener("click",closeEditorPanel);cancelEdit.addEventListener("click",closeEditorPanel);
photoInput.addEventListener("change",()=>{hideResult(editorResult);selectedFile=photoInput.files?.[0]||null;revokePreview();if(selectedFile){previewUrl=URL.createObjectURL(selectedFile);setPreview(previewUrl);if(!titleInput.value.trim()){const clean=selectedFile.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ");titleInput.value=clean.charAt(0).toUpperCase()+clean.slice(1)}}else setPreview("");updateSaveState()});
titleInput.addEventListener("input",updateSaveState);
peopleChecklist.addEventListener("change",event=>{
  const input=event.target.closest('input[type="checkbox"]');
  if(input){
    if(input.checked)selectedPeople.add(input.value);
    else selectedPeople.delete(input.value);
  }
  updateSaveState();
});
peopleSearch.addEventListener("input",()=>{renderPeopleChecklist();updateSaveState()});
photoGallery.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-action]");if(!button)return;const index=Number(button.dataset.index),action=button.dataset.action,person=currentPerson(),photos=currentPhotos();if(!person||!photos[index])return;
  try{
    if(action==="edit")return openEditEditor(index);
    if(action==="principal"){person.fotografia_principal=photos[index].src;await writePeople();await renderGallery();showResult(managerResult,"Fotografía principal actualizada correctamente.");return}
    if(action==="up"||action==="down"){const target=action==="up"?index-1:index+1;[photos[index],photos[target]]=[photos[target],photos[index]];await writePeople();await renderGallery();showResult(managerResult,"Orden de las fotografías actualizado.");return}
    if(action==="delete"){
      const photo=photos[index],count=photoCopies(photo.id).length;
      if(!confirm(`Se eliminará «${photo.titulo||"Sin título"}» de ${count} ficha${count===1?"":"s"} y también su archivo físico. ¿Continuar?`))return;
      try{await deleteFileFromPath(photo.src)}catch(err){if(err.name!=="NotFoundError")throw err}
      for(const copy of photoCopies(photo.id)){
        copy.person.fotografias.splice(copy.index,1);
        if(copy.person.fotografia_principal===photo.src)copy.person.fotografia_principal=copy.person.fotografias[0]?.src||"";
      }
      await writePeople();await renderGallery();showResult(managerResult,"Fotografía eliminada de todas las fichas correctamente.")
    }
  }catch(err){showResult(managerResult,`No se pudo completar la operación: ${escapeHtml(err.message)}`,true)}
});
savePhoto.addEventListener("click",async()=>{
  hideResult(editorResult);savePhoto.disabled=true;savePhoto.textContent="Guardando…";
  try{
    const owner=currentPerson();if(!owner)throw new Error("No se ha encontrado la persona seleccionada.");
    const personIds=selectedPersonIds();if(!personIds.length)throw new Error("Selecciona al menos una persona que aparezca en la fotografía.");
    let photo;
    if(editingIndex===null){
      const dir=await ensurePhotoDirectory(owner.id);const filename=await uniqueFilename(dir,selectedFile.name);const imageHandle=await dir.getFileHandle(filename,{create:true});const writable=await imageHandle.createWritable();await writable.write(selectedFile);await writable.close();
      photo={id:photoIdInput.value||nextPhotoId(),src:`assets/fotos/${owner.id}/${filename}`};
    }else{
      photo=canonicalPhoto(editingPhotoId);if(!photo)throw new Error("No se ha encontrado la fotografía que se estaba editando.");
    }
    photo={...photo,titulo:titleInput.value.trim(),fecha:dateInput.value.trim(),lugar:placeInput.value.trim(),descripcion:descriptionInput.value.trim(),etiquetas:tagsInput.value.split(",").map(t=>t.trim()).filter(Boolean),personas:[...personIds]};
    syncPhotoAssociations(photo,personIds);
    if(principalInput.checked||!owner.fotografia_principal)owner.fotografia_principal=photo.src;
    else if(editingIndex!==null&&owner.fotografia_principal===photo.src&&!principalInput.checked)owner.fotografia_principal=owner.fotografias.find(p=>p.src!==photo.src)?.src||"";
    await writePeople();await renderGallery();showResult(managerResult,editingIndex===null?`Fotografía añadida y asociada a ${personIds.length} persona${personIds.length===1?"":"s"}.`:`Fotografía actualizada en ${personIds.length} persona${personIds.length===1?"":"s"}.`);closeEditorPanel()
  }catch(err){showResult(editorResult,`No se pudo guardar la fotografía: ${escapeHtml(err.message)}`,true)}finally{savePhoto.textContent="Guardar fotografía";updateSaveState()}
});
setManagerEnabled(false);renderGallery();
