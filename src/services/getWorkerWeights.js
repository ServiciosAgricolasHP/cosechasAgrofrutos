import { collection, getDoc, getDocs, doc} from "firebase/firestore";
import { db } from "../../firebase";

const getTodayId = () => {
  return "2026-03-05"/* new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Santiago",
  });*/
};

export async function getWorkerWeights(rut) {
  const weightRef = collection(db, "weightIn");
  const weightSnap = await getDocs(weightRef);
  const resultados = [];
  let totalAmount = 0;

  weightSnap.forEach((docSnap) => {
    const weights = docSnap.data();
    const fecha = docSnap.id; // Fechas
    totalAmount = 0;

    if (weights.kilos && Array.isArray(weights.kilos)) {
      weights.kilos.forEach((item) => {
        
        if (item.rut === rut) { // si tienen el mismo rut
            totalAmount += item.amount
        }
      });
    }
    if (totalAmount > 0){
    resultados.push({
            date: fecha,
            amount: totalAmount,
    });
  }
  });

  console.log("Resultados filtrados:", resultados);
  return resultados;
}




export async function testConnection() {

  const snapshot = await getDocs(collection(db, "weightIn"));

  console.log("Cantidad docs1:", snapshot.docs.length);

  snapshot.forEach(doc => {
    console.log("DOC:", doc.id, doc.data());
  });

}
