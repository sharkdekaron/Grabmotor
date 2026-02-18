const CATALOG_URL =
  "https://raw.githubusercontent.com/sharkdekaron/Grabmotor/main/catalog.json";

let catalog = [];

async function loadData() {
  const res = await fetch(CATALOG_URL);
  catalog = await res.json();
  populateBrands();
}

function populateBrands() {
  const brands = [...new Set(catalog.models.map(m => m.brand))];
  const brandSelect = document.getElementById("brandSelect");

  brands.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    brandSelect.appendChild(opt);
  });

  brandSelect.onchange = populateModels;
  populateModels();
}

function populateModels() {
  const brand = document.getElementById("brandSelect").value;
  const modelSelect = document.getElementById("modelSelect");
  modelSelect.innerHTML = "";

  catalog.models
    .filter(m => m.brand === brand)
    .forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.price;
      opt.textContent = m.name + " (" + m.code + ")";
      modelSelect.appendChild(opt);
    });
}

function calculate() {
  const price = Number(document.getElementById("modelSelect").value);
  const down = Number(document.getElementById("downInput").value || 0);
  const months = Number(document.getElementById("monthsSelect").value);

  const rates = {
    18: 1.07,
    24: 1.08,
    36: 1.10
  };

  const rate = rates[months] / 100;
  const principal = price - down;
  const interest = principal * rate * months;
  const total = principal + interest;

  document.getElementById("result").textContent =
    "ยอดจัด: " + principal +
    "\nรวมดอกเบี้ย: " + interest +
    "\nยอดรวม: " + total +
    "\nผ่อนต่อเดือน: " + Math.round(total / months);
}

loadData();
