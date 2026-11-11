package cl.nebularent.reservas.dominio;

import java.util.Locale;

public enum EstadoPago {
    PENDIENTE,
    APROBADO,
    RECHAZADO;

    /** Convierte texto (sin importar mayúsculas) en un estado válido. */
    public static EstadoPago desde(String valor) {
        if (valor == null || valor.isBlank()) {
            throw new ReglaNegocioException("El estado de pago es obligatorio");
        }
        try {
            return EstadoPago.valueOf(valor.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ReglaNegocioException("Estado de pago inválido: " + valor);
        }
    }
}
