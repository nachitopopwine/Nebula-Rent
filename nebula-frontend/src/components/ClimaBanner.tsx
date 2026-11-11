import { useQuery } from "@apollo/client";
import { CLIMA, type ClimaEspacial } from "../graphql";

/** Banner con el estado del clima espacial (NASA DONKI vía MCP Server). */
export function ClimaBanner() {
  const { data, loading, error } = useQuery<{ climaEspacial: ClimaEspacial }>(CLIMA, {
    variables: { dias: 7 },
  });

  if (loading) return <div className="clima cargando">Escaneando actividad solar…</div>;
  if (error || !data) return <div className="clima desconocido">Clima espacial no disponible</div>;

  const c = data.climaEspacial;
  return (
    <div className={`clima riesgo-${c.nivelRiesgo.toLowerCase()}`} role="status">
      <strong>Riesgo solar: {c.nivelRiesgo}</strong>
      <span>
        {c.totalLlamaradas} llamaradas en 7 días
        {c.mayorClase ? ` · máxima ${c.mayorClase}` : ""}
      </span>
      <small>fuente: {c.origen === "SIN_DATOS" ? "sin datos de NASA" : "NASA DONKI"}</small>
    </div>
  );
}
