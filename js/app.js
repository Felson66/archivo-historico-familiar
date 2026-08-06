let PEOPLE = [];
let byId = {};
let currentView = "people";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();


function photoPosition(person){
  const raw = String(person?.fotoPosicion || "").trim();
  const match = raw.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if(!match) return "";
  const x = Math.min(100,Math.max(0,Number(match[1])));
  const y = Math.min(100,Math.max(0,Number(match[2])));
  return `${x}% ${y}%`;
}

function photoPositionStyle(person){
  const value = photoPosition(person);
  return value ? ` style="object-position:${value}"` : "";
}



function isPublicPerson(person){
  return person?.visible !== false;
}

function publicPeople(){
  return PEOPLE.filter(isPublicPerson);
}

function cleanText(value){
  return String(value ?? "").trim();
}

function personLifeSummary(person){
  const birth = [cleanText(person?.fecha_nacimiento), cleanText(person?.lugar_nacimiento)]
    .filter(Boolean).join(" · ");
  const deathParts = [];
  if(cleanText(person?.fecha_defuncion)) deathParts.push(`† ${cleanText(person.fecha_defuncion)}`);
  if(cleanText(person?.lugar_defuncion)) deathParts.push(cleanText(person.lugar_defuncion));
  const death = deathParts.join(" · ");

  if(birth || death) return [birth,death].filter(Boolean).join(" — ");
  return cleanText(person?.datos_resumen) || cleanText(person?.rol) || "Información en elaboración";
}

function personProfileSummary(person){
  const main = personLifeSummary(person);
  const role = cleanText(person?.rol);
  const profession = cleanText(person?.profesion);
  const extras = [role,profession].filter((value,index,array) =>
    value && !main.toLowerCase().includes(value.toLowerCase()) &&
    array.findIndex(item => item.toLowerCase() === value.toLowerCase()) === index
  );
  return [main,...extras].filter(Boolean).join(" · ");
}

function stateLabel(state){
  const x = (state || "").toLowerCase();
  if (x.includes("document")) return "Documentado";
  if (x.includes("hipot")) return "Hipótesis";
  if (x.includes("memoria")) return "Memoria familiar";
  if (x.includes("reconst")) return "Familia reconstituida";
  return "Pendiente";
}

function card(person,mode="standard"){
  const hasPhoto = Boolean(person.fotografia_principal);
  const thumb = hasPhoto
    ? `<img class="card-photo" src="${esc(person.fotografia_principal)}" alt="${esc(person.nombre)}" loading="lazy"${photoPositionStyle(person)}>`
    : `<div class="card-monogram">${esc(initials(person.nombre))}</div>`;

  const compact = mode === "compact";
  return `<button class="card ${hasPhoto ? "has-photo" : ""} ${compact ? "card-compact" : ""}" data-person="${esc(person.id)}">
    <div class="card-media">${thumb}</div>
    <div class="card-body">
      <span class="tag">${esc(stateLabel(person.estado))}</span>
      <h4>${esc(person.nombre)}</h4>
      <p>${esc(personLifeSummary(person))}</p>
    </div>
  </button>`;
}


async function ensureCurrentApplicationVersion(){
  const localVersion=document.documentElement.dataset.appVersion||"";
  if(!localVersion)return;

  try{
    const response=await fetch(`VERSION.txt?check=${Date.now()}`,{cache:"no-store"});
    if(!response.ok)return;
    const text=await response.text();
    const remoteVersion=text.match(/VERSI[ÓO]N:\s*([^\s]+)/i)?.[1]||"";
    if(!remoteVersion||remoteVersion===localVersion)return;

    const url=new URL(window.location.href);
    if(url.searchParams.get("v")===remoteVersion)return;
    url.searchParams.set("v",remoteVersion);
    window.location.replace(url.toString());
  }catch(_error){
    // La aplicación sigue funcionando aunque VERSION.txt no esté disponible.
  }
}

async function init(){
  try{
    const response = await fetch("data/personas.json", {cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo cargar personas.json");
    PEOPLE = await response.json();
    byId = Object.fromEntries(PEOPLE.map(person => [person.id, person]));
    rebuildRelationIndex();

    renderPeople();
    populateTreePersonSelect();
    try{
      buildTree(treeFocusId);
      fitTreeToView();
    }catch(treeError){
      console.error("El árbol no se ha podido inicializar, pero las fichas siguen disponibles.", treeError);
    }

    // El archivo ya está cargado. Las interacciones globales se registran
    // en wireEvents(), antes de init(), para que nunca dependan del árbol.
    $("loading").classList.add("hidden");
  }catch(error){
    $("loading").textContent = "No se han podido cargar los datos. Publica todos los archivos y carpetas en GitHub.";
    console.error(error);
  }
}

function showView(id){
  if(id === "home") id = "people";
  currentView = id;
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.view === id));
  window.scrollTo({top:0, behavior:"smooth"});
}

function renderPeople(){
  const visiblePeople = publicPeople();
  const query = ($("peopleSearch").value || "").trim().toLowerCase();
  const filtered = visiblePeople
    .filter(person => JSON.stringify([
      person.nombre,person.datos_resumen,person.rol,person.profesion,
      person.fecha_nacimiento,person.lugar_nacimiento,
      person.fecha_defuncion,person.lugar_defuncion,person.hechos
    ]).toLowerCase().includes(query))
    .sort((a,b) => a.nombre.localeCompare(b.nombre,"es"));
  $("peopleCount").textContent = `${filtered.length} ${filtered.length === 1 ? "persona" : "personas"}`;
  $("peopleGrid").innerHTML = filtered.length ? filtered.map(person => card(person,"compact")).join("") : `<div class="empty">No se han encontrado coincidencias.</div>`;
}

