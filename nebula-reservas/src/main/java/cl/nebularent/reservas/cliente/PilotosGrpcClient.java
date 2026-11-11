package cl.nebularent.reservas.cliente;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import cl.nebularent.pilotos.v1.ObtenerPilotoRequest;
import cl.nebularent.pilotos.v1.Piloto;
import cl.nebularent.pilotos.v1.PilotoServiceGrpc;
import cl.nebularent.reservas.dominio.ServicioNoDisponibleException;
import io.grpc.ManagedChannel;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;

/** Cliente gRPC hacia nebula-pilotos (Java → Go). */
@Component
public class PilotosGrpcClient implements PilotosClient {

    private static final long TIMEOUT_MS = 3000;

    private final PilotoServiceGrpc.PilotoServiceBlockingStub stub;

    public PilotosGrpcClient(@Qualifier("pilotosChannel") ManagedChannel canal) {
        this.stub = PilotoServiceGrpc.newBlockingStub(canal);
    }

    @Override
    public Optional<PilotoInfo> obtener(String pilotoId) {
        try {
            Piloto p = stub.withDeadlineAfter(TIMEOUT_MS, TimeUnit.MILLISECONDS)
                    .obtenerPiloto(ObtenerPilotoRequest.newBuilder().setId(pilotoId).build());
            return Optional.of(new PilotoInfo(p.getId(), p.getNombre(), p.getLicencia(), p.getActivo()));
        } catch (StatusRuntimeException e) {
            Status.Code codigo = e.getStatus().getCode();
            if (codigo == Status.Code.NOT_FOUND || codigo == Status.Code.INVALID_ARGUMENT) {
                return Optional.empty();
            }
            throw new ServicioNoDisponibleException("No se pudo consultar el servicio de pilotos", e);
        }
    }
}
