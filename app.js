// ====== CONFIG ======
const CATALOG_URL = "./catalog.json";

// ดอกเบี้ยตามงวด (%/เดือน)
const RATE_BY_MONTHS = { 18:1.07, 24:1.08, 30:1.09, 36:1.10, 42:1.11, 48:1.12 };

// ✅ ตั้ง User/Pass สำหรับพนักงาน (แบบง่าย)
// หมายเหตุ: Static web ไม่ปลอดภัยระดับจริง (คนเก่งๆ ดูโค้ดได้) แต่กันคนทั่วไปได้
const USERS = [
  { user: "faii.tak", pass: "0991422823", name: "น้องฝ้าย" },
  { user: "sales02", pass: "1234", name: "พนักงาน 02" },
  { user: "shadowman",  pass: "2413038113", name: "หัวหน้า" }
];

// session อยู่ได้ 12 ชั่วโมง
const SESSION_HOURS = 12;

// ====== DOM ======
const dom = {
  loginScreen: document.getElementById("loginScreen"),
  appScreen: document.getElementById("appScreen"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  btnLogin: document.getElementById("btnLogin"),
  loginError: document.getElementById("loginError"),

  whoami: document.getElementById("whoami"),
  btnLogout: document.getElementById("btnLogout"),
  btnReload: document.getElementById("btnReload"),

  brand: document.getElementById("brandSelect"),
  model: document.getElementById("modelSelect"),
  monthsSeg: document.getElementById("monthsSeg"),
  down: document.getElementById("downInput"),
  rateOverride: document.getElementById("rateOverride"),
  btnCopy: document.getElementById("btnCopy"),
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

// ====== AUTH (simple localStorage session) ======
const SESSION_KEY = "grabmotor_session_v1";

function nowMs(){ return Date.now(); }

function saveSession(userObj){
  const exp = nowMs() + SESSION_HOURS*60*60*1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user:userObj.user, name:userObj.name, exp }));
}

function getSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(!s?.exp || nowMs() > s.exp) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  }catch{ return null; }
}

function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function showLogin(msg){
  dom.loginScreen.classList.remove("hidden");
  dom.appScreen.classList.add("hidden");
  dom.loginError.classList.add("hidden");
  dom.loginError.textContent = msg || "";
}

function showApp(session){
  dom.loginScreen.classList.add("hidden");
  dom.appScreen.classList.remove("hidden");
  dom.whoami.textContent = `ผู้ใช้: ${session.name} (${session.user})`;
}

function doLogin(){
  const u = (dom.username.value || "").trim();
  const p = (dom.password.value || "").trim();

  const hit = USERS.find(x => x.user === u && x.pass === p);
  if(!hit){
    dom.loginError.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    dom.loginError.classList.remove("hidden");
    return;
  }
  saveSession(hit);
  const s = getSession();
  showApp(s);
  bootApp(); // เริ่มโหลดข้อมูลรถ + คำนวณ
}

function doLogout(){
  clearSession();
  showLogin();
}

// ====== APP (catalog + calc) ======
let catalog = { models: [], updatedAt: null };
let brands = [];
let currentBrand = "";
let currentModelId = "";
let selectedMonths = 24;

function toNumber(input){
  const clean = String(input || "").replace(/,/g,"").replace(/฿/g,"").trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function thb(n){
  return new Intl.NumberFormat("th-TH", { style:"currency", currency:"THB" }).format(n);
}

function safeId(m){ return m.id || `${m.brand}__${m.name}__${m.code}`; }

async function loadCatalog(){
  dom.err.textContent = "";
  const url = `${CATALOG_URL}?v=${Date.now()}`;
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const obj = await res.json();

  catalog = Array.isArray(obj)
    ? { models: obj, updatedAt: null }
    : { models: obj.models || [], updatedAt: obj.updatedAt || null };

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

function modelsForBrand(b){
  return catalog.models.filter(m=>m.brand===b).sort((a,b)=>a.name.localeCompare(b.name,"th"));
}

function renderBrands(){
  dom.brand.innerHTML = brands.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join("");
  dom.brand.value = currentBrand;
}

function renderModels(){
  const list = modelsForBrand(currentBrand);
  if(!list.length){
    dom.model.innerHTML = `<option value="">-</option>`;
    currentModelId = "";
    return;
  }
  dom.model.innerHTML = list.map(m=>{
    const id = safeId(m);
    return `<option value="${esc(id)}">${esc(m.name)} — ${esc(m.code)}</option>`;
  }).join("");

  if(!list.some(m=>safeId(m)===currentModelId)) currentModelId = safeId(list[0]);
  dom.model.value = currentModelId;
}

function renderMonths(){
  const ms = Object.keys(RATE_BY_MONTHS).map(Number).sort((a,b)=>a-b);
  // default 24 ถ้ามี
  selectedMonths = ms.includes(24) ? 24 : (ms[0] || 18);

  dom.monthsSeg.innerHTML = ms.map(m => `
    <button type="button" data-m="${m}" class="${m===selectedMonths ? "active":""}">
      ${m}
    </button>
  `).join("");

  dom.monthsSeg.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      selectedMonths = Number(btn.dataset.m);
      dom.monthsSeg.querySelectorAll("button").forEach(b=>b.classList.toggle("active", Number(b.dataset.m)===selectedMonths));
      calcAndRender();
    });
  });
}

