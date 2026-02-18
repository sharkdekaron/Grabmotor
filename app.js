const CATALOG_URL = "https://raw.githubusercontent.com/sharkdekaron/Grabmotor/main/catalog.json";

const RATE_BY_MONTHS = { 18:1.07, 24:1.08, 30:1.09, 36:1.10, 42:1.11, 48:1.12 };

const els = {
  brand: document.getElementById("brandSelect"),
  model: document.getElementById("modelSelect"),
  months: document.getElementById("monthsSelect"),
  down: document.getElementById("downInput"),
  rateOverride: document.getElementById("rateOverride"),
  btnCopy: document.getElementById("btnCopy"),
  btnRefresh: document.getElementById("btnRefresh"),
  toast: document.getElementById("copyToast"),
  err: document.getElementById("errorBox"),
  updatedAt: document.getElementById("updatedAt"),
  carCode: document.getElementById("carCode"),
  carPrice: document.getElementById("carPrice"),
  principal: document.getElementById("principal"),
  downWarn: document.getElementById("downWarn"),
  sumPrincipal: document.getElementById("sumPrincipal"),
  sumInterest: document.getElementById("sumInterest"),
  sumTotal: document.getElementById("sumTotal"),
  sumPerMonth: document.getElementById("sumPerMonth"),
};

let catalog = { models: [], updatedAt: null };
let brands = [];
let currentBrand = "";
let currentModelId = "";

function toNumber(input) {
  const clean = String(input || "").replace(/,/g,"").replace(/฿/g,"").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function thb(n) {
  return new Intl.NumberFormat("th-TH", { style:"currency", currency:"THB" }).format(n);
}

function safeId(m) {
  return m.id || `${m.brand}__${m.name}__${m.code}`;
}

async function loadCatalog() {
  els.err.textContent = "";
  const url = `${CATALOG_URL}?v=${Date.now()}`;
  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const obj = await res.json();
  catalog = Array.isArray(obj) ? { models: obj, updatedAt: null } : { models: obj.models || [], updatedAt: obj.updatedAt || null };

  catalog.models = catalog.models.map(m => ({
    brand: String(m.brand ?? "").trim(),
    name: String(m.name ?? "").trim(),
    code: String(m.code ?? "").trim(),
    price: typeof m.price === "number" ? m.price : toNumber(m.price),
    id: m.id || null
  }));

  brands = [...new Set(catalog.models.map(m=>m.brand).filter(Boolean))].sort();
  currentBrand = brands[0] || "";
}

function modelsForBrand(b) {
  return catalog.models.filter(m=>m.brand===b).sort((a,b)=>a.name.localeCompare(b.name,"th"));
}

function renderBrands() {
  els.brand.innerHTML = brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join("");
  els.brand.value = currentBrand;
}

function renderModels() {
  const list = modelsForBrand(currentBrand);
  if (!list.length) {
    els.model.innerHTML = `<option value="">-</option>`;
    currentModelId = "";
    return;
  }
  els.model.innerHTML = list.map(m=>{
    const id = safeId(m);
    return `<option value="${esc(id)}">${esc(m.name)} — ${esc(m.code)}</option>`;
  }).join("");

  if (!list.some(m=>safeId(m)===currentModelId)) currentModelId = safeId(list[0]);
  els.model.value = currentModelId;
}

function renderMonths() {
  const ms = Object.keys(RATE_BY_MONTHS).map(Number).sort((a,b)=>a-b);
  els.months.innerHTML = ms.map(m=>`<option value="${m}">${m} งวด</option>`).join("");
  els.months.value = ms.includes(24) ? "24" : String(ms[0] || 18);
}

function selectedModel() {
  const list = modelsForBrand(currentBrand);
  return list.find(m=>safeId(m)===els.model.value) || null;
}

function calcAndRender() {
  const m = selectedModel();
  if (!m) return;

  const carPrice = m.price;
  const down = toNumber(els.down.value);
  const months = Number(els.months.value);
  const override = toNumber(els.rateOverride.value);
  const ratePct = override > 0 ? override : (RATE_BY_MONTHS[months] || 0);

  const principal = Math.max(carPrice - down, 0);
  const interest = principal * (ratePct/100) * months;
  const total = principal + interest;
  const perMonth = months > 0 ? total/months : 0;

  els.carCode.textContent = m.code || "-";
  els.carPrice.textContent = thb(carPrice);
  els.principal.textContent = thb(principal);

  if (down > carPrice) els.downWarn.classList.remove("hidden");
  else els.downWarn.classList.add("hidden");

  els.sumPrincipal.textContent = thb(principal);
  els.sumInterest.textContent = thb(interest);
  els.sumTotal.textContent = thb(total);
  els.sumPerMonth.textContent = thb(perMonth);

  els.updatedAt.textContent = catalog.updatedAt ? `อัปเดตข้อมูลรุ่นรถ: ${catalog.updatedAt}` : "";
}

function copySummary() {
  const m = selectedModel();
  if (!m) return;

  const text =
`สรุปการผ่อน
- รุ่นรถ: ${m.name} (${m.code})
- ราคารถ: ${thb(m.price)}
- เงินดาวน์: ${thb(toNumber(els.down.value))}
- จำนวนงวด: ${els.months.value} งวด`;

  (navigator.clipboard?.writeText(text) ?? Promise.reject())
    .then(showToast)
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast();
    });
}

function showToast(){
  els.toast.classList.remove("hidden");
  setTimeout(()=>els.toast.classList.add("hidden"), 1200);
}

function esc(s){
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

// events
els.brand.addEventListener("change", ()=>{ currentBrand = els.brand.value; renderModels(); calcAndRender(); });
els.model.addEventListener("change", ()=>{ currentModelId = els.model.value; calcAndRender(); });
els.months.addEventListener("change", calcAndRender);
els.down.addEventListener("input", calcAndRender);
els.rateOverride.addEventListener("input", calcAndRender);
els.btnCopy.addEventListener("click", copySummary);
els.btnRefresh.addEventListener("click", async ()=>{
  try { await boot(true); } catch(e){ els.err.textContent = `โหลดข้อมูลไม่สำเร็จ: ${e.message || e}`; }
});

async function boot(force){
  try{
    if(force) els.err.textContent = "";
    await loadCatalog();
    renderBrands();
    renderModels();
    renderMonths();
    calcAndRender();
  }catch(e){
    els.err.textContent = `โหลดข้อมูลไม่สำเร็จ: ${e.message || e}`;
  }
}

boot(false);