function relationButtons(ids, emptyText="No consta"){
  const related = (ids || []).map(id => byId[id]).filter(Boolean);
  if(!related.length) return `<div class="placeholder">${esc(emptyText)}</div>`;
  return `<div class="relation-list">${related.map(person => `
    <button class="relation-button" data-person="${esc(person.id)}">
      ${esc(person.nombre)}
      <span>${esc(personLifeSummary(person))}</span>
    </button>`).join("")}</div>`;
}


const RELATION_INDEX = {
  parents:new Map(),
  children:new Map(),
  spouses:new Map()
};

function normalizedRelationIds(value){
  const values=Array.isArray(value)?value:[value];
  const result=[];
  const seen=new Set();

  values.flat(Infinity).forEach(raw=>{
    const id=String(raw||"").trim();
    if(!id||seen.has(id)||!byId[id])return;
    seen.add(id);
    result.push(id);
  });

  return result;
}

function addIndexedRelation(map,sourceId,targetId){
  if(!sourceId||!targetId||sourceId===targetId||!byId[sourceId]||!byId[targetId])return;
  if(!map.has(sourceId))map.set(sourceId,new Set());
  map.get(sourceId).add(targetId);
}

function rebuildRelationIndex(){
  RELATION_INDEX.parents.clear();
  RELATION_INDEX.children.clear();
  RELATION_INDEX.spouses.clear();

  PEOPLE.forEach(person=>{
    const canonicalParents=[
      ...normalizedRelationIds(person.padre),
      ...normalizedRelationIds(person.madre)
    ];

    // Compatibilidad temporal para personas que todavía no hayan sido
    // guardadas desde el editor de relaciones.
    const legacyParents=normalizedRelationIds(person.padres);
    const parents=canonicalParents.length ? canonicalParents : legacyParents;

    parents.forEach(parentId=>{
      addIndexedRelation(RELATION_INDEX.parents,person.id,parentId);
      addIndexedRelation(RELATION_INDEX.children,parentId,person.id);
    });

    normalizedRelationIds(person.conyuges).forEach(spouseId=>{
      addIndexedRelation(RELATION_INDEX.spouses,person.id,spouseId);
      addIndexedRelation(RELATION_INDEX.spouses,spouseId,person.id);
    });
  });

  // Compatibilidad de seguridad con hijos heredados. Solo añade relaciones
  // que no contradicen la fuente canónica.
  PEOPLE.forEach(person=>{
    normalizedRelationIds(person.hijos).forEach(childId=>{
      const childParents=RELATION_INDEX.parents.get(childId);
      if(!childParents || childParents.size===0){
        addIndexedRelation(RELATION_INDEX.parents,childId,person.id);
        addIndexedRelation(RELATION_INDEX.children,person.id,childId);
      }
    });
  });
}

function relationIdsFromIndex(map,person){
  if(!person)return[];
  return [...(map.get(person.id)||new Set())].filter(id=>byId[id]);
}

function parentIdsFor(person){
  if(!person)return[];

  const indexed=relationIdsFromIndex(RELATION_INDEX.parents,person);
  const father=normalizedRelationIds(person.padre)[0];
  const mother=normalizedRelationIds(person.madre)[0];

  return [
    father,
    mother,
    ...indexed.filter(id=>id!==father&&id!==mother)
  ].filter(Boolean);
}

function childIdsFor(person){
  return relationIdsFromIndex(RELATION_INDEX.children,person)
    .sort((a,b)=>byId[a].nombre.localeCompare(byId[b].nombre,"es"));
}

function spouseIdsFor(person){
  return relationIdsFromIndex(RELATION_INDEX.spouses,person)
    .sort((a,b)=>byId[a].nombre.localeCompare(byId[b].nombre,"es"));
}

function siblingGroups(person){
  const ownParents=parentIdsFor(person);
  if(!ownParents.length){
    return {full:[],half:[],commonParent:[]};
  }

  const ownSet=new Set(ownParents);
  const candidates=new Set(
    ownParents.flatMap(parentId=>
      [...(RELATION_INDEX.children.get(parentId)||new Set())]
    )
  );
  candidates.delete(person.id);

  const full=[];
  const half=[];
  const commonParent=[];

  candidates.forEach(candidateId=>{
    const candidate=byId[candidateId];
    if(!candidate)return;

    const candidateParents=parentIdsFor(candidate);
    const shared=candidateParents.filter(id=>ownSet.has(id));

    if(shared.length>=2){
      full.push(candidateId);
    }else if(ownParents.length>=2&&candidateParents.length>=2){
      half.push(candidateId);
    }else if(shared.length===1){
      commonParent.push(candidateId);
    }
  });

  const sortIds=ids=>[...new Set(ids)]
    .filter(id=>byId[id])
    .sort((a,b)=>byId[a].nombre.localeCompare(byId[b].nombre,"es"));

  return {
    full:sortIds(full),
    half:sortIds(half),
    commonParent:sortIds(commonParent)
  };
}


function familyGroup(title, ids, emptyText="No consta"){
  const count = (ids || []).map(id => byId[id]).filter(Boolean).length;
  return `<div class="family-group">
    <h4>${esc(title)}${count ? ` <span class="family-count">${count}</span>` : ""}</h4>
    ${relationButtons(ids, emptyText)}
  </div>`;
}