function selectedModel(){
  const list = modelsForBrand(currentBrand);
  return list.find(m=>safeId(m)===dom.model.value) || null;
}

function calcAndRender(){
  const m = selectedModel();
  if(!m) return;

  const carPrice = m.price;
  const down = toNumber(dom.down.value);
  const months = Number(selectedMonths);
  const override = toNumber(dom.rateOverride.value);
  const ratePct = override > 0 ? override : (RATE_BY_MONTHS[months] || 0);

  const principal = Math.max(carPrice - down, 0);
  const interest = principal * (ratePct/100) * months;
  const total = principal + interest;
  const perMonth = months > 0 ? total/months : 0;

  dom.carCode.textContent = m.code || "-";
  dom.carPrice.textContent = thb(carPrice);
  dom.principal.textContent = thb(principal);

  if(down > carPrice) dom.downWarn.classList.remove("hidden");
  else dom.downWarn.classList.add("hidden");

  dom.sumPrincipal.textContent = thb(principal);
  dom.sumInterest.textContent = thb(interest);
  dom.sumTotal.textContent = thb(total);
  dom.sumPerMonth.textContent = thb(perMonth);

  dom.updatedAt.textContent = catalog.updatedAt ? `อัปเดตข้อมูลรุ่นรถ: ${catalog.updatedAt}` : "";
}

function copySummary(){
  const m = selectedModel();
  if(!m) return;

  const text =
`สรุปการผ่อน
- รุ่นรถ: ${m.name} (${m.code})
- ราคารถ: ${thb(m.price)}
- เงินดาวน์: ${thb(toNumber(dom.down.value))}
- จำนวนงวด: ${selectedMonths} งวด`;

  (navigator.clipboard?.writeText(text) ?? Promise.reject())
    .then(showToast)
    .catch(()=>{
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
  dom.toast.classList.remove("hidden");
  setTimeout(()=>dom.toast.classList.add("hidden"), 1200);
}

function esc(s){
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}

async function bootApp(){
  try{
    await loadCatalog();
    renderBrands();
    renderModels();
    renderMonths();
    calcAndRender();
  }catch(e){
    dom.err.textContent = `โหลดข้อมูลไม่สำเร็จ: ${e.message || e}`;
  }
}

// ====== EVENTS ======
dom.btnLogin.addEventListener("click", doLogin);
dom.password.addEventListener("keydown", (e)=>{ if(e.key==="Enter") doLogin(); });

dom.btnLogout.addEventListener("click", doLogout);
dom.btnReload.addEventListener("click", async ()=>{ await bootApp(); });

dom.brand.addEventListener("change", ()=>{ currentBrand = dom.brand.value; renderModels(); calcAndRender(); });
dom.model.addEventListener("change", ()=>{ currentModelId = dom.model.value; calcAndRender(); });
dom.down.addEventListener("input", calcAndRender);
dom.rateOverride.addEventListener("input", calcAndRender);
dom.btnCopy.addEventListener("click", copySummary);

// ====== START ======
function hideSplash(){
  const sp = document.getElementById("splash");
  if(!sp) return;
  sp.classList.add("hide");
  setTimeout(()=> sp.remove(), 300);
}

(async function start(){
  const s = getSession();
  if(s){
    showApp(s);
    await bootApp();
  }else{
    showLogin();
  }
  // ให้ splash อยู่สั้นๆ แบบ iOS
  setTimeout(hideSplash, 350);
})();
