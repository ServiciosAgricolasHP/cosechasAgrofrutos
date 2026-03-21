import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  collectionGroup,
} from "firebase/firestore";
import { db } from "../../firebase";

function normalizeRut(rut) {
  let clean = rut.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
  if (!clean.includes("-") && /[0-9K]$/i.test(clean)) {
    clean = clean.slice(0, -1) + "-" + clean.slice(-1);
  }
  return clean;
}

function extractLocationCode(idQr) {
  if (!idQr) return "N/A";
  return idQr.substring(0, 2).toUpperCase();
}

function getQualityInfo(qualityArray) {
  if (!qualityArray || qualityArray.length < 2) {
    return {
      productType: "export",
      productName: "Exportación",
      unitType: "kg",
      unitName: "Kilos",
      productCode: 0,
      unitCode: 0,
      key: "export_kg",
    };
  }

  const [unitCode, productCode] = qualityArray;

  const productMap = {
    0: { type: "export", name: "Exportación" },
    1: { type: "iqf", name: "IQF" },
  };

  const unitMap = {
    0: { type: "kg", name: "Kilos" },
    1: { type: "bandejas", name: "Bandejas" },
    2: { type: "capacho", name: "Capacho" },
  };

  const product = productMap[productCode] || {
    type: "unknown",
    name: "Desconocido",
  };
  const unit = unitMap[unitCode] || {
    type: "unknown",
    name: "Unidad desconocida",
  };

  return {
    productType: product.type,
    productName: product.name,
    unitType: unit.type,
    unitName: unit.name,
    productCode,
    unitCode,
    key: `${product.type}_${unit.type}`,
  };
}

function detectSearchType(input) {
  const cleanInput = input.replace(/[.\s]/g, "").toUpperCase();
  const rutPattern = /^\d{7,8}-[0-9K]$/i;
  const qrPattern = /^[A-Z]{2}-\d+$/i;
  if (rutPattern.test(cleanInput)) {
    return { type: "rut", value: cleanInput };
  } else if (qrPattern.test(cleanInput)) {
    return { type: "qr", value: cleanInput };
  } else {
    return { type: "rut", value: cleanInput };
  }
}

async function getRutFromQr(qrCode) {
  const workersRef = collection(db, "worker");
  const q = query(workersRef, where("idQr", "array-contains", qrCode));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    throw new Error(`No se encontró trabajador con código QR: ${qrCode}`);
  }
  const workerDoc = querySnapshot.docs[0];
  const workerData = workerDoc.data();
  return {
    rut: workerDoc.id,
    name: workerData.name,
    idQr: workerData.idQr,
  };
}

export async function getWorkerWeightsOptimized(searchInput, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const searchType = detectSearchType(searchInput);
  let rut = null;
  let workerInfo = null;

  if (searchType.type === "qr") {
    try {
      workerInfo = await getRutFromQr(searchType.value);
      rut = workerInfo.rut;
    } catch (error) {
      return {
        error: true,
        message: error.message,
        worker: null,
        totals: [],
        locations: [],
        firstDate: null,
        lastDate: null,
        days: [],
      };
    }
  } else {
    rut = normalizeRut(searchType.value);
  }

  let worker = null;
  if (workerInfo) {
    worker = {
      rut: workerInfo.rut,
      name: workerInfo.name || "Unknown",
      idQr: workerInfo.idQr || [],
    };
  } else {
    const workerDoc = doc(db, "worker", rut);
    const workerSnapshot = await getDoc(workerDoc);
    if (workerSnapshot.exists()) {
      const workerData = workerSnapshot.data();
      worker = {
        rut,
        name: workerData.name || "Unknown",
        idQr: workerData.idQr || [],
      };
    } else {
      return {
        error: true,
        message: `No se encontró trabajador con RUT: ${rut}`,
        worker: null,
        totals: [],
        locations: [],
        firstDate: null,
        lastDate: null,
        days: [],
      };
    }
  }

  let q = query(collectionGroup(db, "entry"), where("rut", "==", rut));

  const entriesSnapshot = await getDocs(q);

  const totalsMap = new Map();
  const daysMap = new Map();
  const locationCodes = new Set();
  const allCombinations = new Set();

  entriesSnapshot.forEach((docSnap) => {
    const entry = docSnap.data();
    const parentPath = docSnap.ref.parent.parent;
    const date = parentPath?.id;
    if (!date) return;
    if (startDate && date < startDate) return;
    if (endDate && date > endDate) return;

    const qualityInfo = getQualityInfo(entry.quality);
    const amount = Number(entry.amount) || 0;
    const locationCode = extractLocationCode(entry.idQr);

    if (locationCode !== "N/A") {
      locationCodes.add(locationCode);
    }
    allCombinations.add(qualityInfo.key);

    if (!totalsMap.has(qualityInfo.key)) {
      totalsMap.set(qualityInfo.key, {
        key: qualityInfo.key,
        productType: qualityInfo.productType,
        productName: qualityInfo.productName,
        unitType: qualityInfo.unitType,
        unitName: qualityInfo.unitName,
        amount: 0,
        count: 0,
      });
    }
    const totalEntry = totalsMap.get(qualityInfo.key);
    totalEntry.amount += amount;
    totalEntry.count++;

    if (!daysMap.has(date)) {
      daysMap.set(date, {
        date,
        totals: new Map(),
        entries: [],
        locations: new Set(),
      });
    }
    const day = daysMap.get(date);
    if (!day.totals.has(qualityInfo.key)) {
      day.totals.set(qualityInfo.key, {
        key: qualityInfo.key,
        productType: qualityInfo.productType,
        productName: qualityInfo.productName,
        unitType: qualityInfo.unitType,
        unitName: qualityInfo.unitName,
        amount: 0,
        count: 0,
      });
    }
    const dayTotal = day.totals.get(qualityInfo.key);
    dayTotal.amount += amount;
    dayTotal.count++;

    day.entries.push({
      amount,
      supervisor: entry.supervisor || "",
      dailyCount: entry.dailyCount || 0,
      idQr: entry.idQr,
      locationCode,
      paid: entry.paid || false,
      quality: {
        product: qualityInfo.productName,
        unit: qualityInfo.unitName,
        productCode: qualityInfo.productCode,
        unitCode: qualityInfo.unitCode,
        raw: entry.quality,
      },
    });
    day.locations.add(locationCode);
  });

  const totals = Array.from(totalsMap.values()).map((t) => ({
    ...t,
    amount: Number(t.amount.toFixed(2)),
  }));
  totals.sort((a, b) => {
    if (a.productType !== b.productType)
      return a.productType.localeCompare(b.productType);
    return a.unitType.localeCompare(b.unitType);
  });

  const days = Array.from(daysMap.values()).map((day) => ({
    date: day.date,
    totals: Array.from(day.totals.values())
      .map((t) => ({
        ...t,
        amount: Number(t.amount.toFixed(2)),
      }))
      .sort((a, b) => {
        if (a.productType !== b.productType)
          return a.productType.localeCompare(b.productType);
        return a.unitType.localeCompare(b.unitType);
      }),
    entries: day.entries,
    locations: Array.from(day.locations),
  }));
  days.sort((a, b) => a.date.localeCompare(b.date));

  return {
    error: false,
    worker,
    totals,
    locations: Array.from(locationCodes),
    allCombinations: Array.from(allCombinations),
    firstDate: days[0]?.date || null,
    lastDate: days[days.length - 1]?.date || null,
    days,
    searchType: searchType.type,
  };
}
