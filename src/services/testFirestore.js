import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export async function testFirestore() {

  const snapshot = await getDocs(collection(db, "weightIn"));

  console.log("Cantidad docs:", snapshot.size);

  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });

}