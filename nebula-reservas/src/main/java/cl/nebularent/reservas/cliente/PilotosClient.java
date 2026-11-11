package cl.nebularent.reservas.cliente;

import java.util.Optional;

/** Puerto hacia el microservicio de pilotos (Go). */
public interface PilotosClient {

    record PilotoInfo(String id, String nombre, String licencia, boolean activo) {
    }

    /** Devuelve el piloto o vacío si no existe. Lanza ServicioNoDisponibleException si falla la red. */
    Optional<PilotoInfo> obtener(String pilotoId);
}
