package cl.nebularent.reservas.cliente;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import cl.nebularent.pilotos.v1.ObtenerPilotoRequest;
import cl.nebularent.pilotos.v1.Piloto;
import cl.nebularent.pilotos.v1.PilotoServiceGrpc;
import cl.nebularent.reservas.dominio.ServicioNoDisponibleException;
import io.grpc.ManagedChannel;
import io.grpc.Server;
import io.grpc.Status;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;
import io.grpc.stub.StreamObserver;

/** Simula el servicio de pilotos (Go) con un servidor gRPC en memoria. */
class PilotosGrpcClientTest {

    static class PilotosFalso extends PilotoServiceGrpc.PilotoServiceImplBase {
        @Override
        public void obtenerPiloto(ObtenerPilotoRequest req, StreamObserver<Piloto> obs) {
            switch (req.getId()) {
                case "p1" -> {
                    obs.onNext(Piloto.newBuilder().setId("p1").setNombre("Valentina Orbe")
                            .setLicencia("CLASE_A").setActivo(true).build());
                    obs.onCompleted();
                }
                case "caido" -> obs.onError(Status.UNAVAILABLE.asRuntimeException());
                default -> obs.onError(Status.NOT_FOUND.asRuntimeException());
            }
        }
    }

    private Server servidor;
    private ManagedChannel canal;
    private PilotosGrpcClient cliente;

    @BeforeEach
    void setUp() throws Exception {
        String nombre = InProcessServerBuilder.generateName();
        servidor = InProcessServerBuilder.forName(nombre).directExecutor()
                .addService(new PilotosFalso()).build().start();
        canal = InProcessChannelBuilder.forName(nombre).directExecutor().build();
        cliente = new PilotosGrpcClient(canal);
    }

    @AfterEach
    void tearDown() {
        canal.shutdownNow();
        servidor.shutdownNow();
    }

    @Test
    void obtienePilotoExistente() {
        var piloto = cliente.obtener("p1");
        assertThat(piloto).isPresent();
        assertThat(piloto.get().licencia()).isEqualTo("CLASE_A");
        assertThat(piloto.get().activo()).isTrue();
    }

    @Test
    void devuelveVacioSiNoExiste() {
        assertThat(cliente.obtener("nadie")).isEmpty();
    }

    @Test
    void lanzaExcepcionSiElServicioCae() {
        assertThatThrownBy(() -> cliente.obtener("caido")).isInstanceOf(ServicioNoDisponibleException.class);
    }
}
