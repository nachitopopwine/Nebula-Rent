package cl.nebularent.reservas.dominio;

/** Un servicio dependiente (p. ej. pilotos) no respondió (gRPC UNAVAILABLE). */
public class ServicioNoDisponibleException extends RuntimeException {
    public ServicioNoDisponibleException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
