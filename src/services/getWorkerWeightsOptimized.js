// services/getWorkerWeightsOptimized.js
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  collectionGroup
} from "firebase/firestore";
import { db } from "../../firebase";

function normalizeRut(rut) {
  return rut.replace(/\./g, "").replace(/\s/g, "").toLowerCase();
}

function extractLocationCode(idQr) {
  if (!idQr) return "N/A";
  return idQr.substring(0, 2).toUpperCase();
}

// quality[0]: 0 = kilos, 1 = bandejas, 2 = capacho
// quality[1]: 0 = exportación, 1 = IQF
function getQualityInfo(qualityArray) {
  if (!qualityArray || qualityArray.length < 2) {
    return { 
      productType: "export",
      productName: "Exportación",
      unitType: "kg",
      unitName: "Kilos",
      productCode: 0,
      unitCode: 0,
      key: "export_kg"
    };
  }
  
  const [unitCode, productCode] = qualityArray;
  
  const productMap = {
    0: { type: "export", name: "Exportación" },
    1: { type: "iqf", name: "IQF" }
  };
  
  const unitMap = {
    0: { type: "kg", name: "Kilos" },
    1: { type: "bandejas", name: "Bandejas" },
    2: { type: "capacho", name: "Capacho" }
  };
  
  const product = productMap[productCode] || { type: "unknown", name: "Desconocido" };
  const unit = unitMap[unitCode] || { type: "unknown", name: "Unidad desconocida" };
  
  return {
    productType: product.type,
    productName: product.name,
    unitType: unit.type,
    unitName: unit.name,
    productCode,
    unitCode,
    key: `${product.type}_${unit.type}`
  };
}

// Función para detectar si es RUT o código QR
function detectSearchType(input) {
  // Eliminar espacios y puntos para análisis
  const cleanInput = input.replace(/[.\s]/g, '');
  
  // Patrón para RUT chileno: números, guión, dígito verificador
  // Ejemplos: 12345678-9, 18708323-0
  const rutPattern = /^\d{7,8}-\d$/;
  
  // Patrón para código QR: 2 letras mayúsculas + guión + números
  // Ejemplos: SF-200, SF-2000, SF-20000
  const qrPattern = /^[A-Z]{2}-\d+$/i;
  
  if (rutPattern.test(cleanInput)) {
    return { type: "rut", value: cleanInput };
  } else if (qrPattern.test(cleanInput)) {
    return { type: "qr", value: cleanInput.toUpperCase() };
  } else {
    // Si no coincide con ningún patrón, intentar como RUT
    return { type: "rut", value: cleanInput };
  }
}

// Función para obtener RUT a partir de código QR
async function getRutFromQr(qrCode) {
  try {
    // Buscar en la colección worker donde idQr contenga el código
    const workersRef = collection(db, "worker");
    const q = query(workersRef, where("idQr", "array-contains", qrCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error(`No se encontró trabajador con código QR: ${qrCode}`);
    }
    
    // Tomar el primer resultado (asumiendo que cada QR es único)
    const workerDoc = querySnapshot.docs[0];
    const workerData = workerDoc.data();
    
    return {
      rut: workerDoc.id,
      name: workerData.name,
      idQr: workerData.idQr
    };
  } catch (error) {
    console.error("Error al buscar por código QR:", error);
    throw error;
  }
}

// Función principal optimizada
export async function getWorkerWeightsOptimized(searchInput, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  
  // Detectar tipo de búsqueda
  const searchType = detectSearchType(searchInput);
  let rut = null;
  let workerInfo = null;
  
  if (searchType.type === "qr") {
    // Buscar por código QR
    try {
      workerInfo = await getRutFromQr(searchType.value);
      rut = workerInfo.rut;
    } catch (error) {
      // Si no se encuentra, retornar error
      return {
        error: true,
        message: error.message,
        worker: null,
        totals: [],
        locations: [],
        firstDate: null,
        lastDate: null,
        days: []
      };
    }
  } else {
    // Buscar por RUT
    rut = normalizeRut(searchType.value);
  }
  
  // Obtener datos del trabajador (si no los tenemos ya)
  let worker = null;
  
  if (workerInfo) {
    // Ya tenemos la información del trabajador
    worker = {
      rut: workerInfo.rut,
      name: workerInfo.name || "Unknown",
      idQr: workerInfo.idQr || []
    };
  } else {
    // Buscar por RUT
    const workerDoc = doc(db, "worker", rut);
    const workerSnapshot = await getDoc(workerDoc);
    
    if (workerSnapshot.exists()) {
      const workerData = workerSnapshot.data();
      worker = {
        rut,
        name: workerData.name || "Unknown",
        idQr: workerData.idQr || []
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
        days: []
      };
    }
  }
  
  // Consultar todas las entradas del trabajador
  let q = query(
    collectionGroup(db, "entry"),
    where("rut", "==", rut)
  );
  
  const entriesSnapshot = await getDocs(q);
  
  // Estructura dinámica para acumular datos
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
    
    // Totales generales
    if (!totalsMap.has(qualityInfo.key)) {
      totalsMap.set(qualityInfo.key, {
        key: qualityInfo.key,
        productType: qualityInfo.productType,
        productName: qualityInfo.productName,
        unitType: qualityInfo.unitType,
        unitName: qualityInfo.unitName,
        amount: 0,
        count: 0
      });
    }
    
    const totalEntry = totalsMap.get(qualityInfo.key);
    totalEntry.amount += amount;
    totalEntry.count++;
    
    // Totales por día
    if (!daysMap.has(date)) {
      daysMap.set(date, {
        date,
        totals: new Map(),
        entries: [],
        locations: new Set()
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
        count: 0
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
        raw: entry.quality
      }
    });
    
    day.locations.add(locationCode);
  });
  
  // Convertir totalsMap a array
  const totals = Array.from(totalsMap.values()).map(t => ({
    ...t,
    amount: Number(t.amount.toFixed(2))
  }));
  
  totals.sort((a, b) => {
    if (a.productType !== b.productType) {
      return a.productType.localeCompare(b.productType);
    }
    return a.unitType.localeCompare(b.unitType);
  });
  
  // Convertir días
  const days = Array.from(daysMap.values()).map(day => ({
    date: day.date,
    totals: Array.from(day.totals.values()).map(t => ({
      ...t,
      amount: Number(t.amount.toFixed(2))
    })).sort((a, b) => {
      if (a.productType !== b.productType) {
        return a.productType.localeCompare(b.productType);
      }
      return a.unitType.localeCompare(b.unitType);
    }),
    entries: day.entries,
    locations: Array.from(day.locations)
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
    searchType: searchType.type // Para saber cómo se buscó
  };
}