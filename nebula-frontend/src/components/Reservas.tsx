import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { PAGAR_RESERVA, RESERVAS, creditos, type Reserva } from "../graphql";
import { ReservaForm } from "./ReservaForm";

export function Reservas() {
  // Polling: el pago se procesa de forma asíncrona (Kafka → .NET → gRPC → Java).
  const { data, loading, error } = useQuery<{ reservas: Reserva[] }>(RESERVAS, { pollInterval: 5000 });

  return (
    <section className="dos-columnas">
      <div>
        <h2>Reservas</h2>
        {loading && <p className="estado">Cargando reservas…</p>}
        {error && <p className="error">No se pudo cargar: {error.message}</p>}
        {data && data.reservas.length === 0 && <p className="estado">Aún no hay reservas.</p>}
        <ul className="lista reservas">
          {data?.reservas.map((r) => <FilaReserva key={r.id} reserva={r} />)}
        </ul>
      </div>
      <ReservaForm />
    </section>
  );
}

function FilaReserva({ reserva: r }: { reserva: Reserva }) {
  const [token, setToken] = useState("tok_visa_4242");
  const [pagar, { data, loading, error }] = useMutation(PAGAR_RESERVA, {
    refetchQueries: [{ query: RESERVAS }],
  });

  return (
    <li>
      <div className="reserva-info">
        <span className="nombre">
          {r.nave?.nombre ?? "Nave"} → {r.destino}
        </span>
        <span className="dato">
          {r.piloto?.nombre ?? "Piloto"} · {r.dias} días · {creditos(r.montoTotal)}
        </span>
      </div>
      <span className={`pago pago-${r.estadoPago.toLowerCase()}`}>{r.estadoPago}</span>
      {r.estadoPago === "PENDIENTE" && r.estado !== "CANCELADA" && !data && (
        <div className="pagar">
          <input aria-label={`Token de pago ${r.id}`} value={token} onChange={(e) => setToken(e.target.value)} />
          <button
            disabled={loading}
            onClick={() => pagar({ variables: { reservaId: r.id, tokenTarjeta: token } }).catch(() => undefined)}
          >
            {loading ? "Enviando…" : "Pagar"}
          </button>
        </div>
      )}
      {data && <small className="estado">{data.pagarReserva.mensaje}</small>}
      {error && <small className="error">{error.message}</small>}
    </li>
  );
}
