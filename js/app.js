let PEOPLE = [];
let byId = {};
let currentView = "people";
let currentFamilyBranch = localStorage.getItem("raicesFamilyBranch") || "conjunta";

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


const MONTH_NAMES_ES={ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,septiembre:9,set:9,setiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12};
function parseBirthDateForBirthday(value){
  const raw=cleanText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  if(!raw)return null;
  let m=raw.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);
  if(m){const day=+m[1],month=+m[2],year=+m[3];if(day>=1&&day<=31&&month>=1&&month<=12)return{day,month,year};}
  m=raw.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/);
  if(m){const day=+m[1],month=MONTH_NAMES_ES[m[2]],year=+m[3];if(day>=1&&day<=31&&month)return{day,month,year};}
  return null;
}
function livingBirthdayPeople(today=new Date()){
  return publicPeople().filter(p=>String(p?.situacion_vital||p?.situacionVital||"").toLowerCase()==="vivo")
    .map(person=>({person,birth:parseBirthDateForBirthday(person?.fecha_nacimiento)}))
    .filter(x=>x.birth&&x.birth.day===today.getDate()&&x.birth.month===today.getMonth()+1)
    .sort((a,b)=>a.person.nombre.localeCompare(b.person.nombre,"es"));
}
function dismissBirthdayToast(){
  const host=$("birthdayToastHost"),toast=host?.querySelector(".birthday-toast");
  if(!toast)return; toast.classList.remove("show"); setTimeout(()=>{if(host)host.innerHTML="";},250);
}
function showBirthdayToast(){
  const host=$("birthdayToastHost");
  if(!host||sessionStorage.getItem("raicesBirthdayToastShown")==="1")return;
  const matches=livingBirthdayPeople(); if(!matches.length)return;
  sessionStorage.setItem("raicesBirthdayToastShown","1");
  const year=new Date().getFullYear();
  const rows=matches.map(({person,birth})=>`<button class="birthday-person" type="button" data-person="${esc(person.id)}"><strong>${esc(person.nombre)}</strong><span>${year-birth.year} años</span></button>`).join("");
  host.innerHTML=`<aside class="birthday-toast" role="status"><div class="birthday-toast-icon">🎂</div><div class="birthday-toast-content"><b>${matches.length===1?"Hoy es su cumpleaños":"Cumpleaños de hoy"}</b><div class="birthday-people">${rows}</div></div><button class="birthday-toast-close" type="button" aria-label="Cerrar aviso">×</button></aside>`;
  const toast=host.querySelector(".birthday-toast"); requestAnimationFrame(()=>toast?.classList.add("show"));
  host.querySelector(".birthday-toast-close")?.addEventListener("click",dismissBirthdayToast);
  host.querySelectorAll(".birthday-person").forEach(b=>b.addEventListener("click",()=>{dismissBirthdayToast();openPerson(b.dataset.person);}));
  setTimeout(dismissBirthdayToast,9000);
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

    window.__raicesBranches=familyBranchDiagnostics();
    console.info("EP-005.2 · Ramas",window.__raicesBranches);
    renderFamilyBranchSelector();
    setFamilyBranch(currentFamilyBranch,{centerTree:true});

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
    showBirthdayToast();
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

  // alpha16c: al entrar en Árbol, centrar cuando la vista ya tiene dimensiones reales.
  if(id === "tree"){
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fitTreeToView());
    });
  }
}

