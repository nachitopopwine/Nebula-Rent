import { useMutation, useQuery } from "@apollo/client";
import { useState, type FormEvent } from "react";
import {
  CREAR_RESERVA,
  DESTINOS,
  NAVES,
  PILOTOS,
  RESERVAS,
  creditos,
  type EvaluacionRuta,
  type Nave,
  type Piloto,
} from "../graphql";

interface Resultado {
  crearReserva: { reserva: { id: string; montoTotal: number }; evaluacionRuta: EvaluacionRuta | null };
}

export function ReservaForm() {
  const pilotos = useQuery<{ pilotos: Piloto[] }>(PILOTOS);
  const naves = useQuery<{ naves: Nave[] }>(NAVES);
  const [crear, { data, loading, error }] = useMutation<Resultado>(CREAR_RESERVA, {
    refetchQueries: [{ query: RESERVAS }],
  });

  const [pilotoId, setPilotoId] = useState("");
  const [naveId, setNaveId] = useState("");
  const [destino, setDestino] = useState(DESTINOS[0]);
  const [dias, setDias] = useState(3);

  const nave = naves.data?.naves.find((n) => n.id === naveId);
  const estimado = nave ? nave.tarifaDiaria * dias * (dias >= 7 ? 0.9 : 1) : null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    await crear({ variables: { input: { pilotoId, naveId, destino, dias } } }).catch(() => undefined);
  };

  const evaluacion = data?.crearReserva.evaluacionRuta;

  return (
    <form className="panel" onSubmit={enviar} aria-label="Nueva reserva">
      <h3>Nueva reserva</h3>
      <label>
        Piloto
        <select value={pilotoId} onChange={(e) => setPilotoId(e.target.value)} required>
          <option value="">Selecciona…</option>
          {pilotos.data?.pilotos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.licencia})
            </option>
          ))}
        </select>
      </label>
      <label>
        Nave
        <select value={naveId} onChange={(e) => setNaveId(e.target.value)} required>
          <option value="">Selecciona…</option>
          {naves.data?.naves.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre} · requiere {n.licenciaRequerida}
            </option>
          ))}
        </select>
      </label>
      <label>
        Destino
        <select value={destino} onChange={(e) => setDestino(e.target.value)}>
          {DESTINOS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label>
        Días
        <input type="number" min={1} max={30} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
      </label>
      {estimado !== null && (
        <p className="estimado">
          Estimado: <strong>{creditos(estimado)}</strong>
          {dias >= 7 && <span className="etiqueta">-10% estadía larga</span>}
        </p>
      )}
      <button type="submit" disabled={loading}>
        {loading ? "Evaluando clima y reservando…" : "Reservar"}
      </button>
      {error && <p className="error">{error.message}</p>}
      {data && (
        <div className="exito" role="status">
          Reserva confirmada por {creditos(data.crearReserva.reserva.montoTotal)}.
          {evaluacion && (
            <p>
              Clima hacia {evaluacion.destino}: <strong>{evaluacion.riesgo}</strong>. {evaluacion.recomendacion}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