function renderFamily(person){
  const parents = parentIdsFor(person);
  const siblings = siblingGroups(person);
  const hasAnySibling = siblings.full.length || siblings.half.length || siblings.commonParent.length;

  return `<div class="family-block">
    ${familyGroup("Padres", parents, "No constan padres registrados")}
    ${siblings.full.length
      ? familyGroup("Hermanos", siblings.full)
      : (!hasAnySibling
          ? familyGroup("Hermanos", [], parents.length ? "No constan otros hijos de sus padres" : "No se pueden calcular sin padres registrados")
          : "")}
    ${siblings.half.length ? familyGroup("Medios hermanos", siblings.half) : ""}
    ${siblings.commonParent.length ? familyGroup("Hermanos con un progenitor común", siblings.commonParent) : ""}
    ${familyGroup("Cónyuges", spouseIdsFor(person), "No consta cónyuge")}
    ${familyGroup("Hijos", childIdsFor(person), "No constan hijos")}
  </div>`;
}

function renderFacts(person){
  const facts = person.hechos || [];
  if(!facts.length) return `<div class="placeholder">Biografía en elaboración.</div>`;
  return facts.map(item => `<div class="fact">
    <span class="badge">${esc(stateLabel(item.tipo))}</span>
    <div style="margin-top:8px">${esc(item.texto)}</div>
  </div>`).join("");
}

function photoCaption(photo, person, index){
  const title = photo.titulo || `Fotografía ${index + 1}`;
  const meta = [photo.fecha, photo.lugar].filter(Boolean).join(" · ");
  return `
    <span class="photo-caption-title">${esc(title)}</span>
    ${meta ? `<span class="photo-caption-meta">${esc(meta)}</span>` : ""}
  `;
}

function renderGallery(person){
  const photos = person.fotografias || [];
  if(!photos.length) return `<div class="placeholder">Todavía no hay fotografías asociadas.</div>`;
  return `
    <div class="photo-count-label">📷 ${photos.length} ${photos.length === 1 ? "fotografía" : "fotografías"}</div>
    <div class="photo-grid">${photos.map((photo,index) => `
      <button class="photo-thumb ${index === 0 ? "photo-featured" : ""}" data-gallery-person="${esc(person.id)}" data-gallery-index="${index}">
        <img src="${esc(photo.src)}" alt="${esc(photo.titulo || person.nombre)}" loading="lazy">
        <span class="photo-caption">${photoCaption(photo, person, index)}</span>
      </button>`).join("")}
    </div>`;
}


function documentPath(doc){ return doc.src || doc.ruta || doc.url || ""; }
function documentExtension(doc){ const path=documentPath(doc); return (doc.nombre_archivo||path).split(".").pop()?.toLowerCase()||""; }
function documentIcon(doc){ return documentExtension(doc)==="pdf" ? "PDF" : "IMG"; }

function renderDocuments(person){
  const docs=person.documentos||[];
  if(!docs.length) return `<div class="placeholder">Todavía no hay documentos asociados.</div>`;
  return `<div class="document-list">${docs.map(doc=>{
    const title=doc.titulo||doc.nombre_archivo||"Documento";
    const description=doc.descripcion||"";
    const meta=[doc.fecha, documentExtension(doc).toUpperCase()].filter(Boolean).join(" · ");
    const pageCount=Array.isArray(doc.paginas)?doc.paginas.length:0;
    return `<button type="button" class="document-card" data-document-url="1" data-document-id="${esc(doc.id)}" data-person-id="${esc(person.id)}">
      <div class="document-icon" aria-hidden="true">${documentIcon(doc)}</div>
      <div class="document-info">
        <strong>${esc(title)}</strong>
        ${meta?`<span class="document-meta">${esc(meta)}</span>`:""}
        ${description?`<span class="document-description">${esc(description)}</span>`:""}
        <span class="document-open">${isTextDocument(doc)?"Leer documento":isImageDocumentPublic(doc)?"Ver imagen":pageCount?`Consultar ${pageCount} página${pageCount===1?"":"s"}`:"Preparar vista desde Administración"} <span aria-hidden="true">→</span></span>
      </div>
    </button>`;
  }).join("")}</div>`;
}


function isTextDocument(doc){
  const path=String(doc?.archivo||doc?.src||doc?.url||doc?.nombre_archivo||"").toLowerCase();
  const type=String(doc?.tipo||doc?.formato||"").toLowerCase();
  return type==="txt"||type.includes("texto")||path.endsWith(".txt");
}

function isImageDocumentPublic(doc){
  const path=String(doc?.archivo||doc?.src||doc?.url||doc?.nombre_archivo||"").toLowerCase();
  const type=String(doc?.tipo||doc?.formato||"").toLowerCase();
  return type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(path);
}


async function fetchTextDocument(doc){
  const path=doc?.archivo||doc?.src||doc?.url;
  if(!path)throw new Error("El documento no tiene una ruta válida.");
  const response=await fetch(path,{cache:"no-store"});
  if(!response.ok)throw new Error(`No se pudo cargar el texto (${response.status}).`);
  const buffer=await response.arrayBuffer();
  let text=new TextDecoder("utf-8",{fatal:false}).decode(buffer);
  if((text.match(/\uFFFD/g)||[]).length>2){
    try{text=new TextDecoder("windows-1252",{fatal:false}).decode(buffer)}catch{}
  }
  return text.replace(/\r\n?/g,"\n");
}

