import { useQuery } from "@apollo/client";
import { NAVES, creditos, type Nave } from "../graphql";

export function Flota() {
  const { data, loading, error } = useQuery<{ naves: Nave[] }>(NAVES);

  if (loading) return <p className="estado">Cargando flota…</p>;
  if (error) return <p className="error">No se pudo cargar la flota: {error.message}</p>;

  return (
    <section>
      <h2>Flota disponible</h2>
      <div className="grilla">
        {data!.naves.map((n) => (
          <article key={n.id} className={`tarjeta nave clase-${n.clase.toLowerCase()}`}>
            <header>
              <span className="codigo">{n.id}</span>
              <span className="etiqueta">{n.clase}</span>
            </header>
            <h3>{n.nombre}</h3>
            <dl>
              <dt>Tarifa diaria</dt>
              <dd>{creditos(n.tarifaDiaria)}</dd>
              <dt>Tripulación</dt>
              <dd>{n.capacidad}</dd>
              <dt>Licencia</dt>
              <dd>{n.licenciaRequerida}</dd>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
