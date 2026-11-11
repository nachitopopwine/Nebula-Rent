package cl.nebularent.reservas.grpc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import cl.nebularent.reservas.dominio.Nave;
import cl.nebularent.reservas.dominio.RecursoNoEncontradoException;
import cl.nebularent.reservas.dominio.ReglaNegocioException;
import cl.nebularent.reservas.dominio.Reserva;
import cl.nebularent.reservas.dominio.ServicioNoDisponibleException;
import cl.nebularent.reservas.servicio.ReservaService;
import cl.nebularent.reservas.v1.ActualizarEstadoPagoRequest;
import cl.nebularent.reservas.v1.CrearReservaRequest;
import cl.nebularent.reservas.v1.ListarNavesRequest;
import cl.nebularent.reservas.v1.ListarReservasRequest;
import cl.nebularent.reservas.v1.ObtenerReservaRequest;
import cl.nebularent.reservas.v1.ReservaServiceGrpc;
import io.grpc.ManagedChannel;
import io.grpc.Server;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.inprocess.InProcessChannelBuilder;
import io.grpc.inprocess.InProcessServerBuilder;

/** Prueba el adaptador gRPC con un servidor en memoria y el servicio simulado. */
class ReservaGrpcServiceTest {

    private static final Instant AHORA = Instant.parse("2026-11-11T12:00:00Z");

    private ReservaService servicio;
    private Server servidor;
    private ManagedChannel canal;
    private ReservaServiceGrpc.ReservaServiceBlockingStub stub;

    @BeforeEach
    void setUp() throws Exception {
        servicio = mock(ReservaService.class);
        String nombre = InProcessServerBuilder.generateName();
        servidor = InProcessServerBuilder.forName(nombre).directExecutor()
                .addService(new ReservaGrpcService(servicio)).build().start();
        canal = InProcessChannelBuilder.forName(nombre).directExecutor().build();
        stub = ReservaServiceGrpc.newBlockingStub(canal);
    }

    @AfterEach
    void tearDown() {
        canal.shutdownNow();
        servidor.shutdownNow();
    }

    @Test
    void listaNaves() {
        when(servicio.listarNaves()).thenReturn(List.of(
                new Nave("NV-001", "Colibrí Estelar", "EXPLORACION", "CLASE_C", 1200.0, 2)));
        var resp = stub.listarNaves(ListarNavesRequest.getDefaultInstance());
        assertThat(resp.getNavesList()).hasSize(1);
        assertThat(resp.getNaves(0).getLicenciaRequerida()).isEqualTo("CLASE_C");
        assertThat(resp.getNaves(0).getTarifaDiaria()).isEqualTo(1200.0);
    }

    @Test
    void creaYObtieneReserva() {
        Reserva r = new Reserva("r1", "p1", "NV-001", "Luna", 2, 2400.0, AHORA);
        when(servicio.crear("p1", "NV-001", "Luna", 2)).thenReturn(r);
        when(servicio.obtener("r1")).thenReturn(r);
        when(servicio.listar("p1")).thenReturn(List.of(r));

        var creada = stub.crearReserva(CrearReservaRequest.newBuilder()
                .setPilotoId("p1").setNaveId("NV-001").setDestino("Luna").setDias(2).build());
        assertThat(creada.getId()).isEqualTo("r1");
        assertThat(creada.getEstado()).isEqualTo("CONFIRMADA");
        assertThat(creada.getEstadoPago()).isEqualTo("PENDIENTE");
        assertThat(creada.getCreadaEn()).isEqualTo("2026-11-11T12:00:00Z");

        assertThat(stub.obtenerReserva(ObtenerReservaRequest.newBuilder().setId("r1").build()).getMontoTotal())
                .isEqualTo(2400.0);
        assertThat(stub.listarReservas(ListarReservasRequest.newBuilder().setPilotoId("p1").build())
                .getReservasCount()).isEqualTo(1);
    }

    @Test
    void actualizaPago() {
        Reserva r = new Reserva("r1", "p1", "NV-001", "Luna", 2, 2400.0, AHORA);
        r.registrarPago(cl.nebularent.reservas.dominio.EstadoPago.APROBADO, "tx");
        when(servicio.actualizarEstadoPago("r1", "APROBADO", "tx")).thenReturn(r);
        var resp = stub.actualizarEstadoPago(ActualizarEstadoPagoRequest.newBuilder()
                .setReservaId("r1").setEstadoPago("APROBADO").setTransaccionId("tx").build());
        assertThat(resp.getEstadoPago()).isEqualTo("APROBADO");
    }

    @Test
    void traduceExcepcionesACodigosGrpc() {
        when(servicio.obtener("invalida")).thenThrow(new ReglaNegocioException("mala"));
        when(servicio.obtener("nada")).thenThrow(new RecursoNoEncontradoException("no hay"));
        when(servicio.obtener("caido")).thenThrow(new ServicioNoDisponibleException("caído", null));
        when(servicio.obtener("bug")).thenThrow(new IllegalStateException("boom"));

        assertThat(codigo("invalida")).isEqualTo(Status.Code.INVALID_ARGUMENT);
        assertThat(codigo("nada")).isEqualTo(Status.Code.NOT_FOUND);
        assertThat(codigo("caido")).isEqualTo(Status.Code.UNAVAILABLE);
        assertThat(codigo("bug")).isEqualTo(Status.Code.INTERNAL);
    }

    private Status.Code codigo(String id) {
        try {
            stub.obtenerReserva(ObtenerReservaRequest.newBuilder().setId(id).build());
        } catch (StatusRuntimeException e) {
            return e.getStatus().getCode();
        }
        throw new AssertionError("se esperaba un error gRPC para " + id);
    }
}