async function openTextDocumentViewer(doc){
  activeDocumentViewer = ensureDocumentViewer();

  activeDocumentViewer.querySelector("#ahDocTitleV357").textContent =
    doc.titulo || doc.nombre_archivo || "Documento de texto";

  const description = activeDocumentViewer.querySelector("#ahDocDescriptionV357");
  description.textContent = doc.descripcion || doc.fecha || "";
  description.hidden = !description.textContent;

  const counter = activeDocumentViewer.querySelector("#ahDocCounterV357");
  counter.textContent = "Documento de texto";

  const body = activeDocumentViewer.querySelector("#ahDocBodyV357");
  const footer = activeDocumentViewer.querySelector(".ah-doc-footer-v357");
  footer.hidden = true;

  body.innerHTML = `<div class="ah-doc-text-loading">Cargando documento…</div>`;

  activeDocumentViewer.classList.add("open");
  activeDocumentViewer.setAttribute("aria-hidden","false");
  document.body.classList.add("ah-doc-open-v357");

  try{
    const text = await fetchTextDocument(doc);
    body.innerHTML = `<pre class="ah-doc-text-content">${esc(text)}</pre>`;
    body.scrollTo({top:0,left:0,behavior:"auto"});
  }catch(error){
    body.innerHTML = `
      <div class="ah-doc-error-v357">
        <strong>No se pudo abrir el documento de texto.</strong>
        <p>${esc(error.message)}</p>
      </div>`;
  }
}

function ensureDocumentViewer(){
  // Elimina cualquier visor heredado de versiones anteriores.
  document.querySelectorAll("#documentViewer, .document-viewer, #ahDocumentViewerV357").forEach(node => node.remove());

  const viewer = document.createElement("div");
  viewer.id = "ahDocumentViewerV357";
  viewer.className = "ah-doc-viewer-v357";
  viewer.setAttribute("aria-hidden", "true");
  viewer.innerHTML = `
    <section class="ah-doc-panel-v357" role="dialog" aria-modal="true" aria-labelledby="ahDocTitleV357">
      <header class="ah-doc-header-v357">
        <div class="ah-doc-heading-v357">
          <strong id="ahDocTitleV357">Documento</strong>
          <small id="ahDocDescriptionV357"></small>
          <small id="ahDocCounterV357"></small>
        </div>
        <button id="ahDocCloseV357" class="ah-doc-close-v357" type="button" aria-label="Cerrar documento">×</button>
      </header>
      <main id="ahDocBodyV357" class="ah-doc-body-v357"></main>
      <footer class="ah-doc-footer-v357">
        <button id="ahDocPrevV357" type="button">‹ Anterior</button>
        <button id="ahDocNextV357" type="button">Siguiente ›</button>
      </footer>
    </section>`;

  document.body.appendChild(viewer);
  viewer.querySelector("#ahDocCloseV357").addEventListener("click", closeDocumentViewer);
  return viewer;
}

let currentDocumentPages = [];
let currentDocumentPage = 0;
let activeDocumentViewer = null;

function showDocumentPage(){
  const viewer = activeDocumentViewer;
  if(!viewer || !currentDocumentPages.length) return;

  const body = viewer.querySelector("#ahDocBodyV357");
  const counter = viewer.querySelector("#ahDocCounterV357");
  const prev = viewer.querySelector("#ahDocPrevV357");
  const next = viewer.querySelector("#ahDocNextV357");

  body.replaceChildren();
  const image = document.createElement("img");
  image.className = "ah-doc-page-v357";
  image.src = currentDocumentPages[currentDocumentPage];
  image.alt = `Página ${currentDocumentPage + 1}`;
  body.appendChild(image);

  counter.textContent = `Página ${currentDocumentPage + 1} de ${currentDocumentPages.length}`;
  prev.disabled = currentDocumentPage === 0;
  next.disabled = currentDocumentPage === currentDocumentPages.length - 1;
  body.scrollTo({top:0, left:0, behavior:"auto"});
}

function openDocumentViewer(documentId, personId){
  const person=byId[personId];
  const doc=(person?.documentos||[]).find(item=>item.id===documentId);
  if(doc&&isTextDocument(doc)){
    openTextDocumentViewer(doc);
    return;
  }
  if(!doc) return;

  activeDocumentViewer = ensureDocumentViewer();

  if(isImageDocumentPublic(doc)){
    activeDocumentViewer.querySelector(".ah-doc-footer-v357").hidden = true;
    activeDocumentViewer.querySelector("#ahDocTitleV357").textContent = doc.titulo || doc.nombre_archivo || "Imagen";

    const description = activeDocumentViewer.querySelector("#ahDocDescriptionV357");
    description.textContent = doc.descripcion || doc.fecha || "";
    description.hidden = !description.textContent;

    activeDocumentViewer.querySelector("#ahDocCounterV357").textContent = "Imagen";

    const body = activeDocumentViewer.querySelector("#ahDocBodyV357");
    body.innerHTML = "";
    const image = document.createElement("img");
    image.className = "ah-doc-image-v403";
    image.src = documentPath(doc);
    image.alt = doc.titulo || doc.nombre_archivo || "Documento gráfico";
    body.appendChild(image);
    body.scrollTo({top:0,left:0,behavior:"auto"});

    activeDocumentViewer.classList.add("open");
    activeDocumentViewer.setAttribute("aria-hidden","false");
    document.body.classList.add("ah-doc-open-v357");
    return;
  }

  activeDocumentViewer.querySelector(".ah-doc-footer-v357").hidden = false;
  activeDocumentViewer.querySelector("#ahDocTitleV357").textContent = doc.titulo || doc.nombre_archivo || "Documento";

  const description = activeDocumentViewer.querySelector("#ahDocDescriptionV357");
  description.textContent = doc.descripcion || doc.fecha || "";
  description.hidden = !description.textContent;

  currentDocumentPages = Array.isArray(doc.paginas) ? doc.paginas.filter(Boolean) : [];
  currentDocumentPage = 0;

  const prev = activeDocumentViewer.querySelector("#ahDocPrevV357");
  const next = activeDocumentViewer.querySelector("#ahDocNextV357");
  prev.addEventListener("click", () => {
    if(currentDocumentPage > 0){
      currentDocumentPage -= 1;
      showDocumentPage();
    }
  });
  next.addEventListener("click", () => {
    if(currentDocumentPage < currentDocumentPages.length - 1){
      currentDocumentPage += 1;
      showDocumentPage();
    }
  });

  if(currentDocumentPages.length){
    showDocumentPage();
  }else{
    activeDocumentViewer.querySelector("#ahDocBodyV357").innerHTML = `<div class="ah-doc-error-v357"><strong>Este documento todavía no tiene preparada su vista por páginas.</strong><p>Entra en Administración, abre Documentos y pulsa «Generar vista».</p></div>`;
    activeDocumentViewer.querySelector("#ahDocCounterV357").textContent = "";
    prev.disabled = true;
    next.disabled = true;
  }

  activeDocumentViewer.classList.add("open");
  activeDocumentViewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("ah-doc-open-v357");
}

