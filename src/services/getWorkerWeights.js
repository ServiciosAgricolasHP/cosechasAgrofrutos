import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export async function getWorkerWeights(rut) {

  const snapshot = await getDocs(collection(db, "weightIn"));

  console.log("Snapshot completo:", snapshot);
  console.log("Docs:", snapshot.docs);

}
export async function testConnection() {

  const snapshot = await getDocs(collection(db, "weightIn"));

  console.log("Cantidad docs1:", snapshot.docs.length);

  snapshot.forEach(doc => {
    console.log("DOC:", doc.id, doc.data());
  });

}
