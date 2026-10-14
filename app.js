const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE='albaranes_docs_v1', COMPANY='albaranes_company_v1', ACTIVE_CLIENT='albaranes_active_client_v1';
let editingId=null;
const fields=['docNumber','docDate','docStatus','reference','loadingDestinationCode','companyName','companyPostalCode','companyCity','companyAddress','companyPhone','companyEmail','destinationCode','clientName','clientPostalCode','clientCity','clientAddress','clientPhone','clientEmail','notes'];
const companyFields=['Name','City','Address','Phone','Email'];

function docs(){return JSON.parse(localStorage.getItem(STORE)||'[]')}
function purgeExpiredDocs(){
  const all=docs(),limit=Date.now()-15*24*60*60*1000;
  const kept=all.filter(d=>{const created=new Date(d.createdAt||`${d.docDate||''}T00:00:00`).getTime();return !Number.isFinite(created)||created>=limit});
  if(kept.length!==all.length)localStorage.setItem(STORE,JSON.stringify(kept));
  return all.length-kept.length;
}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function nextNumber(){const y=new Date().getFullYear(), n=docs().filter(d=>d.docNumber?.startsWith(`ALB-${y}-`)).length+1;return `ALB-${y}-${String(n).padStart(4,'0')}`}
function go(view){$$('.view').forEach(v=>v.classList.toggle('active-view',v.id===view));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('#pageTitle').textContent={home:'Página de inicio',editor:'Nuevo albarán',history:'Historial de albaranes',settings:'Datos de empresa'}[view];if(view==='history')renderHistory();if(view==='home')renderStats();if(view==='editor'&&!editingId&& !$('#docNumber').value)resetForm();$('.sidebar').classList.remove('open');scrollTo(0,0)}
$$('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));$('#menuBtn').onclick=()=>$('.sidebar').classList.toggle('open');

function addLine(item={description:'',reference:'',qty:'',unit:'ud.',boxes:'',pallets:'',weight:''}){const tr=document.createElement('tr');tr.innerHTML=`<td><input class="l-desc" value="${esc(item.description)}" placeholder="Producto o servicio"></td><td><input class="l-ref" value="${esc(item.reference)}" placeholder="Código / Ref."></td><td><input class="l-qty" type="number" min="0" step="0.01" value="${item.qty}" placeholder="Opcional"></td><td><select class="l-unit">${['ud.','kg','caja','palé','m','l'].map(x=>`<option ${x===item.unit?'selected':''}>${x}</option>`).join('')}</select><input class="l-boxes extra-line" type="number" min="0" value="${esc(item.boxes)}" placeholder="Cajas opc."><input class="l-pallets extra-line" type="number" min="0" value="${esc(item.pallets)}" placeholder="Palés opc."><input class="l-weight extra-line" type="number" min="0" step="0.01" value="${esc(item.weight)}" placeholder="Peso opc."></td><td><button type="button" class="remove-line" title="Eliminar">×</button></td>`;$('#lineItems').append(tr);tr.querySelector('.remove-line').onclick=()=>{tr.remove();calcQty()};tr.querySelector('.l-qty').oninput=calcQty;calcQty()}
function esc(v=''){return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function calcQty(){$('#totalQty').textContent=$$('.l-qty').reduce((s,e)=>s+(+e.value||0),0).toLocaleString('es-ES')}
$('#addLine').onclick=()=>addLine();
function productCatalog(){
  const map=new Map();
  docs().forEach(d=>(d.lines||[]).forEach(x=>{if(x.reference)map.set(x.reference.toLowerCase(),x)}));
  return map;
}
function refreshProductRefs(){
  $('#productRefs').innerHTML=[...productCatalog().values()].map(x=>`<option value="${esc(x.reference)}">${esc(x.description)}</option>`).join('');
}
const bufaloDestinations=Array.isArray(window.BUFALO_DESTINATIONS)?window.BUFALO_DESTINATIONS:[];
const bacardiDestinations=Array.isArray(window.BACARDI_DESTINATIONS)?window.BACARDI_DESTINATIONS:[];
const zamoraDestinations=Array.isArray(window.ZAMORA_DESTINATIONS)?window.ZAMORA_DESTINATIONS:[];
const diageoDestinations=Array.isArray(window.DIAGEO_DESTINATIONS)?window.DIAGEO_DESTINATIONS:[];
function activeDestinations(){
  const client=$('#documentClient').value;
  if(client==='BACARDI')return bacardiDestinations;
  if(client==='BUFALO')return bufaloDestinations;
  if(client==='ZADIBE')return zamoraDestinations;
  if(client==='DIAGEO')return diageoDestinations;
  return [];
}
const destinationKey=value=>String(value||'').trim().toLocaleLowerCase('es-ES');
function clearDestinationFields(){
  ['loadingDestinationCode','companyName','companyPostalCode','companyCity','companyAddress','destinationCode','clientName','clientPostalCode','clientCity','clientAddress'].forEach(id=>$('#'+id).value='');
}
function refreshDestinationLists(){
  const destinations=activeDestinations();
  $('#destinationCodes').innerHTML=destinations.map(d=>`<option value="${esc(d.code)}">${esc(d.name)}</option>`).join('');
  $('#destinationNames').innerHTML=destinations.map(d=>`<option value="${esc(d.name)}">${esc(d.code)} · ${esc(d.city)}</option>`).join('');
}
function fillDestination(destination){
  if(!destination)return;
  $('#destinationCode').value=destination.code||'';
  $('#clientName').value=destination.name||'';
  $('#clientPostalCode').value=destination.postalCode||'';
  $('#clientCity').value=destination.city||'';
  $('#clientAddress').value=destination.address||'';
}
function fillLoadingDestination(destination){
  if(!destination)return;
  $('#loadingDestinationCode').value=destination.code||'';
  $('#companyName').value=destination.name||'';
  $('#companyPostalCode').value=destination.postalCode||'';
  $('#companyCity').value=destination.city||'';
  $('#companyAddress').value=destination.address||'';
}
function destinationByCode(code){return activeDestinations().find(d=>destinationKey(d.code)===destinationKey(code))}
function destinationByName(name){return activeDestinations().find(d=>destinationKey(d.name)===destinationKey(name))}
function completeDestinationFromCode(value,showMissing=false){
  const destination=destinationByCode(value);
  if(destination)fillDestination(destination);else if(showMissing&&value.trim())toast('No encuentro ese código de destino');
}
function completeDestinationFromName(value){
  const destination=destinationByName(value);
  if(destination)fillDestination(destination);
}
$('#destinationCode').addEventListener('input',e=>completeDestinationFromCode(e.target.value));
$('#destinationCode').addEventListener('keyup',e=>completeDestinationFromCode(e.target.value));
$('#destinationCode').addEventListener('change',e=>{
  const destination=destinationByCode(e.target.value);
  if(destination)fillDestination(destination);else if(e.target.value.trim())toast('No encuentro ese código de destino');
});
$('#clientName').addEventListener('input',e=>completeDestinationFromName(e.target.value));
$('#clientName').addEventListener('change',e=>completeDestinationFromName(e.target.value));
$('#loadingDestinationCode').addEventListener('input',e=>{const destination=destinationByCode(e.target.value);if(destination)fillLoadingDestination(destination)});
$('#loadingDestinationCode').addEventListener('keyup',e=>{const destination=destinationByCode(e.target.value);if(destination)fillLoadingDestination(destination)});
$('#loadingDestinationCode').addEventListener('change',e=>{const destination=destinationByCode(e.target.value);if(destination)fillLoadingDestination(destination);else if(e.target.value.trim())toast('No encuentro ese código de destino')});
function removeInitialEmptyLine(){
  const rows=$$('#lineItems tr');
  if(rows.length===1&&!rows[0].querySelector('.l-desc').value&&!rows[0].querySelector('.l-ref').value)rows[0].remove();
}
function quickAdd(){
  const ref=$('#quickRef').value.trim(),description=$('#quickDesc').value.trim(),qty=+$('#quickQty').value||0;
  if(!ref&&!description){toast('Escribe una referencia o descripción');$('#quickRef').focus();return}
  const type=$('#quickType').value;
  const item={reference:ref,description,qty:type==='units'?qty:0,unit:'ud.',boxes:type==='boxes'?qty:'',pallets:type==='pallets'?qty:'',weight:''};
  removeInitialEmptyLine();addLine(item);
  const row=$('#lineItems tr:last-child');row.classList.add('line-flash');
  $('#quickRef').value='';$('#quickDesc').value='';$('#quickQty').value=1;$('#quickRef').focus();
}
$('#quickAdd').onclick=quickAdd;
['quickRef','quickDesc','quickQty','quickType'].forEach(id=>$('#'+id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();quickAdd()}}));
$('#quickRef').addEventListener('input',e=>{
  const item=productCatalog().get(e.target.value.trim().toLowerCase());
  if(item){$('#quickDesc').value=item.description||'';$('#quickQty').select()}
});
$('#pasteToggle').onclick=()=>{$('#pastePanel').classList.add('open');$('#bulkPaste').focus()};
$('#cancelPaste').onclick=()=>{$('#pastePanel').classList.remove('open');$('#bulkPaste').value=''};
$('#importPaste').onclick=()=>{
  const lines=$('#bulkPaste').value.trim().split(/\r?\n/).filter(Boolean);
  if(!lines.length){toast('Pega primero las filas de Excel');return}
  const matrix=lines.map(line=>{let p=line.split('\t');if(p.length===1)p=line.split(';');return p.map(x=>x.trim())});
  const normalize=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const aliases={
    reference:['codartigo','codigoartigo','codarticulo','codigoarticulo','codigo','referencia','ref','sku','ean','gtin'],
    description:['descartigo','descricaoartigo','descarticulo','descripcionarticulo','descripcion','descricao','producto','articulo','artigo'],
    qty:['uds','ud','unidades','cantidad','qtd','quantidade','unidadesproducto'],
    boxes:['nvolumes','volumes','volumenes','ncajas','cajas','ncaixas','caixas','bultos'],
    pallets:['npaletes','npalets','npallets','paletes','palets','pallets'],
    weight:['peso','pesokg','pesobruto','weight','kilos','kg']
  };
  const fieldFor=value=>{const h=normalize(value);if(h.includes('tipopalet')||h.includes('pesoref'))return null;let best=null,bestScore=0;Object.entries(aliases).forEach(([field,names])=>names.forEach(name=>{const score=h===name?3:(name.length>3&&(h.startsWith(name)||h.includes(name)))?2:0;if(score>bestScore){best=field;bestScore=score}}));return best};
  let headerRow=-1,headerScore=0;
  matrix.slice(0,10).forEach((row,i)=>{const score=new Set(row.map(fieldFor).filter(Boolean)).size;if(score>headerScore){headerScore=score;headerRow=i}});
  const hasHeader=headerScore>=2;
  let indexes={};
  if(hasHeader)matrix[headerRow].forEach((cell,i)=>{const field=fieldFor(cell);if(field&&indexes[field]===undefined)indexes[field]=i});
  else {const wide=(matrix[0]||[]).length>=7;indexes=wide?{weight:0,pallets:2,boxes:3,reference:4,description:5,qty:6}:{reference:0,description:1,qty:2,boxes:3,pallets:4,weight:5}}
  if(indexes.reference===undefined&&indexes.description===undefined){toast('No encuentro las columnas Código o Descripción');return}
  removeInitialEmptyLine();let imported=0;
  matrix.slice(hasHeader?headerRow+1:0).forEach(parts=>{
    const get=k=>indexes[k]===undefined?'':(parts[indexes[k]]||'').trim();
    const reference=get('reference'),description=get('description');
    if(reference||description){const rawQty=get('qty');addLine({reference,description,qty:rawQty===''?'':(+rawQty.replace(',','.')||0),unit:'ud.',boxes:get('boxes'),pallets:get('pallets'),weight:get('weight')});imported++}
  });
  $('#bulkPaste').value='';$('#pastePanel').classList.remove('open');toast(`${imported} líneas importadas`);$('#quickRef').focus();
};
document.addEventListener('keydown',e=>{
  if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();go('editor');setTimeout(()=>$('#quickRef').focus(),50)}
  if(e.ctrlKey&&e.key==='Enter'&&$('#editor').classList.contains('active-view')){e.preventDefault();save()}
});
function readForm(){const original=editingId?docs().find(x=>x.id===editingId):null;const d={id:editingId||crypto.randomUUID(),createdAt:original?.createdAt||new Date().toISOString(),documentClient:$('#documentClient').value.trim().toUpperCase()};fields.forEach(f=>d[f]=$('#'+f).value.trim());d.lines=$$('#lineItems tr').map(r=>({description:r.querySelector('.l-desc').value.trim(),reference:r.querySelector('.l-ref').value.trim(),qty:r.querySelector('.l-qty').value===''?'':+r.querySelector('.l-qty').value,unit:r.querySelector('.l-unit').value,boxes:r.querySelector('.l-boxes').value,pallets:r.querySelector('.l-pallets').value,weight:r.querySelector('.l-weight').value})).filter(x=>x.reference||x.description);return d}
function resetForm(){editingId=null;$('#deliveryForm').reset();fields.forEach(f=>$('#'+f).value='');$('#docDate').value=new Date().toISOString().slice(0,10);$('#docStatus').value='Pendiente';$('#docNumber').value=nextNumber();const saved=localStorage.getItem(ACTIVE_CLIENT);$('#documentClient').value=['BACARDI','BUFALO','COMET','ESSITY','DIAGEO','AFFINITY','CASA REDONDO','DUVEL','DIAGEO POS','MCCORMICK','FELIX SOLIS','ZADIBE'].includes(saved)?saved:'BUFALO';loadCompanyIntoForm();$('#lineItems').innerHTML='';addLine()}
function save(){if(!$('#deliveryForm').reportValidity())return;const d=readForm();if(!d.lines.length){toast('Añade al menos una línea');return}const all=docs(),i=all.findIndex(x=>x.id===d.id);if(i>=0)all[i]=d;else all.unshift(d);localStorage.setItem(STORE,JSON.stringify(all));refreshProductRefs();editingId=null;toast('Albarán guardado correctamente');renderStats();go('history')}
function exportPdf(){
  buildPrintSheet();
  const oldTitle=document.title;
  document.title=`Albaran_${($('#docNumber').value||'sin-numero').replace(/[^a-z0-9_-]/gi,'_')}_${($('#activeClient').value||'cliente').replace(/[^a-z0-9_-]/gi,'_')}`;
  toast('En el diálogo selecciona “Guardar como PDF”');
  setTimeout(()=>window.print(),180);
  window.addEventListener('afterprint',()=>document.title=oldTitle,{once:true});
}
$('#deliveryForm').onsubmit=e=>{e.preventDefault();save()};$('#saveBtn').onclick=save;$('#clearBtn').onclick=()=>{if(confirm('¿Limpiar todos los campos?'))resetForm()};$('#previewBtn').onclick=exportPdf;
function loadDoc(id,print=false){const d=docs().find(x=>x.id===id);if(!d)return;editingId=id;fields.forEach(f=>$('#'+f).value=d[f]||'');$('#documentClient').value=d.documentClient||d.clientName||'BUFALO';setActiveClient($('#documentClient').value,false);$('#lineItems').innerHTML='';(d.lines||[]).forEach(addLine);go('editor');if(print)setTimeout(exportPdf,150)}
function removeDoc(id){if(!confirm('¿Eliminar este albarán?'))return;localStorage.setItem(STORE,JSON.stringify(docs().filter(x=>x.id!==id)));renderHistory();renderStats();toast('Albarán eliminado')}
function renderHistory(){purgeExpiredDocs();const number=$('#searchNumber').value.trim().toLowerCase(),client=$('#searchClient').value.trim().toLowerCase(),date=$('#searchDate').value,s=$('#statusFilter').value;const list=docs().filter(d=>{const created=(d.createdAt||d.docDate||'').slice(0,10);return(!number||(d.docNumber||'').toLowerCase().includes(number))&&(!client||`${d.documentClient||''} ${d.clientName||''}`.toLowerCase().includes(client))&&(!date||created===date)&&(!s||d.docStatus===s)});$('#historyRows').innerHTML=list.map(d=>`<tr><td><strong>${esc(d.docNumber)}</strong></td><td>${new Date(d.createdAt||`${d.docDate}T00:00:00`).toLocaleDateString('es-ES')}</td><td>${esc(d.documentClient||d.clientName)}</td><td><span class="badge ${d.docStatus}">${d.docStatus}</span></td><td>${(d.lines||[]).reduce((a,x)=>a+(+x.qty||0),0).toLocaleString('es-ES')}</td><td><div class="row-actions"><button class="mini" data-edit="${d.id}">Editar</button><button class="mini" data-print="${d.id}">PDF</button><button class="mini" data-delete="${d.id}">×</button></div></td></tr>`).join('');$('#emptyHistory').style.display=list.length?'none':'block';$$('[data-edit]').forEach(b=>b.onclick=()=>loadDoc(b.dataset.edit));$$('[data-print]').forEach(b=>b.onclick=()=>loadDoc(b.dataset.print,true));$$('[data-delete]').forEach(b=>b.onclick=()=>removeDoc(b.dataset.delete))}
['searchNumber','searchClient','searchDate'].forEach(id=>$('#'+id).oninput=renderHistory);$('#statusFilter').onchange=renderHistory;$('#clearFilters').onclick=()=>{$('#searchNumber').value='';$('#searchClient').value='';$('#searchDate').value='';$('#statusFilter').value='';renderHistory()};
function renderStats(){const a=docs();$('#totalDocs').textContent=a.length;$('#pendingDocs').textContent=a.filter(x=>x.docStatus==='Pendiente').length;$('#deliveredDocs').textContent=a.filter(x=>x.docStatus==='Entregado').length}
$('#quickPrint').onclick=()=>{const d=docs()[0];d?loadDoc(d.id,true):toast('Todavía no hay albaranes')};
function company(){return JSON.parse(localStorage.getItem(COMPANY)||'{}')}
function loadCompanyIntoForm(){const c=company();companyFields.forEach(f=>$('#company'+f).value=c[f.toLowerCase()]||'')}
function loadSettings(){const c=company();companyFields.forEach(f=>$('#setCompany'+f).value=c[f.toLowerCase()]||'')}
$('#saveCompany').onclick=()=>{const c={};companyFields.forEach(f=>c[f.toLowerCase()]=$('#setCompany'+f).value.trim());localStorage.setItem(COMPANY,JSON.stringify(c));toast('Datos de empresa guardados');loadCompanyIntoForm()};
const removedOnStart=purgeExpiredDocs();loadSettings();resetForm();renderStats();refreshProductRefs();refreshDestinationLists();if(removedOnStart)setTimeout(()=>toast(`${removedOnStart} albarán(es) caducado(s) eliminado(s)`),300);