function closeDocumentViewer(){
  if(activeDocumentViewer){
    activeDocumentViewer.remove();
    activeDocumentViewer = null;
  }
  document.body.classList.remove("ah-doc-open-v357");
  currentDocumentPages = [];
  currentDocumentPage = 0;
}

function renderTimeline(person){
  const entries = Array.isArray(person.cronologia) ? person.cronologia : [];
  if(!entries.length) return `<div class="placeholder">Cronología pendiente de organizar.</div>`;

  return `<div class="mini-timeline">${entries.map(entry => {
    if(typeof entry === "string"){
      return `<div class="timeline-item"><div>${esc(entry)}</div></div>`;
    }
    const date = entry.fecha || entry.anio || entry.año || entry.periodo || "";
    const text = entry.texto || entry.descripcion || entry.titulo || entry.hecho || "";
    return `<div class="timeline-item">
      ${date ? `<div class="timeline-year">${esc(date)}</div>` : ""}
      ${text ? `<div>${esc(text)}</div>` : ""}
    </div>`;
  }).join("")}</div>`;
}

function openPerson(id){
  const person = byId[id];
  if(!person) return;

  const photo = person.fotografia_principal
    ? `<img src="${esc(person.fotografia_principal)}" alt="${esc(person.nombre)}"${photoPositionStyle(person)}>`
    : `<div class="profile-monogram">${esc(initials(person.nombre))}</div>`;

  $("drawerContent").innerHTML = `
    <section class="profile-hero">
      <div class="profile-photo">${photo}</div>
      <div class="profile-intro">
        <span class="badge">${esc(stateLabel(person.estado))}</span>
        <h2>${esc(person.nombre)}</h2>
        <div class="profile-summary">${esc(personProfileSummary(person))}</div>
        <button class="profile-tree-button" type="button" data-tree-center="${esc(person.id)}">🌳 Ver en el árbol</button>
      </div>
    </section>

    <div class="profile-grid">
      <div>
        <section class="profile-section">
          <h3>Biografía y evidencias</h3>
          ${renderFacts(person)}
        </section>

        <section class="profile-section">
          <h3>Cronología</h3>
          ${renderTimeline(person)}
        </section>

        <section class="profile-section">
          <h3>Documentos</h3>
          ${renderDocuments(person)}
        </section>

        <section class="profile-section">
          <div class="section-heading-row">
            <h3>Fotografías</h3>
          </div>
          ${renderGallery(person)}
        </section>
      </div>

      <div>
        <section class="profile-section family-section">
          <h3>Familia</h3>
          ${renderFamily(person)}
        </section>

        <section class="profile-section">
          <h3>Lugares</h3>
          ${(person.lugares || []).length
            ? `<div class="relation-list">${person.lugares.map(lugar => `<div class="relation-button">${esc(lugar.nombre || lugar)}</div>`).join("")}</div>`
            : `<div class="placeholder">Lugares pendientes de organizar.</div>`}
        </section>

        <section class="profile-section">
          <h3>Observaciones</h3>
          ${(person.notas || []).length
            ? person.notas.map(nota => `<div class="fact">${esc(nota.texto || nota)}</div>`).join("")
            : `<div class="placeholder">Sin observaciones añadidas.</div>`}
        </section>
      </div>
    </div>`;

  $("drawerBackdrop").classList.add("open");
  $("personDrawer").classList.add("open");
  $("personDrawer").setAttribute("aria-hidden","false");
  document.body.classList.add("drawer-open");
  history.replaceState(null,"",`#persona=${encodeURIComponent(id)}`);
}

function openLightbox(personId, index){
  const person = byId[personId];
  const photos = person?.fotografias || [];
  if(!photos.length) return;
  let current = Number(index) || 0;

  const lightbox = document.getElementById("photoLightbox");
  const image = document.getElementById("lightboxImage");
  const title = document.getElementById("lightboxTitle");
  const meta = document.getElementById("lightboxMeta");
  const counter = document.getElementById("lightboxCounter");

  function show(){
    const photo = photos[current];
    image.src = photo.src;
    image.alt = photo.titulo || person.nombre;
    title.textContent = photo.titulo || person.nombre;
    meta.textContent = [photo.fecha, photo.lugar, photo.descripcion].filter(Boolean).join(" · ");
    counter.textContent = `${current + 1} / ${photos.length}`;
  }

  document.getElementById("lightboxPrev").onclick = () => {
    current = (current - 1 + photos.length) % photos.length;
    show();
  };
  document.getElementById("lightboxNext").onclick = () => {
    current = (current + 1) % photos.length;
    show();
  };

  show();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden","false");
}

function closeLightbox(){
  const lightbox = document.getElementById("photoLightbox");
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden","true");
}

