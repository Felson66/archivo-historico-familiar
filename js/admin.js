let rootHandle = null;
let people = [];
let selectedFile = null;

const $ = (id) => document.getElementById(id);
const connectFolder = $("connectFolder");
const folderStatus = $("folderStatus");
const editor = $("editor");
const personSelect = $("personSelect");
const photoInput = $("photoInput");
const previewWrap = $("previewWrap");
const preview = $("preview");
const titleInput = $("titleInput");
const dateInput = $("dateInput");
const placeInput = $("placeInput");
const descriptionInput = $("descriptionInput");
const principalInput = $("principalInput");
const savePhoto = $("savePhoto");
const clearForm = $("clearForm");
const resultBox = $("resultBox");

function showResult(message, error=false){
  resultBox.innerHTML = message;
  resultBox.classList.remove("hidden","error");
  if(error) resultBox.classList.add("error");
}

function hideResult(){
  resultBox.classList.add("hidden");
  resultBox.classList.remove("error");
}

function setEditorEnabled(enabled){
  editor.classList.toggle("is-disabled", !enabled);
  editor.setAttribute("aria-disabled", String(!enabled));
  [personSelect,photoInput,titleInput,dateInput,placeInput,descriptionInput,principalInput,clearForm]
    .forEach(el => el.disabled = !enabled);
  updateSaveState();
}

function updateSaveState(){
  savePhoto.disabled = !(rootHandle && personSelect.value && selectedFile && titleInput.value.trim());
}

function sanitizeFilename(name){
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ".jpg";
  const base = (dot >= 0 ? name.slice(0,dot) : name)
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"").slice(0,60) || "fotografia";
  return {base, ext};
}

async function getPersonasFile(){
  const dataDir = await rootHandle.getDirectoryHandle("data");
  return await dataDir.getFileHandle("personas.json");
}

async function readPeople(){
  const fileHandle = await getPersonasFile();
  const file = await fileHandle.getFile();
  const parsed = JSON.parse(await file.text());
  if(!Array.isArray(parsed)) throw new Error("El archivo personas.json no contiene una lista válida.");
  return parsed;
}

async function writePeople(updated){
  const fileHandle = await getPersonasFile();
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(updated, null, 2) + "\n");
  await writable.close();
}

async function ensurePhotoDirectory(personId){
  const assets = await rootHandle.getDirectoryHandle("assets");
  const fotos = await assets.getDirectoryHandle("fotos", {create:true});
  return await fotos.getDirectoryHandle(personId, {create:true});
}

async function uniqueFilename(dirHandle, originalName){
  const {base, ext} = sanitizeFilename(originalName);
  let candidate = `${base}${ext}`;
  let n = 2;
  while(true){
    try{
      await dirHandle.getFileHandle(candidate);
      candidate = `${base}-${n}${ext}`;
      n++;
    }catch(err){
      if(err.name === "NotFoundError") return candidate;
      throw err;
    }
  }
}

function populatePeople(){
  personSelect.innerHTML = `<option value="">Selecciona una persona…</option>` +
    [...people].sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"))
      .map(p=>`<option value="${p.id}">${p.nombre} · ${p.id}</option>`).join("");
}

connectFolder.addEventListener("click", async ()=>{
  hideResult();
  if(!("showDirectoryPicker" in window)){
    showResult("Este navegador no permite modificar una carpeta local. Abre esta página en <strong>Chrome o Edge desde Windows</strong>.", true);
    return;
  }
  try{
    rootHandle = await window.showDirectoryPicker({mode:"readwrite"});
    people = await readPeople();
    populatePeople();
    folderStatus.textContent = `Carpeta conectada: ${rootHandle.name}. Se han cargado ${people.length} personas.`;
    folderStatus.classList.add("ok");
    setEditorEnabled(true);
  }catch(err){
    if(err.name !== "AbortError"){
      rootHandle = null;
      setEditorEnabled(false);
      showResult(`No se pudo abrir el archivo: ${err.message}`, true);
    }
  }
});

photoInput.addEventListener("change", ()=>{
  hideResult();
  selectedFile = photoInput.files?.[0] || null;
  if(selectedFile){
    preview.src = URL.createObjectURL(selectedFile);
    previewWrap.classList.remove("hidden");
    if(!titleInput.value.trim()){
      const clean = selectedFile.name.replace(/\.[^.]+$/,"").replace(/[-_]+/g," ");
      titleInput.value = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }else{
    previewWrap.classList.add("hidden");
    preview.removeAttribute("src");
  }
  updateSaveState();
});

[personSelect,titleInput].forEach(el=>el.addEventListener("input",updateSaveState));

clearForm.addEventListener("click", ()=>{
  photoInput.value = "";
  selectedFile = null;
  preview.removeAttribute("src");
  previewWrap.classList.add("hidden");
  titleInput.value = "";
  dateInput.value = "";
  placeInput.value = "";
  descriptionInput.value = "";
  principalInput.checked = false;
  hideResult();
  updateSaveState();
});

savePhoto.addEventListener("click", async ()=>{
  hideResult();
  savePhoto.disabled = true;
  savePhoto.textContent = "Guardando…";
  try{
    const person = people.find(p=>p.id === personSelect.value);
    if(!person) throw new Error("No se ha encontrado la persona seleccionada.");

    const dir = await ensurePhotoDirectory(person.id);
    const filename = await uniqueFilename(dir, selectedFile.name);
    const imageHandle = await dir.getFileHandle(filename, {create:true});
    const imageWritable = await imageHandle.createWritable();
    await imageWritable.write(selectedFile);
    await imageWritable.close();

    const relativePath = `assets/fotos/${person.id}/${filename}`;
    const entry = {
      src: relativePath,
      titulo: titleInput.value.trim(),
      fecha: dateInput.value.trim(),
      lugar: placeInput.value.trim(),
      descripcion: descriptionInput.value.trim(),
      personas: [person.id],
      etiquetas: []
    };

    if(!Array.isArray(person.fotografias)) person.fotografias = [];
    person.fotografias.push(entry);
    if(principalInput.checked || !person.fotografia_principal){
      person.fotografia_principal = relativePath;
    }

    await writePeople(people);

    showResult(
      `<strong>Fotografía guardada correctamente.</strong><br>` +
      `Se ha copiado en <code>${relativePath}</code> y se ha actualizado <code>data/personas.json</code>.<br>` +
      `Ahora abre GitHub Desktop, haz <strong>Commit</strong> y después <strong>Push origin</strong>.`
    );

    photoInput.value = "";
    selectedFile = null;
    preview.removeAttribute("src");
    previewWrap.classList.add("hidden");
    titleInput.value = "";
    dateInput.value = "";
    placeInput.value = "";
    descriptionInput.value = "";
    principalInput.checked = false;
  }catch(err){
    showResult(`No se pudo guardar la fotografía: ${err.message}`, true);
  }finally{
    savePhoto.textContent = "Guardar fotografía";
    updateSaveState();
  }
});

setEditorEnabled(false);
