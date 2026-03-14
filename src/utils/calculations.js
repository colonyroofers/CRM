import * as XLSX from 'xlsx';
import {
  TPO_UNIT_COSTS,
  TPO_MEMBRANE_ITEMS
} from './constants.js';

/**
 * Date utilities
 */
export function daysBetweenDates(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / 86400000);
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

export function fmtShort(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

/**
 * Shingle roofing calculations
 */
export function calcWastePercent(bldg) {
  const sq = bldg.totalArea / 100;
  if (sq === 0) return 0.15;
  const raw = ((bldg.hips * 2 + bldg.valleys * 3 + bldg.stepFlashing + bldg.rakes) / sq - 3) * 0.82 + 3;
  return Math.max(raw, 0) / 100;
}

export function calcBuildingMaterials(bldg, mat, waste) {
  const a = bldg.totalArea;
  const aw = a * (1 + waste);
  return {
    shingleBndl: Math.ceil((aw / 100) * 3),
    hipRidgeBndl: Math.ceil((bldg.hips + bldg.ridges) / 25),
    starterBndl: Math.ceil((bldg.rakes + bldg.eaves) / 116),
    underlaymentRoll: Math.ceil(a / 950),
    iceWaterRoll: Math.ceil((bldg.valleys + bldg.stepFlashing) / 62),
    ridgeVentEach: Math.ceil(bldg.ridges / 4),
    stepFlashingBox: Math.ceil(bldg.stepFlashing / 60),
    dripEdgeEach: Math.ceil((bldg.eaves + bldg.rakes) / 9.5),
    coilNailBox: Math.round((aw / 100) * 400 / 7200),
    capNailBox: Math.round(aw / 2000),
    pipeBootEach: bldg.pipes,
    touchPaintEach: bldg.pipes,
    np1Each: bldg.pipes,
  };
}

export function calcMaterialCost(q, m) {
  return (
    q.shingleBndl * m.shinglePrice +
    q.hipRidgeBndl * m.hipRidgePrice +
    q.starterBndl * m.starterPrice +
    q.underlaymentRoll * m.underlaymentPrice +
    q.iceWaterRoll * m.iceWaterPrice +
    q.ridgeVentEach * m.ridgeVentPrice +
    q.stepFlashingBox * m.stepFlashingPrice +
    q.dripEdgeEach * m.dripEdgePrice +
    q.coilNailBox * m.coilNailPrice +
    q.capNailBox * m.capNailPrice +
    q.pipeBootEach * m.pipeBootPrice +
    q.touchPaintEach * m.touchPaintPrice +
    q.np1Each * m.np1Price
  );
}

export function calcAllBuildings(buildings, materials, labor, equipment, financials) {
  const n = buildings.length;
  if (n === 0) return [];

  const fPer = equipment.forkliftCost / n;
  const dPer = equipment.dumpsterCost / n;
  const pPer = equipment.includePermit ? equipment.permitCost / n : 0;
  const osbPer = (labor.osbSheets * (labor.osbMaterial + labor.osbLabor)) / n;

  return buildings.map(bldg => {
    const waste = calcWastePercent(bldg);
    const qtys = calcBuildingMaterials(bldg, materials, waste);
    const matCost = calcMaterialCost(qtys, materials);
    const sq = Math.ceil(bldg.totalArea / 100);
    const labCost = labor.tearOffRate * sq + fPer + dPer + pPer + osbPer;
    const warCost = equipment.extendedWarranty ? equipment.warrantyPerSq * sq : 0;
    const totalLabEquip = labCost + warCost;
    const matTax = matCost * financials.taxRate;
    const sub = matCost + totalLabEquip + matTax;
    const margin = sub / (1 - financials.margin) - sub;
    const total = sub + margin;
    const sqW = bldg.totalArea * (1 + waste) / 100;

    return {
      siteplanNum: bldg.siteplanNum,
      phase: bldg.phase,
      waste,
      qtys,
      materialCost: matCost,
      laborCost: totalLabEquip,
      materialTax: matTax,
      marginAmt: margin,
      totalPrice: total,
      pricePerSq: sqW > 0 ? total / sqW : 0,
      squaresWithWaste: sqW
    };
  });
}

/**
 * TPO/Beam AI parsing and calculations
 */
export function parseBeamAiXlsx(fileData) {
  const wb = XLSX.read(fileData, { type: "array" });
  const sheetName = wb.SheetNames.find(s => s.toUpperCase().includes("TAKEOFF")) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const assemblies = [];
  let current = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = row[1]; // column B
    const qty1 = row[2]; // column C
    const unit1 = row[3]; // column D
    const qty2 = row[4]; // column E
    const unit2 = row[5]; // column F
    const desc = row[6]; // column G

    if (!item || typeof item !== "string") continue;

    const itemStr = item.trim();
    if (!itemStr) continue;

    // Skip header row and notes
    if (itemStr === "Item" || itemStr.startsWith("NOTE")) continue;

    // Assembly header
    if (itemStr.match(/^(ROOF ASSEMBLY|PREMANUFACTURED)/i)) {
      current = {
        id: "asm_" + (assemblies.length + 1),
        name: itemStr,
        areaSf: typeof qty1 === "number" ? qty1 : 0,
        unit: unit1 || "SF",
        desc: desc || "",
        items: []
      };
      assemblies.push(current);
      continue;
    }

    // Standalone items before first assembly
    if (!current) {
      current = {
        id: "asm_acc",
        name: "ACCESSORIES & DETAILS",
        areaSf: 0,
        unit: "",
        desc: "",
        items: []
      };
      assemblies.push(current);
    }

    // Match to pricing
    let matchKey = itemStr;
    const membraneMatch = TPO_MEMBRANE_ITEMS.find(m => itemStr.toUpperCase().startsWith(m));
    if (membraneMatch) matchKey = itemStr; // keep full name for membrane details

    const pricing = TPO_UNIT_COSTS[matchKey] || null;
    const lineItem = {
      id: "li_" + i,
      item: itemStr,
      qty: typeof qty1 === "number" ? Math.round(qty1 * 100) / 100 : 0,
      unit: unit1 || "",
      qty2: typeof qty2 === "number" ? Math.round(qty2 * 100) / 100 : null,
      unit2: unit2 || null,
      desc: desc || "",
      unitCost: pricing ? pricing.cost : 0,
      category: pricing ? pricing.category : (membraneMatch ? "accessory" : "material"),
    };

    // For membrane detail items (flashings, upturns) — price per LF
    if (membraneMatch && !pricing) {
      lineItem.unitCost = 6.50; // default membrane detail per LF
      lineItem.category = "accessory";
    }

    current.items.push(lineItem);
  }

  return assemblies;
}

