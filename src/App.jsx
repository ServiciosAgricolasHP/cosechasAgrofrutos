
import { getWorkerWeights } from "./services/getWorkerWeights"
import { useState, useEffect } from "react";
import { testConnection } from "./services/getWorkerWeights";


function App() {
  useEffect(() => {
    testConnection();

  }, []);

 
  const [rut, setRut] = useState("");
  const [weights, setWeights] = useState([]);

  const buscar = async () => {
    const data = await getWorkerWeights(rut);
    setWeights(data);
  };
  //console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID);
  //console.log(firebaseConfig);


  return (
    <div>

      <h1>Buscar pesajes</h1>

      <input
        type="text"
        placeholder="Ingrese RUT"
        value={rut}
        onChange={(e) => setRut(e.target.value)}
      />

      <button onClick={buscar}>
        Buscar
      </button>

      <ul>
        {weights.map((w, i) => (
          <li key={i}>
            {w.date} - {w.amount} kg
          </li>
        ))}
      </ul>

    </div>
  );
}

export default App;