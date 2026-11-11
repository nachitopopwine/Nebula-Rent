package cl.nebularent.reservas.grpc;

import cl.nebularent.reservas.dominio.RecursoNoEncontradoException;
import cl.nebularent.reservas.dominio.ReglaNegocioException;
import cl.nebularent.reservas.dominio.ServicioNoDisponibleException;
import cl.nebularent.reservas.v1.Nave;
import cl.nebularent.reservas.v1.Reserva;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;

/** Convierte entre el dominio y los mensajes protobuf. */
final class Mapeador {

    private Mapeador() {
    }

    static Nave aProto(cl.nebularent.reservas.dominio.Nave n) {
        return Nave.newBuilder()
                .setId(n.getId())
                .setNombre(n.getNombre())
                .setClase(n.getClase())
                .setLicenciaRequerida(n.getLicenciaRequerida())
                .setTarifaDiaria(n.getTarifaDiaria())
                .setCapacidad(n.getCapacidad())
                .build();
    }

    static Reserva aProto(cl.nebularent.reservas.dominio.Reserva r) {
        return Reserva.newBuilder()
                .setId(r.getId())
                .setPilotoId(r.getPilotoId())
                .setNaveId(r.getNaveId())
                .setDestino(r.getDestino())
                .setDias(r.getDias())
                .setMontoTotal(r.getMontoTotal())
                .setEstado(r.getEstado().name())
                .setEstadoPago(r.getEstadoPago().name())
                .setCreadaEn(r.getCreadaEn().toString())
                .build();
    }

    static StatusRuntimeException aStatus(RuntimeException e) {
        Status status;
        if (e instanceof ReglaNegocioException) {
            status = Status.INVALID_ARGUMENT;
        } else if (e instanceof RecursoNoEncontradoException) {
            status = Status.NOT_FOUND;
        } else if (e instanceof ServicioNoDisponibleException) {
            status = Status.UNAVAILABLE;
        } else {
            return Status.INTERNAL.withDescription("Error interno del servicio de reservas")
                    .withCause(e).asRuntimeException();
        }
        return status.withDescription(e.getMessage()).asRuntimeException();
    }
}
