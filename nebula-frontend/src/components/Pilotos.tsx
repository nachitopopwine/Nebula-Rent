import { useMutation, useQuery } from "@apollo/client";
import { useState, type FormEvent } from "react";
import { CREAR_PILOTO, LICENCIAS, PILOTOS, type Piloto } from "../graphql";

export function Pilotos() {
  const { data, loading, error } = useQuery<{ pilotos: Piloto[] }>(PILOTOS);
  const [crear, { loading: creando, error: errorCrear }] = useMutation(CREAR_PILOTO, {
    refetchQueries: [{ query: PILOTOS }],
  });
  const [nombre, setNombre] = useState("");
  const [licencia, setLicencia] = useState("CLASE_C");
  const [horas, setHoras] = useState(0);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await crear({ variables: { input: { nombre, licencia, horasVuelo: horas } } });
      setNombre("");
      setHoras(0);
    } catch {
      /* el error se muestra desde errorCrear */
    }
  };

  return (
    <section className="dos-columnas">
      <div>
        <h2>Pilotos</h2>
        {loading && <p className="estado">Cargando pilotos…</p>}
        {error && <p className="error">No se pudo cargar: {error.message}</p>}
        <ul className="lista">
          {data?.pilotos.map((p) => (
            <li key={p.id}>
              <span className="nombre">{p.nombre}</span>
              <span className="etiqueta">{p.licencia}</span>
              <span className="dato">{p.horasVuelo} h</span>
            </li>
          ))}
        </ul>
      </div>

      <form className="panel" onSubmit={enviar} aria-label="Registrar piloto">
        <h3>Registrar piloto</h3>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={3} />
        </label>
        <label>
          Licencia
          <select value={licencia} onChange={(e) => setLicencia(e.target.value)}>
            {LICENCIAS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Horas de vuelo
          <input type="number" min={0} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
        </label>
        <button type="submit" disabled={creando}>
          {creando ? "Registrando…" : "Registrar"}
        </button>
        {errorCrear && <p className="error">{errorCrear.message}</p>}
      </form>
    </section>
  );
}
