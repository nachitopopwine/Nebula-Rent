package cl.nebularent.reservas.grpc;

import java.util.function.Supplier;

import org.springframework.stereotype.Component;

import cl.nebularent.reservas.servicio.ReservaService;
import cl.nebularent.reservas.v1.ActualizarEstadoPagoRequest;
import cl.nebularent.reservas.v1.CrearReservaRequest;
import cl.nebularent.reservas.v1.ListarNavesRequest;
import cl.nebularent.reservas.v1.ListarNavesResponse;
import cl.nebularent.reservas.v1.ListarReservasRequest;
import cl.nebularent.reservas.v1.ListarReservasResponse;
import cl.nebularent.reservas.v1.ObtenerReservaRequest;
import cl.nebularent.reservas.v1.Reserva;
import cl.nebularent.reservas.v1.ReservaServiceGrpc;
import io.grpc.stub.StreamObserver;

/** Adaptador gRPC del servicio de reservas (lo consumen el BFF y Pagos). */
@Component
public class ReservaGrpcService extends ReservaServiceGrpc.ReservaServiceImplBase {

    private final ReservaService servicio;

    public ReservaGrpcService(ReservaService servicio) {
        this.servicio = servicio;
    }

    @Override
    public void listarNaves(ListarNavesRequest req, StreamObserver<ListarNavesResponse> obs) {
        responder(obs, () -> ListarNavesResponse.newBuilder()
                .addAllNaves(servicio.listarNaves().stream().map(Mapeador::aProto).toList())
                .build());
    }

    @Override
    public void crearReserva(CrearReservaRequest req, StreamObserver<Reserva> obs) {
        responder(obs, () -> Mapeador.aProto(
                servicio.crear(req.getPilotoId(), req.getNaveId(), req.getDestino(), req.getDias())));
    }

    @Override
    public void obtenerReserva(ObtenerReservaRequest req, StreamObserver<Reserva> obs) {
        responder(obs, () -> Mapeador.aProto(servicio.obtener(req.getId())));
    }

    @Override
    public void listarReservas(ListarReservasRequest req, StreamObserver<ListarReservasResponse> obs) {
        responder(obs, () -> ListarReservasResponse.newBuilder()
                .addAllReservas(servicio.listar(req.getPilotoId()).stream().map(Mapeador::aProto).toList())
                .build());
    }

    @Override
    public void actualizarEstadoPago(ActualizarEstadoPagoRequest req, StreamObserver<Reserva> obs) {
        responder(obs, () -> Mapeador.aProto(
                servicio.actualizarEstadoPago(req.getReservaId(), req.getEstadoPago(), req.getTransaccionId())));
    }

    private static <T> void responder(StreamObserver<T> obs, Supplier<T> accion) {
        T respuesta;
        try {
            respuesta = accion.get();
        } catch (RuntimeException e) {
            obs.onError(Mapeador.aStatus(e));
            return;
        }
        obs.onNext(respuesta);
        obs.onCompleted();
    }
}
