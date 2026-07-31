let PEOPLE = [];
let byId = {};
let currentView = "home";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase();

function stateLabel(state){
  const x = (state || "").toLowerCase();
  if (x.includes("document")) return "Documentado";
  if (x.includes("hipot")) return "Hipótesis";
  if (x.includes("memoria")) return "Memoria familiar";
  if (x.includes("reconst")) return "Familia reconstituida";
  return "Pendiente";
}

function card(person){
  const hasPhoto = Boolean(person.fotografia_principal);
  const thumb = hasPhoto
    ? `<img class="card-photo" src="${esc(person.fotografia_principal)}" alt="${esc(person.nombre)}" loading="lazy">`
    : `<div class="card-monogram">${esc(initials(person.nombre))}</div>`;

  return `<button class="card ${hasPhoto ? "has-photo" : ""}" data-person="${esc(person.id)}">
    <div class="card-media">${thumb}</div>
    <div class="card-body">
      <span class="tag">${esc(stateLabel(person.estado))}</span>
      <h4>${esc(person.nombre)}</h4>
      <p>${esc(person.datos_resumen || person.rol || "Información en elaboración")}</p>
    </div>
  </button>`;
}

async function init(){
  try{
    const response = await fetch("data/personas.json", {cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo cargar personas.json");
    PEOPLE = await response.json();
    byId = Object.fromEntries(PEOPLE.map(person => [person.id, person]));

    renderStats();
    renderFeatured();
    renderPeople();
    try{
      buildTree();
      resetTree();
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

function renderStats(){
  $("statPeople").textContent = PEOPLE.length;
  $("statDocumented").textContent = PEOPLE.filter(p => (p.estado || "").toLowerCase().includes("document")).length;
  const unions = new Set();
  PEOPLE.forEach(person => (person.conyuges || []).forEach(id => unions.add([person.id,id].sort().join("|"))));
  $("statFamilies").textContent = unions.size;
}

function renderFeatured(){
  const featuredIds = ["P0003","P0004","P0006","P0005","P0007","P0010"];
  $("featured").innerHTML = featuredIds.map(id => byId[id]).filter(Boolean).map(card).join("");
}

function showView(id){
  currentView = id;
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.view === id));
  window.scrollTo({top:0, behavior:"smooth"});
}

function searchFromHome(){
  $("peopleSearch").value = $("homeSearch").value;
  showView("people");
  renderPeople();
}

function renderPeople(){
  const query = ($("peopleSearch").value || "").trim().toLowerCase();
  const filtered = PEOPLE
    .filter(person => JSON.stringify([person.nombre,person.datos_resumen,person.rol,person.hechos]).toLowerCase().includes(query))
    .sort((a,b) => a.nombre.localeCompare(b.nombre,"es"));
  $("peopleCount").textContent = `${filtered.length} ${filtered.length === 1 ? "persona" : "personas"}`;
  $("peopleGrid").innerHTML = filtered.length ? filtered.map(card).join("") : `<div class="empty">No se han encontrado coincidencias.</div>`;
}

function relationButtons(ids, emptyText="No consta"){
  const related = (ids || []).map(id => byId[id]).filter(Boolean);
  if(!related.length) return `<div class="placeholder">${esc(emptyText)}</div>`;
  return `<div class="relation-list">${related.map(person => `
    <button class="relation-button" data-person="${esc(person.id)}">
      ${esc(person.nombre)}
      <span>${esc(person.datos_resumen || "Abrir ficha")}</span>
    </button>`).join("")}</div>`;
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
        <span class="document-open">${pageCount?`Consultar ${pageCount} página${pageCount===1?"":"s"}`:"Preparar vista desde Administración"} <span aria-hidden="true">→</span></span>
      </div>
    </button>`;
  }).join("")}</div>`;
}

function ensureDocumentViewer(){
  let viewer=document.getElementById("documentViewer");
  if(viewer) return viewer;
  viewer=document.createElement("div"); viewer.id="documentViewer"; viewer.className="document-viewer"; viewer.setAttribute("aria-hidden","true");
  viewer.innerHTML=`<button id="documentViewerCloseFloating" class="document-viewer-close-floating" type="button" aria-label="Cerrar documento">×</button>
  <div class="document-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="documentViewerTitle">
    <header class="document-viewer-header"><div class="document-viewer-heading"><strong id="documentViewerTitle">Documento</strong><small id="documentViewerDescription"></small><small id="documentViewerCounter"></small></div></header>
    <div id="documentViewerBody" class="document-viewer-body"></div>
    <footer class="document-viewer-footer"><button id="documentPrev" type="button">‹ Anterior</button><button id="documentNext" type="button">Siguiente ›</button></footer>
  </div>`;
  document.body.appendChild(viewer);
  viewer.querySelector("#documentViewerCloseFloating").onclick=closeDocumentViewer;
  viewer.addEventListener("click",e=>{if(e.target===viewer)closeDocumentViewer()});
  return viewer;
}
let currentDocumentPages=[], currentDocumentPage=0;
function showDocumentPage(){
  const viewer=ensureDocumentViewer(), body=viewer.querySelector("#documentViewerBody"), counter=viewer.querySelector("#documentViewerCounter");
  const prev=viewer.querySelector("#documentPrev"), next=viewer.querySelector("#documentNext");
  if(!currentDocumentPages.length) return;
  body.innerHTML=`<img class="document-page-image" src="${esc(currentDocumentPages[currentDocumentPage])}" alt="Página ${currentDocumentPage+1}">`;
  counter.textContent=`Página ${currentDocumentPage+1} de ${currentDocumentPages.length}`;
  prev.disabled=currentDocumentPage===0; next.disabled=currentDocumentPage===currentDocumentPages.length-1;
}
function openDocumentViewer(documentId,personId){
  const person=byId[personId], doc=(person?.documentos||[]).find(d=>d.id===documentId); if(!doc)return;
  const viewer=ensureDocumentViewer();
  viewer.querySelector("#documentViewerTitle").textContent=doc.titulo||doc.nombre_archivo||"Documento";
  const description=viewer.querySelector("#documentViewerDescription");
  description.textContent=doc.descripcion||doc.fecha||"";
  description.hidden=!description.textContent;
  currentDocumentPages=Array.isArray(doc.paginas)?doc.paginas:[]; currentDocumentPage=0;
  viewer.querySelector("#documentPrev").onclick=()=>{if(currentDocumentPage>0){currentDocumentPage--;showDocumentPage()}};
  viewer.querySelector("#documentNext").onclick=()=>{if(currentDocumentPage<currentDocumentPages.length-1){currentDocumentPage++;showDocumentPage()}};
  if(currentDocumentPages.length) showDocumentPage(); else viewer.querySelector("#documentViewerBody").innerHTML=`<div class="document-error"><strong>Este PDF todavía no tiene preparada su vista por páginas.</strong><p>Entra en Administración, abre Documentos y pulsa «Generar vista».</p></div>`;
  viewer.classList.add("open");viewer.setAttribute("aria-hidden","false");document.body.classList.add("document-viewer-open");
}
function closeDocumentViewer(){const viewer=document.getElementById("documentViewer");if(!viewer)return;viewer.classList.remove("open");viewer.setAttribute("aria-hidden","true");document.body.classList.remove("document-viewer-open");currentDocumentPages=[];}

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
    ? `<img src="${esc(person.fotografia_principal)}" alt="${esc(person.nombre)}">`
    : `<div class="profile-monogram">${esc(initials(person.nombre))}</div>`;

  $("drawerContent").innerHTML = `
    <section class="profile-hero">
      <div class="profile-photo">${photo}</div>
      <div class="profile-intro">
        <span class="badge">${esc(stateLabel(person.estado))}</span>
        <h2>${esc(person.nombre)}</h2>
        <div class="profile-summary">${esc(person.datos_resumen || "Datos biográficos en elaboración")}${person.rol ? ` · ${esc(person.rol)}` : ""}</div>
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
        <section class="profile-section">
          <h3>Relaciones familiares</h3>
          <h4>Padres</h4>
          ${relationButtons(person.padres)}
          <h4>Cónyuges</h4>
          ${relationButtons(person.conyuges)}
          <h4>Hijos</h4>
          ${relationButtons(person.hijos)}
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

const layout = {
  P0042:[1430,70],P0043:[1640,70],P0044:[2190,70],P0045:[2400,70],
  P0003:[1750,290],P0004:[1960,290],
  P0006:[850,530],P0053:[1070,530],P0046:[1290,530],P0047:[1510,530],P0048:[1730,530],P0049:[1950,530],P0050:[2170,530],P0051:[2390,530],P0052:[2610,530],
  P0001:[290,290],P0002:[500,290],P0005:[640,530],
  P0007:[850,780],P0008:[1160,590],P0009:[1370,590],P0010:[1060,780],P0011:[1280,780],
  P0012:[530,1040],P0013:[950,1040],P0014:[1370,1040],P0015:[1790,1040],P0016:[2210,1040]
};

function buildTree(){
  const stage = $("treeStage");
  const svg = $("treeSvg");
  stage.querySelectorAll(".person-node").forEach(node => node.remove());
  svg.innerHTML = "";

  Object.entries(layout).forEach(([id,[x,y]]) => {
    const person = byId[id];
    if(!person) return;
    const node = document.createElement("button");
    node.className = `person-node ${person.estado || ""}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.dataset.person = id;
    node.innerHTML = `<h5>${esc(person.nombre)}</h5><p>${esc(person.datos_resumen || person.rol || "")}</p>`;
    stage.appendChild(node);
  });

  const cx = id => layout[id][0] + 95;
  const top = id => layout[id][1];
  const line = (pathData, marriage=false) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",pathData);
    path.setAttribute("fill","none");
    path.setAttribute("stroke",marriage ? "#a56558" : "#568273");
    path.setAttribute("stroke-width",marriage ? "4" : "3");
    path.setAttribute("stroke-linecap","round");
    svg.appendChild(path);
  };
  const marriage = (a,b) => line(`M ${layout[a][0]+190} ${layout[a][1]+45} H ${layout[b][0]} ${layout[b][1]+45}`,true);
  const family = (a,b,kids,barY) => {
    marriage(a,b);
    const mid = (layout[a][0]+190+layout[b][0])/2;
    line(`M ${mid} ${layout[a][1]+45} V ${barY}`);
    const xs = kids.map(cx);
    line(`M ${Math.min(...xs)} ${barY} H ${Math.max(...xs)}`);
    kids.forEach(kid => line(`M ${cx(kid)} ${barY} V ${top(kid)}`));
  };

  family("P0042","P0043",["P0003"],245);
  family("P0044","P0045",["P0004"],245);
  family("P0003","P0004",["P0006","P0053","P0046","P0047","P0048","P0049","P0050","P0051","P0052"],485);
  family("P0001","P0002",["P0005"],485);
  family("P0005","P0006",["P0007"],735);
  family("P0008","P0009",["P0010","P0011"],735);
  family("P0007","P0010",["P0012","P0013","P0014","P0015","P0016"],995);
}

let transform = {x:0,y:0,scale:.52};
let drag = null;
let pinch = null;

function applyTreeTransform(){
  $("treeStage").style.transform = `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`;
}
function resetTree(){
  const shell = $("treeShell");
  transform = {x:Math.min(40, shell.clientWidth * .05),y:20,scale:shell.clientWidth < 700 ? .31 : .48};
  applyTreeTransform();
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
  $("homeSearchButton").addEventListener("click",searchFromHome);
  $("homeSearch").addEventListener("keydown",event => { if(event.key === "Enter") searchFromHome(); });
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
}

wireEvents();
init();
