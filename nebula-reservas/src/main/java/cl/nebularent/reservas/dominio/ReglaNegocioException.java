package cl.nebularent.reservas.dominio;

/** Datos de entrada inválidos o regla de negocio incumplida (gRPC INVALID_ARGUMENT). */
public class ReglaNegocioException extends RuntimeException {
    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
