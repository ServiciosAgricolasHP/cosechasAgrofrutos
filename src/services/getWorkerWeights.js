import {
  collection,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "../../firebase";

/*
Normaliza el RUT eliminando puntos y espacios.
Mantiene el formato base utilizado en la BD.
*/
function normalizeRut(rut) {
  return rut
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}


/*
Obtiene toda la información de pesajes de un trabajador.
Devuelve:
- datos del trabajador
- total general
- rango de fechas
- detalle agrupado por día
*/
export async function getWorkerWeights(rutInput) {

  const rut = normalizeRut(rutInput);

  const weightCollection = collection(db, "weightIn");
  const workerDocument = doc(db, "worker", rut);

  /*
  Ejecutar consultas en paralelo
  */
  const [weightSnapshot, workerSnapshot] = await Promise.all([
    getDocs(weightCollection),
    getDoc(workerDocument)
  ]);

  /*
  Obtener información del trabajador
  */
  let worker = null;

  if (workerSnapshot.exists()) {

    const workerData = workerSnapshot.data();

    worker = {
      rut,
      name: workerData.name || "Unknown",
      idQr: workerData.idQr || []
    };

  }

  const days = [];
  let totalAmount = 0;

  /*
  Recorrer documentos de días de pesaje
  */
  weightSnapshot.forEach((docSnap) => {

    const date = docSnap.id;
    const data = docSnap.data();

    if (!data.kilos) return;

    const entries = [];
    let dayTotal = 0;

    /*
    Convertir el map de kilos en iterable
    */
    Object.values(data.kilos).forEach((item) => {

      if (normalizeRut(item.rut) === rut) {

        const amount = Number(item.amount) || 0;

        entries.push({
          amount,
          supervisor: item.supervisor || "",
          dailyCount: item.dailyCount || 0
        });

        dayTotal += amount;

      }

    });

    /*
    Guardar día solo si tiene registros
    */
    if (entries.length > 0) {

      days.push({
        date,
        total: Number(dayTotal.toFixed(2)),
        count: entries.length,
        entries
      });

      totalAmount += dayTotal;

    }

  });

  /*
  Ordenar fechas de forma ascendente
  */
  days.sort((a, b) => a.date.localeCompare(b.date));

  /*
  Calcular rango de fechas trabajadas
  */
  const firstDate = days.length > 0 ? days[0].date : null;
  const lastDate = days.length > 0 ? days[days.length - 1].date : null;

  return {

    worker,

    total: Number(totalAmount.toFixed(2)),

    firstDate,

    lastDate,

    days

  };

}


/*
Función auxiliar para validar conectividad con Firestore
*/
export async function testConnection() {

  const snapshot = await getDocs(collection(db, "weightIn"));

  console.log("Documents found:", snapshot.docs.length);

  snapshot.forEach(doc => {
    console.log("DOC:", doc.id, doc.data());
  });

}