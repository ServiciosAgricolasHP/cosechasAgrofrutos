// services/getWorkerWeightsOptimized.js
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  collectionGroup  // ← importante para consultar subcolecciones
} from "firebase/firestore";
import { db } from "../../firebase";

function normalizeRut(rut) {
  return rut.replace(/\./g, "").replace(/\s/g, "").toLowerCase();
}

export async function getWorkerWeightsOptimized(rutInput, dateRange = {}) {
  const rut = normalizeRut(rutInput);
  const { startDate, endDate } = dateRange;
  
  // 1. Obtener datos del trabajador (sigue igual)
  const workerDoc = doc(db, "worker", rut);
  const workerSnapshot = await getDoc(workerDoc);
  
  let worker = null;
  if (workerSnapshot.exists()) {
    const workerData = workerSnapshot.data();
    worker = {
      rut,
      name: workerData.name || "Unknown",
      idQr: workerData.idQr || []
    };
  }
  
  // 2. Usar collectionGroup para consultar TODOS los documentos "entry" de todas las fechas
  // Esto evita tener que recorrer cada documento de fecha manualmente
  let q = query(
    collectionGroup(db, "entry"),  // ← consulta todas las subcolecciones "entry"
    where("rut", "==", rut)
  );
  
  const entriesSnapshot = await getDocs(q);
  
  // 3. Agrupar por fecha (usando la referencia del documento padre)
  const daysMap = new Map();
  let totalAmount = 0;
  
  entriesSnapshot.forEach((docSnap) => {
    const entry = docSnap.data();
    
    // Obtener la fecha del documento padre (el documento que contiene la subcolección entry)
    // La ruta es: weights/{fecha}/entry/{id}
    const parentPath = docSnap.ref.parent.parent; // sube dos niveles: entry -> fecha
    const date = parentPath?.id; // El ID del documento padre es la fecha
    
    if (!date) return;
    
    // Filtrar por rango de fechas si se especifica
    if (startDate && date < startDate) return;
    if (endDate && date > endDate) return;
    
    if (!daysMap.has(date)) {
      daysMap.set(date, {
        date,
        total: 0,
        count: 0,
        entries: []
      });
    }
    
    const day = daysMap.get(date);
    const amount = Number(entry.amount) || 0;
    
    day.entries.push({
      amount,
      supervisor: entry.supervisor || "",
      dailyCount: entry.dailyCount || 0,
      idQr: entry.idQr,
      paid: entry.paid
    });
    
    day.total += amount;
    day.count++;
    totalAmount += amount;
  });
  
  const days = Array.from(daysMap.values());
  
  // Ordenar días por fecha
  days.sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    worker,
    total: Number(totalAmount.toFixed(2)),
    firstDate: days[0]?.date || null,
    lastDate: days[days.length - 1]?.date || null,
    days
  };
}