export function calcTPOEstimate(assemblies, laborRates, equipCosts, financials) {
  let materialCost = 0;
  let accessoryCost = 0;
  let totalSf = 0;
  const lineDetails = [];

  assemblies.forEach(asm => {
    totalSf += asm.areaSf;
    asm.items.forEach(li => {
      const lineCost = li.qty * li.unitCost;
      if (li.category === "accessory") {
        accessoryCost += lineCost;
      } else {
        materialCost += lineCost;
      }
      lineDetails.push({ ...li, assemblyName: asm.name, lineCost });
    });
  });

  const laborCost = totalSf * (laborRates.installPerSf + laborRates.tearOffPerSf + laborRates.cleanupPerSf);
  const equipCost = equipCosts.liftRental + equipCosts.dumpsters + equipCosts.permitCost + equipCosts.safetyEquip;
  const subtotal = materialCost + accessoryCost + laborCost + equipCost;
  const matTax = (materialCost + accessoryCost) * financials.taxRate;
  const subWithTax = subtotal + matTax;
  const margin = subWithTax / (1 - financials.margin) - subWithTax;
  const total = subWithTax + margin;

  return {
    materialCost,
    accessoryCost,
    laborCost,
    equipCost,
    matTax,
    margin,
    total,
    totalSf,
    pricePerSf: totalSf > 0 ? total / totalSf : 0,
    lineDetails
  };
}