function closeDrawer(){
  $("drawerBackdrop").classList.remove("open");
  $("personDrawer").classList.remove("open");
  $("personDrawer").setAttribute("aria-hidden","true");
  document.body.classList.remove("drawer-open");
  history.replaceState(null,"",location.pathname + location.search);
}


let treeFocusId = "P0015";
let treeShowSiblings = true;
let currentTreeLayout = {};
let currentTreeBounds = {width:1400,height:980};

function populateTreePersonSelect(){
  const select = $("treePersonSelect");
  if(!select) return;

  const sorted = publicPeople().sort((a,b) => a.nombre.localeCompare(b.nombre,"es"));
  select.innerHTML = sorted.map(person =>
    `<option value="${esc(person.id)}">${esc(person.nombre)}</option>`
  ).join("");

  if(!byId[treeFocusId]){
    treeFocusId = byId["P0007"] ? "P0007" : (sorted[0]?.id || "");
  }
  select.value = treeFocusId;
}

function uniqueIds(ids){
  return [...new Set((ids || []).filter(id => byId[id]))];
}

function treeLifeYears(person){
  const birth=String(person.fecha_nacimiento||"").match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1]||"";
  const death=String(person.fecha_defuncion||"").match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1]||"";
  if(birth&&death)return `${birth}–${death}`;
  if(birth)return `${birth}–`;
  if(death)return `† ${death}`;
  return "";
}

function treeDocumentationLevel(person){
  const photos=Array.isArray(person.fotografias)?person.fotografias.length:0;
  const documents=Array.isArray(person.documentos)?person.documentos.length:0;
  const facts=Array.isArray(person.hechos)?person.hechos.length:0;
  const score=(photos>0?1:0)+(documents>0?1:0)+(facts>0?1:0);
  if(score>=3)return"high";
  if(score>=1)return"medium";
  return"low";
}

function treeNodeLabel(person){
  const photo=String(person.fotografia_principal||"").trim();
  const years=treeLifeYears(person);
  const profession=String(person.profesion||"").trim();
  const photos=Array.isArray(person.fotografias)?person.fotografias.length:0;
  const documents=Array.isArray(person.documentos)?person.documentos.length:0;
  const state=treeDocumentationLevel(person);

  const avatar=photo
    ? `<img class="tree-card-photo" src="${esc(photo)}" alt="">`
    : `<span class="tree-card-placeholder" aria-hidden="true">👤</span>`;

  const meta=[years,profession]
    .filter(Boolean)
    .map(item=>`<span>${esc(item)}</span>`)
    .join("");

  const counters=[
    photos?`<span title="Fotografías">📷 ${photos}</span>`:"",
    documents?`<span title="Documentos">📄 ${documents}</span>`:""
  ].filter(Boolean).join("");

  return `<div class="tree-person-card tree-doc-${state}" data-person-id="${esc(person.id)}">
    <div class="tree-card-avatar">${avatar}</div>
    <div class="tree-card-content">
      <strong>${esc(person.nombre)}</strong>
      ${meta?`<div class="tree-card-meta">${meta}</div>`:""}
      ${counters?`<div class="tree-card-counters">${counters}</div>`:""}
    </div>
  </div>`;
}

function placeRow(ids,y,stageWidth,nodeWidth=210,gap=34){
  const unique = uniqueIds(ids);
  if(!unique.length) return;
  const total = unique.length * nodeWidth + Math.max(0,unique.length-1) * gap;
  let x = Math.max(40,(stageWidth-total)/2);
  unique.forEach(id => {
    currentTreeLayout[id] = [x,y];
    x += nodeWidth + gap;
  });
}