function renderPeople(){
  const visiblePeople = peopleForBranch(currentFamilyBranch);
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


/* EP-005.1 · Motor de ramas familiares.
   La pertenencia se calcula desde relaciones; no se guarda en personas.json. */
const FAMILY_BRANCH_ROOTS=Object.freeze({eduardo:"P0015",esther:"P0027"});

function branchCoreIds(rootId){
  const result=new Set(),queue=[rootId];
  while(queue.length){
    const id=queue.shift();
    if(!id||result.has(id)||!byId[id])continue;
    result.add(id);
    parentIdsFor(byId[id]).forEach(x=>{if(!result.has(x))queue.push(x);});
    childIdsFor(byId[id]).forEach(x=>{if(!result.has(x))queue.push(x);});
  }
  return result;
}

function branchIds(rootId){
  const core=branchCoreIds(rootId),result=new Set(core);

  // Hermanos: comparten al menos un progenitor con una persona del núcleo.
  [...core].forEach(id=>parentIdsFor(byId[id]).forEach(parentId=>
    childIdsFor(byId[parentId]).forEach(siblingId=>result.add(siblingId))
  ));

  // Parejas directas de las personas ya incluidas.
  [...result].forEach(id=>spouseIdsFor(byId[id]).forEach(partnerId=>{
    if(byId[partnerId])result.add(partnerId);
  }));

  return result;
}

function familyBranchSets(){
  const eduardo=branchIds(FAMILY_BRANCH_ROOTS.eduardo);
  const esther=branchIds(FAMILY_BRANCH_ROOTS.esther);
  return {eduardo,esther,conjunta:new Set([...eduardo,...esther])};
}

function peopleForBranch(branchName="conjunta"){
  const sets=familyBranchSets(),ids=sets[branchName]||sets.conjunta;
  return publicPeople().filter(person=>ids.has(person.id));
}


/* EP-005.3 · Restricción del árbol a la rama global seleccionada. */
function treePeopleForSelectedBranch(){
  return peopleForBranch(currentFamilyBranch);
}
function treeIdsForSelectedBranch(){
  return new Set(treePeopleForSelectedBranch().map(person=>person.id));
}
function treeRelationIds(ids,allowedIds){
  return uniqueIds(ids).filter(id=>allowedIds.has(id));
}

function familyBranchDiagnostics(){
  const sets=familyBranchSets(),allPublic=new Set(publicPeople().map(p=>p.id));
  const outside=[...allPublic].filter(id=>!sets.conjunta.has(id));
  return {
    roots:{...FAMILY_BRANCH_ROOTS},
    counts:{eduardo:sets.eduardo.size,esther:sets.esther.size,conjunta:sets.conjunta.size,publicas:allPublic.size,fueraDeRamas:outside.length},
    outside
  };
}

function normalizeFamilyBranch(branchName){
  return ["eduardo","esther","conjunta"].includes(branchName) ? branchName : "conjunta";
}

function renderFamilyBranchSelector(){
  currentFamilyBranch=normalizeFamilyBranch(currentFamilyBranch);
  document.querySelectorAll("[data-branch]").forEach(button=>{
    const active=button.dataset.branch===currentFamilyBranch;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
}

function setFamilyBranch(branchName,{centerTree=true}={}){
  currentFamilyBranch=normalizeFamilyBranch(branchName);
  localStorage.setItem("raicesFamilyBranch",currentFamilyBranch);
  renderFamilyBranchSelector();
  renderPeople();

  /*
   * EP-005.3 alpha15c:
   * "Conjunta" no es un tercer árbol centrado en la última persona.
   * Es la unión visual de las ramas Eduardo + Esther, por lo que en PC
   * entra directamente en Árbol completo.
   */
  if(currentFamilyBranch==="conjunta"){
    populateTreePersonSelect();
    setFullTreeMode(true);
    return;
  }

  const rootId=FAMILY_BRANCH_ROOTS[currentFamilyBranch];
  if(centerTree && rootId && byId[rootId]){
    treeFocusId=rootId;
  }

  populateTreePersonSelect();

  /*
   * Las ramas individuales vuelven a la vista genealógica normal centrada
   * en su raíz. El usuario conserva la posibilidad de pulsar Árbol completo
   * si quiere ver toda esa rama.
   */
  setFullTreeMode(false);
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

function documentedUnknownParents(person){
  const items=[];
  if(person.padreEstado==="incognito")items.push("Padre incógnito (según documentación)");
  if(person.madreEstado==="incognito")items.push("Madre incógnita (según documentación)");
  return items;
}

function documentedUnknownParentsMarkup(person){
  const items=documentedUnknownParents(person);
  return items.length
    ? `<div class="documented-unknown-public">${items.map(item=>`<span>${esc(item)}</span>`).join("")}</div>`
    : "";
}

function renderFamily(person){
  const parents = parentIdsFor(person);
  const siblings = siblingGroups(person);
  const hasAnySibling = siblings.full.length || siblings.half.length || siblings.commonParent.length;

  return `<div class="family-block">
    ${familyGroup("Padres", parents, documentedUnknownParents(person).length ? "" : "No constan padres registrados")}
    ${documentedUnknownParentsMarkup(person)}
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


function quickRelationButtons(ids,emptyText){
  const people=uniqueIds(ids).map(id=>byId[id]).filter(person=>person&&isPublicPerson(person));
  if(!people.length)return `<div class="tree-quick-empty">${esc(emptyText)}</div>`;
  return `<div class="tree-quick-relations">${people.map(person=>`
    <button type="button" class="tree-quick-relation" data-tree-explore="${esc(person.id)}">
      <span>${esc(person.nombre)}</span>
      <small>${esc(personLifeLine(person)||person.profesion||person.lugar_nacimiento||"Ver en el árbol")}</small>
    </button>`).join("")}</div>`;
}

function personAvatarMarkup(person,{size="small",className=""}={}){
  const photo=String(person?.fotografia_principal||"").trim();
  const classes=["person-avatar",`person-avatar-${size}`,className].filter(Boolean).join(" ");
  if(photo){
    return `<span class="${classes}"><img src="${esc(photo)}" alt=""${photoPositionStyle(person)}></span>`;
  }
  return `<span class="${classes} person-avatar-fallback" aria-hidden="true">${esc(initials(person?.nombre||""))}</span>`;
}

function openTreeQuickPanel(id){
  const person=byId[id]; if(!person||!isPublicPerson(person))return;
  const avatar=personAvatarMarkup(person,{size:"large",className:`tree-quick-avatar tree-doc-${treeDocumentationLevel(person)}`});
  const parents=parentIdsFor(person); const siblings=siblingGroups(person); const allSiblings=uniqueIds([...siblings.full,...siblings.half,...siblings.commonParent]); const spouses=spouseIdsFor(person); const children=childIdsFor(person); const life=personLifeLine(person); const secondary=[person.lugar_nacimiento,person.profesion].filter(Boolean).join(" · ");
  $("personDrawer").classList.add("tree-quick-mode");
  $("drawerContent").innerHTML=`<section class="tree-quick-hero tree-quick-hero-avatar"><div class="tree-quick-avatar-wrap">${avatar}</div><div class="tree-quick-intro"><span class="badge">${esc(stateLabel(person.estado))}</span><h2>${esc(person.nombre)}</h2>${life?`<div class="tree-quick-life">${esc(life)}</div>`:""}${secondary?`<div class="tree-quick-secondary">${esc(secondary)}</div>`:""}<div class="tree-quick-actions"><button type="button" class="primary" data-tree-center-person="${esc(person.id)}">Centrar en el árbol</button><button type="button" class="soft" data-open-full-person="${esc(person.id)}">Abrir ficha completa</button></div></div></section><div class="tree-quick-stats"><span><strong>${parents.length}</strong> progenitores</span><span><strong>${allSiblings.length}</strong> hermanos</span><span><strong>${spouses.length}</strong> cónyuges</span><span><strong>${children.length}</strong> hijos</span></div><section class="tree-quick-section"><h3>Padres</h3>${quickRelationButtons(parents,documentedUnknownParents(person).length?"":"No constan padres")}${documentedUnknownParentsMarkup(person)}</section>${spouses.length?`<section class="tree-quick-section"><h3>Cónyuges</h3>${quickRelationButtons(spouses,"No consta cónyuge")}</section>`:""}${children.length?`<section class="tree-quick-section"><h3>Hijos</h3>${quickRelationButtons(children,"No constan hijos")}</section>`:""}${allSiblings.length?`<section class="tree-quick-section"><h3>Hermanos</h3>${quickRelationButtons(allSiblings,"No constan hermanos")}</section>`:""}`;
  $("drawerBackdrop").classList.add("open"); $("personDrawer").classList.add("open"); $("personDrawer").setAttribute("aria-hidden","false"); document.body.classList.add("drawer-open"); history.replaceState(null,"",`#arbol/${encodeURIComponent(id)}`);
}
function centerTreeOnPerson(id,{keepPanel=false}={}){
  if(!byId[id])return;
  treeFocusId=id;
  const select=$("treePersonSelect");
  if(select)select.value=id;

  if(treeFullMode){
    focusFullTreePerson(id);
    if(keepPanel)openTreeQuickPanel(id);
    return;
  }

  buildTree(id);
  requestAnimationFrame(()=>{
    fitTreeToView();
    if(keepPanel)openTreeQuickPanel(id);
  });
}

function normalizedNotes(person){
  const value=person?.notas;

  if(value===null||value===undefined||value==="")return[];

  if(Array.isArray(value)){
    return value
      .map(item=>{
        if(item===null||item===undefined)return"";
        if(typeof item==="string")return item.trim();
        if(typeof item==="object")return String(item.texto||item.descripcion||item.nota||"").trim();
        return String(item).trim();
      })
      .filter(Boolean);
  }

  if(typeof value==="string"){
    return value
      .split(/\r?\n/)
      .map(line=>line.trim())
      .filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}

function renderPersonNotes(person){
  const notes=normalizedNotes(person);
  if(!notes.length){
    return `<div class="placeholder">Sin observaciones añadidas.</div>`;
  }

  return notes
    .map(note=>`<div class="fact">${esc(note)}</div>`)
    .join("");
}

function openPerson(id){
  $("personDrawer").classList.remove("tree-quick-mode");
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
          ${renderPersonNotes(person)}
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
  $("personDrawer").classList.remove("tree-quick-mode");
  $("drawerBackdrop").classList.remove("open");
  $("personDrawer").classList.remove("open");
  $("personDrawer").setAttribute("aria-hidden","true");
  document.body.classList.remove("drawer-open");
  history.replaceState(null,"",location.pathname + location.search);
}


let treeFocusId = "P0015";
let treeShowSiblings = true;
let treeFullMode = false;
let currentTreeLayout = {};
let currentTreeBounds = {width:1400,height:980};

function populateTreePersonSelect(){
  const select = $("treePersonSelect");
  if(!select) return;

  const sorted = treePeopleForSelectedBranch().sort((a,b) => a.nombre.localeCompare(b.nombre,"es"));
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

function extractYear(value){
  return String(value||"").match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1]||"";
}
function documentedDeathYear(person){
  const structured=extractYear(person?.fecha_defuncion);
  if(structured)return structured;
  const facts=Array.isArray(person?.hechos)?person.hechos:[];
  for(const fact of facts){
    const text=String(fact?.texto||fact||"");
    const deathMatch=text.match(/(?:falleci[oó]|muri[oó]|defunci[oó]n)[^0-9]{0,40}\b(1[5-9]\d{2}|20\d{2})\b/i);
    if(deathMatch)return deathMatch[1];
  }
  return "";
}
function personLifeLine(person){
  const birth=extractYear(person?.fecha_nacimiento);
  const death=documentedDeathYear(person);
  if(birth&&death)return `${birth}–${death}`;
  if(birth&&String(person?.situacion_vital||"").toLowerCase()==="fallecido")return `${birth}–?`;
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
  const years=personLifeLine(person);
  const profession=String(person.profesion||"").trim();
  const photos=Array.isArray(person.fotografias)?person.fotografias.length:0;
  const documents=Array.isArray(person.documentos)?person.documentos.length:0;
  const state=treeDocumentationLevel(person);

  const avatar=personAvatarMarkup(person,{size:"small",className:"tree-card-avatar-unified"});

  const meta=[years,profession]
    .filter(Boolean)
    .map(item=>`<span>${esc(item)}</span>`)
    .join("");

  const counters=[
    photos?`<span title="Fotografías">📷 ${photos}</span>`:"",
    documents?`<span title="Documentos">📄 ${documents}</span>`:""
  ].filter(Boolean).join("");

  const unknownParentNote=documentedUnknownParents(person)
    .map(item=>`<span class="tree-unknown-parent">${esc(item.replace(" (según documentación)",""))}</span>`)
    .join("");

  return `<div class="tree-person-card tree-doc-${state}" data-person-id="${esc(person.id)}">
    <div class="tree-card-avatar">${avatar}</div>
    <div class="tree-card-content">
      <strong>${esc(person.nombre)}</strong>
      ${meta?`<div class="tree-card-meta">${meta}</div>`:""}
      ${counters?`<div class="tree-card-counters">${counters}</div>`:""}
      ${unknownParentNote?`<div class="tree-card-unknown">${unknownParentNote}</div>`:""}
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


function fullTreePublicIds(){
  return treePeopleForSelectedBranch().map(person=>person.id).filter(Boolean);
}

function fullTreeGenerationMap(ids){
  const allowed=new Set(ids);
  const memo=new Map();
  const visiting=new Set();

  const generationOf=id=>{
    if(memo.has(id))return memo.get(id);
    if(visiting.has(id))return 0;
    visiting.add(id);

    const person=byId[id];
    const parents=person
      ? parentIdsFor(person).filter(parentId=>allowed.has(parentId))
      : [];

    let generation=0;
    if(parents.length){
      generation=Math.max(...parents.map(parentId=>generationOf(parentId)+1));
    }

    visiting.delete(id);
    memo.set(id,generation);
    return generation;
  };

  ids.forEach(generationOf);

  // Las parejas deben compartir fila. Después se vuelven a respetar
  // las restricciones padre/madre -> hijo.
  for(let pass=0;pass<8;pass++){
    let changed=false;

    ids.forEach(id=>{
      const partners=spouseIdsFor(byId[id]).filter(partnerId=>allowed.has(partnerId));
      partners.forEach(partnerId=>{
        const level=Math.max(memo.get(id)||0,memo.get(partnerId)||0);
        if((memo.get(id)||0)!==level){memo.set(id,level);changed=true;}
        if((memo.get(partnerId)||0)!==level){memo.set(partnerId,level);changed=true;}
      });
    });

    ids.forEach(id=>{
      const parents=parentIdsFor(byId[id]).filter(parentId=>allowed.has(parentId));
      if(!parents.length)return;
      const required=Math.max(...parents.map(parentId=>(memo.get(parentId)||0)+1));
      if((memo.get(id)||0)<required){
        memo.set(id,required);
        changed=true;
      }
    });

    if(!changed)break;
  }

  return Object.fromEntries(ids.map(id=>[id,memo.get(id)||0]));
}

function fullTreePartnerUnits(ids,generationMap){
  const allowed=new Set(ids);
  const seen=new Set();
  const units=[];

  ids.forEach(startId=>{
    if(seen.has(startId))return;

    const level=generationMap[startId]||0;
    const queue=[startId];
    const members=[];
    seen.add(startId);

    while(queue.length){
      const id=queue.shift();
      members.push(id);
      spouseIdsFor(byId[id])
        .filter(partnerId=>allowed.has(partnerId)&&(generationMap[partnerId]||0)===level)
        .forEach(partnerId=>{
          if(!seen.has(partnerId)){
            seen.add(partnerId);
            queue.push(partnerId);
          }
        });
    }

    members.sort((a,b)=>(byId[a]?.nombre||"").localeCompare(byId[b]?.nombre||"","es"));
    units.push(members);
  });

  return units;
}

function buildFullTree(){
  if(window.matchMedia("(max-width: 900px)").matches){
    treeFullMode=false;
    buildTree(treeFocusId);
    return;
  }

  const ids=fullTreePublicIds();
  if(!ids.length)return;

  const generationMap=fullTreeGenerationMap(ids);
  const maxGeneration=Math.max(...ids.map(id=>generationMap[id]||0),0);

  const rows=[];
  for(let generation=0;generation<=maxGeneration;generation++){
    const rowIds=ids.filter(id=>(generationMap[id]||0)===generation);
    let units=fullTreePartnerUnits(rowIds,generationMap);

    // Orden top-down por posición media de los padres. En la primera fila,
    // orden alfabético estable.
    const previousPositions=currentTreeLayout;
    units.sort((unitA,unitB)=>{
      const score=unit=>{
        const parents=uniqueIds(unit.flatMap(id=>parentIdsFor(byId[id])))
          .filter(parentId=>previousPositions[parentId]);
        if(!parents.length)return Number.POSITIVE_INFINITY;
        return parents.reduce((sum,parentId)=>sum+previousPositions[parentId][0],0)/parents.length;
      };
      const a=score(unitA),b=score(unitB);
      if(Number.isFinite(a)||Number.isFinite(b)){
        if(a!==b)return a-b;
      }
      return (byId[unitA[0]]?.nombre||"").localeCompare(byId[unitB[0]]?.nombre||"","es");
    });

    rows.push({generation,units});
  }

  const nodeWidth=188;
  const nodeHeight=90;
  const spouseGap=16;
  const familyGap=62;
  const rowGap=205;
  const topPadding=78;
  const sidePadding=90;

  const requiredWidths=rows.map(row=>{
    return row.units.reduce((total,unit,index)=>{
      const unitWidth=unit.length*nodeWidth+Math.max(0,unit.length-1)*spouseGap;
      return total+unitWidth+(index? familyGap:0);
    },0);
  });

  const stageWidth=Math.max(1500,...requiredWidths.map(width=>width+sidePadding*2));
  const stageHeight=Math.max(800,topPadding+(maxGeneration+1)*rowGap+110);

  currentTreeLayout={};
  currentTreeBounds={width:stageWidth,height:stageHeight};

  rows.forEach((row,rowIndex)=>{
    const width=requiredWidths[rowIndex];
    let x=(stageWidth-width)/2;
    const y=topPadding+row.generation*rowGap;

    row.units.forEach((unit,unitIndex)=>{
      if(unitIndex)x+=familyGap;
      unit.forEach((id,memberIndex)=>{
        if(memberIndex)x+=spouseGap;
        currentTreeLayout[id]=[x,y];
        x+=nodeWidth;
      });
    });
  });

  // Segunda pasada: ordenar cada generación por el centro medio de sus padres,
  // manteniendo juntas las unidades de pareja.
  for(let generation=1;generation<=maxGeneration;generation++){
    const row=rows[generation];
    if(!row)continue;

    row.units.sort((unitA,unitB)=>{
      const centerOfParents=unit=>{
        const parents=uniqueIds(unit.flatMap(id=>parentIdsFor(byId[id])))
          .filter(parentId=>currentTreeLayout[parentId]);
        if(!parents.length)return Number.POSITIVE_INFINITY;
        return parents.reduce((sum,parentId)=>{
          const pos=currentTreeLayout[parentId];
          return sum+pos[0]+nodeWidth/2;
        },0)/parents.length;
      };
      const a=centerOfParents(unitA),b=centerOfParents(unitB);
      if(a!==b)return a-b;
      return (byId[unitA[0]]?.nombre||"").localeCompare(byId[unitB[0]]?.nombre||"","es");
    });

    const rowWidth=requiredWidths[generation]||0;
    let x=(stageWidth-rowWidth)/2;
    row.units.forEach((unit,unitIndex)=>{
      if(unitIndex)x+=familyGap;
      unit.forEach((id,memberIndex)=>{
        if(memberIndex)x+=spouseGap;
        currentTreeLayout[id]=[x,topPadding+generation*rowGap];
        x+=nodeWidth;
      });
    });
  }

  const stage=$("treeStage");
  const svg=$("treeSvg");
  stage.style.width=`${stageWidth}px`;
  stage.style.height=`${stageHeight}px`;
  svg.setAttribute("viewBox",`0 0 ${stageWidth} ${stageHeight}`);
  stage.querySelectorAll(".person-node, .tree-generation-label").forEach(node=>node.remove());
  svg.innerHTML="";

  // Bandas por generación.
  rows.forEach(row=>{
    const y=topPadding+row.generation*rowGap-36;

    const rect=document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x","24");
    rect.setAttribute("y",String(y));
    rect.setAttribute("width",String(stageWidth-48));
    rect.setAttribute("height",String(nodeHeight+72));
    rect.setAttribute("rx","22");
    rect.setAttribute("class","tree-band tree-band-full");
    svg.appendChild(rect);

    const text=document.createElementNS("http://www.w3.org/2000/svg","text");
    text.setAttribute("x","46");
    text.setAttribute("y",String(y+27));
    text.setAttribute("class","tree-band-label tree-band-label-full");
    text.textContent=`GENERACIÓN ${row.generation+1}`;
    svg.appendChild(text);
  });

  const centerX=id=>currentTreeLayout[id][0]+nodeWidth/2;
  const topY=id=>currentTreeLayout[id][1];
  const bottomY=id=>currentTreeLayout[id][1]+nodeHeight;

  const line=(d,type="family")=>{
    const path=document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",d);
    path.setAttribute("class",`tree-line tree-line-${type}`);
    svg.appendChild(path);
  };

  // Parejas.
  const pairKeys=new Set();
  ids.forEach(id=>{
    spouseIdsFor(byId[id]).filter(partnerId=>currentTreeLayout[partnerId]).forEach(partnerId=>{
      const key=[id,partnerId].sort().join("|");
      if(pairKeys.has(key))return;
      pairKeys.add(key);
      const y=Math.max(bottomY(id),bottomY(partnerId))+9;
      line(`M ${centerX(id)} ${y} H ${centerX(partnerId)}`,"couple");
    });
  });

  // Familias: agrupación por combinación de progenitores conocidos.
  const families=new Map();
  ids.forEach(childId=>{
    const parents=parentIdsFor(byId[childId]).filter(parentId=>currentTreeLayout[parentId]);
    if(!parents.length)return;

    const key=parents.slice().sort().join("|");
    if(!families.has(key))families.set(key,{parents:parents.slice(),children:[]});
    families.get(key).children.push(childId);
  });

  families.forEach(family=>{
    const parents=family.parents.filter(id=>currentTreeLayout[id]);
    const children=uniqueIds(family.children).filter(id=>currentTreeLayout[id]);
    if(!parents.length||!children.length)return;

    const parentCenters=parents.map(centerX);
    const parentMid=parentCenters.reduce((a,b)=>a+b,0)/parentCenters.length;
    const parentBottom=Math.max(...parents.map(bottomY));
    const childTop=Math.min(...children.map(topY));
    const barY=parentBottom+Math.max(34,(childTop-parentBottom)*.48);

    line(`M ${parentMid} ${parentBottom+9} V ${barY}`,"family");

    const childCenters=children.map(centerX);
    if(childCenters.length>1){
      line(`M ${Math.min(...childCenters)} ${barY} H ${Math.max(...childCenters)}`,"family");
    }
    children.forEach(childId=>line(`M ${centerX(childId)} ${barY} V ${topY(childId)}`,"family"));
  });

  // Personas.
  Object.entries(currentTreeLayout).forEach(([id,[x,y]])=>{
    const person=byId[id];
    if(!person)return;

    const node=document.createElement("button");
    node.className=`person-node ${person.estado||""} tree-role-full${id===treeFocusId?" tree-role-focus":""}`;
    node.style.left=`${x}px`;
    node.style.top=`${y}px`;

    if(person.visible===false){
      node.classList.add("tree-person-hidden");
      node.disabled=true;
    }else{
      node.dataset.person=id;
    }

    node.setAttribute("aria-label",`Abrir ficha de ${person.nombre}`);
    node.innerHTML=treeNodeLabel(person);
    stage.appendChild(node);
  });

  const context=$("treeContext");
  if(context){
    context.innerHTML=`<strong>Árbol completo</strong><span>${ids.length} personas · ${maxGeneration+1} generaciones representadas</span>`;
  }

  const hint=$("treeHint");
  if(hint)hint.textContent="Arrastra para recorrer el árbol · rueda del ratón para ampliar · Ajustar todo recupera la vista completa";
}

function fitFullTreeToView(){
  const shell=$("treeShell");
  if(!shell)return;

  /*
   * alpha12:
   * Ajustamos contra los límites REALES ocupados por tarjetas, no contra
   * todo el stage teórico. Esto elimina gran parte del aire sobrante de
   * alpha11 y permite ampliar el árbol sin cortar personas.
   */
  const nodeWidth=188;
  const nodeHeight=90;
  const positions=Object.values(currentTreeLayout);

  if(!positions.length)return;

  const minX=Math.min(...positions.map(([x])=>x));
  const maxX=Math.max(...positions.map(([x])=>x+nodeWidth));
  const minY=Math.min(...positions.map(([,y])=>y));
  const maxY=Math.max(...positions.map(([,y])=>y+nodeHeight));

  // Conservamos margen para líneas, rótulos de generación y respiración visual.
  const contentPadX=72;
  const contentPadTop=54;
  const contentPadBottom=58;

  const contentLeft=Math.max(0,minX-contentPadX);
  const contentRight=Math.min(currentTreeBounds.width,maxX+contentPadX);
  const contentTop=Math.max(0,minY-contentPadTop);
  const contentBottom=Math.min(currentTreeBounds.height,maxY+contentPadBottom);

  const contentWidth=Math.max(1,contentRight-contentLeft);
  const contentHeight=Math.max(1,contentBottom-contentTop);

  // Márgenes reales dentro del visor: menores que en alpha11.
  const viewportPadX=24;
  const viewportPadY=20;

  const scaleX=(shell.clientWidth-viewportPadX*2)/contentWidth;
  const scaleY=(shell.clientHeight-viewportPadY*2)/contentHeight;

  // Sin multiplicadores artificiales: la escala máxima es la que realmente cabe.
  const scale=Math.min(1.08,Math.max(.07,Math.min(scaleX,scaleY)));

  transform={
    x:(shell.clientWidth-contentWidth*scale)/2-contentLeft*scale,
    y:(shell.clientHeight-contentHeight*scale)/2-contentTop*scale,
    scale
  };

  applyTreeTransform();
}

function focusFullTreePerson(id){
  if(!currentTreeLayout[id])return;
  treeFocusId=id;

  document.querySelectorAll("#treeStage .person-node").forEach(node=>{
    node.classList.toggle("tree-role-focus",node.dataset.person===id);
  });

  const shell=$("treeShell");
  const [x,y]=currentTreeLayout[id];
  const nodeWidth=188,nodeHeight=90;
  transform.x=shell.clientWidth/2-(x+nodeWidth/2)*transform.scale;
  transform.y=shell.clientHeight/2-(y+nodeHeight/2)*transform.scale;
  applyTreeTransform();
}

function setFullTreeMode(enabled){
  const desktop=!window.matchMedia("(max-width: 900px)").matches;
  treeFullMode=Boolean(enabled&&desktop);

  const section=$("tree");
  const button=$("toggleFullTree");
  const fitButton=$("fitAllTree");

  section?.classList.toggle("full-tree-mode",treeFullMode);
  if(button){
    button.classList.toggle("active",treeFullMode);
    button.setAttribute("aria-pressed",String(treeFullMode));
    button.textContent=treeFullMode?"Vista normal":"Árbol completo";
  }
  if(fitButton)fitButton.hidden=!treeFullMode;

  if(treeFullMode){
    buildFullTree();
    requestAnimationFrame(fitFullTreeToView);
  }else{
    const hint=$("treeHint");
    if(hint)hint.textContent="Arrastra para moverte · pellizca o usa los botones para ampliar";
    buildTree(treeFocusId);
    requestAnimationFrame(fitTreeToView);
  }
}


function buildTree(focusId=treeFocusId){
  const allowedIds=treeIdsForSelectedBranch();
  let focus=byId[focusId];
  if(!focus || !allowedIds.has(focus.id)){
    const branchRoot=currentFamilyBranch!=="conjunta" ? FAMILY_BRANCH_ROOTS[currentFamilyBranch] : null;
    focus=(branchRoot && byId[branchRoot] && allowedIds.has(branchRoot)) ? byId[branchRoot] : treePeopleForSelectedBranch()[0];
  }
  if(!focus)return;

  treeFocusId=focus.id;
  const select=$("treePersonSelect");
  if(select)select.value=treeFocusId;

  const parents=treeRelationIds(parentIdsFor(focus),allowedIds);
  const siblingSets=siblingGroups(focus);
  const allSiblings=uniqueIds([...siblingSets.full,...siblingSets.half,...siblingSets.commonParent]);
  const siblings=treeShowSiblings?treeRelationIds(allSiblings,allowedIds):[];
  const spouses=treeRelationIds(spouseIdsFor(focus),allowedIds);
  const children=treeRelationIds(childIdsFor(focus),allowedIds);

  // Vista de entorno: una sola generación alrededor de la persona central.
  // Para avanzar por el árbol se pulsa cualquier familiar, que pasa a ser el nuevo centro.
  const nodeW=210,nodeH=104;
  const centerX=600,focusY=330;
  const stageWidth=Math.max(1200, 760 + Math.max(parents.length,children.length)*235);
  const sideCount=Math.max(siblings.length,spouses.length,1);
  const stageHeight=Math.max(760, 500 + sideCount*126);
  const cx=stageWidth/2;

  currentTreeLayout={};
  currentTreeBounds={width:stageWidth,height:stageHeight};
  currentTreeLayout[focus.id]=[cx-nodeW/2,focusY];

  const row=(ids,y,spacing=235)=>{
    const width=(ids.length-1)*spacing;
    ids.forEach((id,i)=>currentTreeLayout[id]=[cx-width/2+i*spacing-nodeW/2,y]);
  };
  row(parents,70);
  row(children,610);

  siblings.forEach((id,i)=>currentTreeLayout[id]=[55,245+i*126]);
  spouses.forEach((id,i)=>currentTreeLayout[id]=[stageWidth-nodeW-55,300+i*126]);

  const stage=$("treeStage"),svg=$("treeSvg");
  stage.style.width=`${stageWidth}px`;stage.style.height=`${stageHeight}px`;
  svg.setAttribute("viewBox",`0 0 ${stageWidth} ${stageHeight}`);
  stage.querySelectorAll(".person-node, .tree-generation-label, .tree-nav-label").forEach(n=>n.remove());
  svg.innerHTML="";

  const label=(text,x,y,anchor="middle")=>{
    const el=document.createElement("div");
    el.className="tree-nav-label";el.textContent=text;
    el.style.left=`${x}px`;el.style.top=`${y}px`;el.dataset.anchor=anchor;
    stage.appendChild(el);
  };
  if(parents.length)label("↑ SUBIR A PADRES",cx,24);
  if(siblings.length)label("← HERMANOS",160,190);
  if(spouses.length)label("CÓNYUGE →",stageWidth-160,245);
  if(children.length)label("↓ BAJAR A HIJOS",cx,555);

  const center=id=>currentTreeLayout[id][0]+nodeW/2;
  const top=id=>currentTreeLayout[id][1];
  const bottom=id=>currentTreeLayout[id][1]+nodeH;
  const line=(d,type="family")=>{const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",d);p.setAttribute("class",`tree-line tree-line-${type}`);svg.appendChild(p);};

  // Padres -> persona central. Los hermanos se muestran lateralmente sin líneas cruzadas.
  if(parents.length){
    const pcs=parents.map(center),mid=pcs.reduce((a,b)=>a+b,0)/pcs.length,bar=245;
    if(parents.length>1)line(`M ${Math.min(...pcs)} ${bottom(parents[0])+10} H ${Math.max(...pcs)}`,"couple");
    line(`M ${mid} ${Math.max(...parents.map(bottom))+10} V ${bar} H ${cx} V ${focusY}`,"family");
  }
  // Pareja: línea horizontal limpia.
  spouses.forEach(id=>{
    const y=Math.min(focusY+nodeH/2,currentTreeLayout[id][1]+nodeH/2);
    line(`M ${cx+nodeW/2} ${focusY+nodeH/2} H ${currentTreeLayout[id][0]} V ${currentTreeLayout[id][1]+nodeH/2}`,"couple");
  });
  // Persona central -> hijos.
  if(children.length){
    const childCenters=children.map(center),bar=545;
    line(`M ${cx} ${focusY+nodeH} V ${bar}`,"family");
    if(children.length>1)line(`M ${Math.min(...childCenters)} ${bar} H ${Math.max(...childCenters)}`,"family");
    children.forEach(id=>line(`M ${center(id)} ${bar} V ${top(id)}`,"family"));
  }

  Object.entries(currentTreeLayout).forEach(([id,[x,y]])=>{
    const person=byId[id];if(!person)return;
    const role=id===focus.id?"focus":parents.includes(id)?"parent":spouses.includes(id)?"spouse":children.includes(id)?"child":"sibling";
    const node=document.createElement("button");
    node.className=`person-node ${person.estado||""} tree-role-${role} tree-navigator-node`;
    node.style.left=`${x}px`;node.style.top=`${y}px`;
    if(person.visible===false){node.classList.add("tree-person-hidden");node.disabled=true;}
    else{node.dataset.person=id;node.dataset.treeNavigate=id;}
    node.setAttribute("aria-label",id===focus.id?`Abrir ficha rápida de ${person.nombre}`:`Centrar árbol en ${person.nombre}`);
    node.innerHTML=treeNodeLabel(person)+(id===focus.id?`<span class="tree-node-action">Ver ficha</span>`:`<span class="tree-node-action">Explorar</span>`);
    stage.appendChild(node);
  });

  const context=$("treeContext");
  if(context)context.innerHTML=`<strong>${esc(focus.nombre)}</strong><span>${parents.length} padres · ${allSiblings.length} hermanos · ${spouses.length} cónyuges · ${children.length} hijos</span>`;
  const hint=$("treeHint");
  if(hint)hint.textContent="Pulsa un familiar para convertirlo en el centro · pulsa la persona central para abrir su ficha";
}
let transform = {x:0,y:0,scale:.52};
let drag = null;
let pinch = null;

function applyTreeTransform(){
  $("treeStage").style.transform = `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;
}
function fitTreeToView(){
  if(treeFullMode){
    fitFullTreeToView();
    return;
  }
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

    const treeExploreButton=event.target.closest("[data-tree-explore]");
    if(treeExploreButton){event.preventDefault();centerTreeOnPerson(treeExploreButton.dataset.treeExplore,{keepPanel:true});return;}
    const quickCenterButton=event.target.closest("[data-tree-center-person]");
    if(quickCenterButton){event.preventDefault();centerTreeOnPerson(quickCenterButton.dataset.treeCenterPerson);closeDrawer();return;}
    const fullPersonButton=event.target.closest("[data-open-full-person]");
    if(fullPersonButton){event.preventDefault();openPerson(fullPersonButton.dataset.openFullPerson);return;}
    const treePersonButton=event.target.closest("#treeStage .person-node[data-person]");
    if(treePersonButton){
      event.preventDefault();
      if(!treeFullMode && treePersonButton.dataset.person!==treeFocusId){
        centerTreeOnPerson(treePersonButton.dataset.person);
        return;
      }
      if(treeFullMode){
        treeFocusId=treePersonButton.dataset.person;
        document.querySelectorAll("#treeStage .person-node").forEach(node=>{
          node.classList.toggle("tree-role-focus",node===treePersonButton);
        });
      }
      openTreeQuickPanel(treePersonButton.dataset.person);
      return;
    }
    const personButton = event.target.closest("[data-person]");
    if(personButton){event.preventDefault();openPerson(personButton.dataset.person);}
  });

  document.querySelectorAll("[data-branch]").forEach(button => button.addEventListener("click",()=>setFamilyBranch(button.dataset.branch)));
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
    if(treeFullMode)setFullTreeMode(false);
    treeFocusId=event.target.value;
    buildTree(treeFocusId);
    requestAnimationFrame(fitTreeToView);
  });
  $("toggleSiblings").addEventListener("click",event => {
    if(treeFullMode)setFullTreeMode(false);
    treeShowSiblings = !treeShowSiblings;
    event.currentTarget.classList.toggle("active",treeShowSiblings);
    event.currentTarget.setAttribute("aria-pressed",String(treeShowSiblings));
    buildTree(treeFocusId);
    requestAnimationFrame(fitTreeToView);
  });
  $("resetTree").addEventListener("click",resetTree);
  $("zoomIn").addEventListener("click",() => zoomTree(1.22));
  $("zoomOut").addEventListener("click",() => zoomTree(.82));
  $("toggleFullTree")?.addEventListener("click",()=>setFullTreeMode(!treeFullMode));
  $("fitAllTree")?.addEventListener("click",fitFullTreeToView);

  window.addEventListener("resize",()=>{
    if(treeFullMode&&window.matchMedia("(max-width: 900px)").matches){
      setFullTreeMode(false);
    }
  });

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
