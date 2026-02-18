{\rtf1\ansi\ansicpg1252\cocoartf2868
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const CATALOG_URL =\
  "https://raw.githubusercontent.com/sharkdekaron/Grabmotor/main/catalog.json";\
\
let catalog = [];\
\
async function loadData() \{\
  const res = await fetch(CATALOG_URL);\
  catalog = await res.json();\
  populateBrands();\
\}\
\
function populateBrands() \{\
  const brands = [...new Set(catalog.models.map(m => m.brand))];\
  const brandSelect = document.getElementById("brandSelect");\
\
  brands.forEach(b => \{\
    const opt = document.createElement("option");\
    opt.value = b;\
    opt.textContent = b;\
    brandSelect.appendChild(opt);\
  \});\
\
  brandSelect.onchange = populateModels;\
  populateModels();\
\}\
\
function populateModels() \{\
  const brand = document.getElementById("brandSelect").value;\
  const modelSelect = document.getElementById("modelSelect");\
  modelSelect.innerHTML = "";\
\
  catalog.models\
    .filter(m => m.brand === brand)\
    .forEach(m => \{\
      const opt = document.createElement("option");\
      opt.value = m.price;\
      opt.textContent = m.name + " (" + m.code + ")";\
      modelSelect.appendChild(opt);\
    \});\
\}\
\
function calculate() \{\
  const price = Number(document.getElementById("modelSelect").value);\
  const down = Number(document.getElementById("downInput").value || 0);\
  const months = Number(document.getElementById("monthsSelect").value);\
\
  const rates = \{\
    18: 1.07,\
    24: 1.08,\
    36: 1.10\
  \};\
\
  const rate = rates[months] / 100;\
  const principal = price - down;\
  const interest = principal * rate * months;\
  const total = principal + interest;\
\
  document.getElementById("result").textContent =\
    "\uc0\u3618 \u3629 \u3604 \u3592 \u3633 \u3604 : " + principal +\
    "\\n\uc0\u3619 \u3623 \u3617 \u3604 \u3629 \u3585 \u3648 \u3610 \u3637 \u3657 \u3618 : " + interest +\
    "\\n\uc0\u3618 \u3629 \u3604 \u3619 \u3623 \u3617 : " + total +\
    "\\n\uc0\u3612 \u3656 \u3629 \u3609 \u3605 \u3656 \u3629 \u3648 \u3604 \u3639 \u3629 \u3609 : " + Math.round(total / months);\
\}\
\
loadData();}