function buildTree(focusId=treeFocusId){
  const focus = byId[focusId] || PEOPLE[0];
  if(!focus) return;

  treeFocusId = focus.id;
  const select = $("treePersonSelect");
  if(select) select.value = treeFocusId;

  const parents = parentIdsFor(focus);
  const grandparents = uniqueIds(parents.flatMap(id => parentIdsFor(byId[id])));
  const siblingSets = siblingGroups(focus);
  const allSiblings = uniqueIds([
    ...siblingSets.full,
    ...siblingSets.half,
    ...siblingSets.commonParent
  ]);
  const siblings = treeShowSiblings ? allSiblings : [];
  const spouses = spouseIdsFor(focus);
  const children = childIdsFor(focus);

  const middleRow = [...siblings, focus.id, ...spouses];
  const widestCount = Math.max(
    grandparents.length,
    parents.length,
    middleRow.length,
    children.length,
    3
  );
  const stageWidth = Math.max(1300, widestCount * 244 + 160);
  const stageHeight = 1030;

  currentTreeLayout = {};
  currentTreeBounds = {width:stageWidth,height:stageHeight};

  placeRow(grandparents,70,stageWidth);
  placeRow(parents,300,stageWidth);
  placeRow(middleRow,555,stageWidth);
  placeRow(children,820,stageWidth);

  const stage = $("treeStage");
  const svg = $("treeSvg");
  stage.style.width = `${stageWidth}px`;
  stage.style.height = `${stageHeight}px`;
  svg.setAttribute("viewBox",`0 0 ${stageWidth} ${stageHeight}`);
  stage.querySelectorAll(".person-node, .tree-generation-label").forEach(node => node.remove());
  svg.innerHTML = "";

  const addBand = (y,height,label,className) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x","18");
    rect.setAttribute("y",String(y));
    rect.setAttribute("width",String(stageWidth-36));
    rect.setAttribute("height",String(height));
    rect.setAttribute("rx","22");
    rect.setAttribute("class",`tree-band tree-band-${className}`);
    svg.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg","text");
    text.setAttribute("x","38");
    text.setAttribute("y",String(y+30));
    text.setAttribute("class",`tree-band-label tree-band-label-${className}`);
    text.textContent = label;
    svg.appendChild(text);
  };

  addBand(40,190,"ABUELOS","grandparents");
  addBand(270,190,"PADRES","parents");
  addBand(515,190,"PERSONA Y FAMILIA","focus");
  addBand(785,205,"HIJOS","children");

  const addBranchBox = (ids,label,className) => {
    const valid = uniqueIds(ids).filter(id => currentTreeLayout[id]);
    if(!valid.length) return;
    const xs = valid.map(id => currentTreeLayout[id][0]);
    const minX = Math.min(...xs)-18;
    const maxX = Math.max(...xs)+210+18;
    const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x",String(minX));
    rect.setAttribute("y","52");
    rect.setAttribute("width",String(maxX-minX));
    rect.setAttribute("height","166");
    rect.setAttribute("rx","18");
    rect.setAttribute("class",`tree-branch-box tree-branch-${className}`);
    svg.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg","text");
    text.setAttribute("x",String((minX+maxX)/2));
    text.setAttribute("y","75");
    text.setAttribute("text-anchor","middle");
    text.setAttribute("class",`tree-branch-label tree-branch-label-${className}`);
    text.textContent = label;
    svg.appendChild(text);
  };

  if(parents[0]){
    addBranchBox(parentIdsFor(byId[parents[0]]),"RAMA PATERNA","paternal");
  }
  if(parents[1]){
    addBranchBox(parentIdsFor(byId[parents[1]]),"RAMA MATERNA","maternal");
  }

  const nodeWidth = 210;
  const nodeHeight = 104;
  const centerX = id => currentTreeLayout[id][0] + nodeWidth/2;
  const topY = id => currentTreeLayout[id][1];
  const bottomY = id => currentTreeLayout[id][1] + nodeHeight;

  const line = (d,type="family") => {
    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",d);
    path.setAttribute("class",`tree-line tree-line-${type}`);
    svg.appendChild(path);
  };

  const connectParentToChildren = (parentIds,childIds,barY) => {
    const validParents = uniqueIds(parentIds).filter(id => currentTreeLayout[id]);
    const validChildren = uniqueIds(childIds).filter(id => currentTreeLayout[id]);
    if(!validParents.length || !validChildren.length) return;

    const parentCenters = validParents.map(centerX);
    const parentMid = parentCenters.reduce((a,b)=>a+b,0)/parentCenters.length;
    if(validParents.length > 1){
      line(`M ${Math.min(...parentCenters)} ${bottomY(validParents[0])+12} H ${Math.max(...parentCenters)}`,"couple");
    }
    line(`M ${parentMid} ${Math.max(...validParents.map(bottomY))+12} V ${barY}`,"family");

    const childCenters = validChildren.map(centerX);
    if(childCenters.length > 1){
      line(`M ${Math.min(...childCenters)} ${barY} H ${Math.max(...childCenters)}`,"family");
    }
    validChildren.forEach(id => line(`M ${centerX(id)} ${barY} V ${topY(id)}`,"family"));
  };

  // Grandparents -> each parent.
  parents.forEach(parentId => {
    const gps = parentIdsFor(byId[parentId]).filter(id => currentTreeLayout[id]);
    connectParentToChildren(gps,[parentId],260);
  });

  // Parents -> focal person and siblings who share those parents.
  const sameGenerationChildren = uniqueIds([focus.id,...siblings]).filter(id => {
    const candidateParents = parentIdsFor(byId[id]);
    return candidateParents.some(parentId => parents.includes(parentId));
  });
  connectParentToChildren(parents,sameGenerationChildren,510);

  // Focus + spouse -> children.
  const childParents = [focus.id,...spouses].filter(id => currentTreeLayout[id]);
  connectParentToChildren(childParents,children,775);

  Object.entries(currentTreeLayout).forEach(([id,[x,y]]) => {
    const person = byId[id];
    if(!person) return;
    const node = document.createElement("button");
    const role = id === focus.id ? "focus" :
      grandparents.includes(id) ? "grandparent" :
      parents.includes(id) ? "parent" :
      spouses.includes(id) ? "spouse" :
      children.includes(id) ? "child" : "sibling";
    node.className = `person-node ${person.estado || ""} tree-role-${role}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    if(person.visible === false){
      node.classList.add("tree-person-hidden");
      node.disabled = true;
      node.removeAttribute("data-person");
    }else{
      node.dataset.person = id;
    }
    node.setAttribute("aria-label",`Abrir ficha de ${person.nombre}`);
    node.innerHTML = treeNodeLabel(person);
    stage.appendChild(node);
  });

  const context = $("treeContext");
  if(context){
    const parts = [
      `${parents.length} ${parents.length===1?"progenitor":"progenitores"}`,
      `${allSiblings.length} ${allSiblings.length===1?"hermano":"hermanos"}`,
      `${spouses.length} ${spouses.length===1?"cónyuge":"cónyuges"}`,
      `${children.length} ${children.length===1?"hijo":"hijos"}`
    ];
    context.innerHTML = `<strong>${esc(focus.nombre)}</strong><span>${parts.join(" · ")}</span>`;
  }
}

let transform = {x:0,y:0,scale:.52};
let drag = null;
let pinch = null;

function applyTreeTransform(){
  $("treeStage").style.transform = `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;
}
function fitTreeToView(){
  const shell = $("treeShell");
  if(!shell)return;

  const isMobile=shell.clientWidth<700;
  const padding=isMobile?18:36;
  const scaleX=(shell.clientWidth-padding*2)/currentTreeBounds.width;
  const scaleY=(shell.clientHeight-padding*2)/currentTreeBounds.height;
  let scale=Math.min(1,Math.max(.18,Math.min(scaleX,scaleY)));

  if(isMobile){
    scale=Math.max(scale,.48);
    const focusPosition=currentTreeLayout[treeFocusId];
    if(focusPosition){
      const focusCenterX=focusPosition[0]+105;
      const focusCenterY=focusPosition[1]+52;
      transform={
        x:shell.clientWidth/2-focusCenterX*scale,
        y:shell.clientHeight*.55-focusCenterY*scale,
        scale
      };
      applyTreeTransform();
      return;
    }
  }

  transform={
    x:(shell.clientWidth-currentTreeBounds.width*scale)/2,
    y:Math.max(16,(shell.clientHeight-currentTreeBounds.height*scale)/2),
    scale
  };
  applyTreeTransform();
}
function resetTree(){
  fitTreeToView();
}
function zoomTree(factor, centerX=null, centerY=null){
  const shell = $("treeShell");
  const rect = shell.getBoundingClientRect();
  const cx = centerX ?? rect.width/2;
  const cy = centerY ?? rect.height/2;
  const oldScale = transform.scale;
  const newScale = Math.min(1.25,Math.max(.18,oldScale*factor));
  transform.x = cx - (cx-transform.x)*(newScale/oldScale);
  transform.y = cy - (cy-transform.y)*(newScale/oldScale);
  transform.scale = newScale;
  applyTreeTransform();
}

function wireEvents(){
  // Delegación global: se activa antes de cargar datos o construir el árbol.
  // Así las fichas siguen funcionando aunque falle cualquier módulo secundario.
  document.addEventListener("click", event => {
    const treeCenterButton = event.target.closest("[data-tree-center]");
    if(treeCenterButton){
      event.preventDefault();
      const id = treeCenterButton.dataset.treeCenter;
      closeDrawer();
      showView("tree");
      buildTree(id);
      requestAnimationFrame(fitTreeToView);
      return;
    }

    const documentLink = event.target.closest("[data-document-url]");
    if(documentLink){
      event.preventDefault();
      openDocumentViewer(documentLink.dataset.documentId, documentLink.dataset.personId);
      return;
    }

    const galleryButton = event.target.closest("[data-gallery-person]");
    if(galleryButton){
      event.preventDefault();
      openLightbox(galleryButton.dataset.galleryPerson, galleryButton.dataset.galleryIndex);
      return;
    }

    const personButton = event.target.closest("[data-person]");
    if(personButton){
      event.preventDefault();
      openPerson(personButton.dataset.person);
    }
  });

  document.querySelectorAll(".bottom-nav button").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $("peopleSearch").addEventListener("input",renderPeople);
  $("clearSearch").addEventListener("click",() => { $("peopleSearch").value=""; renderPeople(); });
  $("drawerClose").addEventListener("click",closeDrawer);
  $("drawerBackdrop").addEventListener("click",closeDrawer);
  $("lightboxClose").addEventListener("click",closeLightbox);
  $("photoLightbox").addEventListener("click",event => { if(event.target.id === "photoLightbox") closeLightbox(); });
  document.addEventListener("keydown",event => {
    if(event.key === "Escape"){
      closeDocumentViewer();
      closeLightbox();
      closeDrawer();
    }
  });
  $("treePersonSelect").addEventListener("change",event => {
    buildTree(event.target.value);
    requestAnimationFrame(fitTreeToView);
  });
  $("toggleSiblings").addEventListener("click",event => {
    treeShowSiblings = !treeShowSiblings;
    event.currentTarget.classList.toggle("active",treeShowSiblings);
    event.currentTarget.setAttribute("aria-pressed",String(treeShowSiblings));
    buildTree(treeFocusId);
    requestAnimationFrame(fitTreeToView);
  });
  $("resetTree").addEventListener("click",resetTree);
  $("zoomIn").addEventListener("click",() => zoomTree(1.22));
  $("zoomOut").addEventListener("click",() => zoomTree(.82));

  const shell = $("treeShell");
  shell.addEventListener("pointerdown",event => {
    if(event.target.closest(".person-node")) return;
    shell.setPointerCapture(event.pointerId);
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,startX:transform.x,startY:transform.y};
  });
  shell.addEventListener("pointermove",event => {
    if(!drag || event.pointerId !== drag.id) return;
    transform.x = drag.startX + event.clientX-drag.x;
    transform.y = drag.startY + event.clientY-drag.y;
    applyTreeTransform();
  });
  shell.addEventListener("pointerup",event => { if(drag?.id === event.pointerId) drag=null; });
  shell.addEventListener("pointercancel",() => drag=null);
  shell.addEventListener("wheel",event => {
    event.preventDefault();
    const rect = shell.getBoundingClientRect();
    zoomTree(event.deltaY < 0 ? 1.12 : .89,event.clientX-rect.left,event.clientY-rect.top);
  },{passive:false});

  shell.addEventListener("touchstart",event => {
    if(event.touches.length === 2){
      const [a,b] = event.touches;
      pinch = {
        distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),
        scale:transform.scale
      };
    }
  },{passive:true});
  shell.addEventListener("touchmove",event => {
    if(event.touches.length === 2 && pinch){
      const [a,b] = event.touches;
      const distance = Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      const target = Math.min(1.25,Math.max(.18,pinch.scale*(distance/pinch.distance)));
      zoomTree(target/transform.scale);
    }
  },{passive:true});
  shell.addEventListener("touchend",() => pinch=null,{passive:true});
  window.addEventListener("resize",() => {
    if(currentView === "tree") fitTreeToView();
  });
}

ensureCurrentApplicationVersion();
wireEvents();
init();