function setActiveClient(value,syncForm=true){
  const allowed=['BACARDI','BUFALO','COMET','ESSITY','DIAGEO','AFFINITY','CASA REDONDO','DUVEL','DIAGEO POS','MCCORMICK','FELIX SOLIS','ZADIBE'];
  const requested=(value||'').trim().toUpperCase();
  const name=allowed.includes(requested)?requested:'BUFALO';
  $('#activeClient').value=name;
  $('#sideBrand').textContent=name;
  localStorage.setItem(ACTIVE_CLIENT,name);
  if(syncForm){$('#clientName').value=name;$('#documentClient').value=name}
  refreshDestinationLists();
}
$('#activeClient').addEventListener('change',e=>setActiveClient(e.target.value));
$('#activeClient').addEventListener('input',e=>{$('#sideBrand').textContent=(e.target.value||'CLIENTE').toUpperCase()});
$('#clientName').addEventListener('change',e=>{if(e.target.value)setActiveClient(e.target.value,false)});
setActiveClient(localStorage.getItem(ACTIVE_CLIENT)||'BUFALO');

$('#documentClient').addEventListener('change',e=>{
  const name=e.target.value;
  e.target.value=name;clearDestinationFields();setActiveClient(name,false);
  refreshDestinationLists();
});

function fmtDate(value){if(!value)return '';return new Date(value+'T00:00:00').toLocaleDateString('es-ES')}
function buildPrintSheet(){
  const d=readForm(), title=d.documentClient||'CLIENTE';
  const rows=d.lines.map(x=>`<tr><td>${esc(x.boxes)}</td><td>${esc(x.pallets)}</td><td>${esc(x.reference)}</td><td class="desc">${esc(x.description)}</td><td>${x.qty||''}</td><td>${esc(x.weight)}</td></tr>`).join('');
  $('#printSheet').innerHTML=`
    <div class="paper-head">
      <div class="ls-logo"><img src="luis-simoes-logo-white.svg" alt="Luis Simões"><p>Avda. del transporte 9<br>19004 Guadalajara</p></div>
      <div class="paper-title"><h1>${esc(title)}</h1><b>ALBARÁN DE RECOGIDA</b><div><span>ALBARÁN N.º: <strong>${esc(d.docNumber)}</strong></span><span>FECHA: <strong>${fmtDate(d.docDate)}</strong></span></div></div>
    </div>
    <div class="paper-reference">REFERENCIA / PEDIDO: <strong>${esc(d.reference)}</strong></div>
    <div class="paper-boxes">
      <div class="paper-box"><div class="box-label">LOCAL DE CARGA</div><div class="box-content"><b>${esc(d.companyName||'LUIS SIMÕES')}</b><br>${esc(d.companyAddress)}<br>${esc(d.companyPostalCode)} ${esc(d.companyCity)}<br>Cód. dest. cliente: ${esc(d.loadingDestinationCode)}<br>${esc(d.companyPhone)}</div><div class="box-footer"><span>HORA:</span><span>FECHA: ${fmtDate(d.docDate)}</span></div></div>
      <div class="paper-box"><div class="box-label">LOCAL DE DESCARGA</div><div class="box-content"><b>${esc(d.clientName)}</b><br>${esc(d.clientAddress)}<br>${esc(d.clientPostalCode)} ${esc(d.clientCity)}<br>${esc(d.clientPhone)}</div><div class="box-footer"><span>HORA:</span><span>FECHA: ${fmtDate(d.docDate)}</span></div></div>
    </div>
    <table class="paper-table"><thead><tr><th colspan="2">CANTIDAD</th><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th>UDS</th><th>PESO</th></tr><tr><th>CAJAS</th><th>PALÉS</th><th></th><th></th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="paper-notes"><b>OBSERVACIONES:</b><br>${esc(d.notes)}</div>
    <div class="paper-signatures"><div>ENTREGADO POR:<br><br><br>Firma</div><div>RECIBIDO POR:<br><br><br>Firma y sello</div></div>`;
}

