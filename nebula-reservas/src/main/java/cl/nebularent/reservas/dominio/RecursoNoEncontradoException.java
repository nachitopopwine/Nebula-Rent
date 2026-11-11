package cl.nebularent.reservas.dominio;

/** El recurso solicitado no existe (gRPC NOT_FOUND). */
public class RecursoNoEncontradoException extends RuntimeException {
    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
