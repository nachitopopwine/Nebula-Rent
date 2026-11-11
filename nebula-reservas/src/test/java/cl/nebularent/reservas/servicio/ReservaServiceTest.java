package cl.nebularent.reservas.servicio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import cl.nebularent.reservas.cliente.PilotosClient;
import cl.nebularent.reservas.cliente.PilotosClient.PilotoInfo;
import cl.nebularent.reservas.dominio.EstadoPago;
import cl.nebularent.reservas.dominio.EstadoReserva;
import cl.nebularent.reservas.dominio.Nave;
import cl.nebularent.reservas.dominio.RecursoNoEncontradoException;
import cl.nebularent.reservas.dominio.ReglaNegocioException;
import cl.nebularent.reservas.dominio.Reserva;
import cl.nebularent.reservas.eventos.EventosPublisher;
import cl.nebularent.reservas.repositorio.NaveRepository;
import cl.nebularent.reservas.repositorio.ReservaRepository;

class ReservaServiceTest {

    private static final Instant AHORA = Instant.parse("2026-11-11T12:00:00Z");
    private static final Nave LUJO = new Nave("NV-005", "Aurora Boreal", "LUJO", "CLASE_A", 9800.0, 10);
    private static final Nave EXPLORACION = new Nave("NV-001", "Colibrí Estelar", "EXPLORACION", "CLASE_C", 1200.0, 2);

    private NaveRepository naves;
    private ReservaRepository reservas;
    private PilotosClient pilotos;
    private EventosPublisher eventos;
    private ReservaService servicio;

    @BeforeEach
    void setUp() {
        naves = mock(NaveRepository.class);
        reservas = mock(ReservaRepository.class);
        pilotos = mock(PilotosClient.class);
        eventos = mock(EventosPublisher.class);
        servicio = new ReservaService(naves, reservas, pilotos, eventos, Clock.fixed(AHORA, ZoneOffset.UTC));
        when(reservas.save(any(Reserva.class))).thenAnswer(inv -> inv.getArgument(0));
        when(naves.findById("NV-005")).thenReturn(Optional.of(LUJO));
        when(naves.findById("NV-001")).thenReturn(Optional.of(EXPLORACION));
    }

    @Test
    void creaReservaYPublicaEvento() {
        when(pilotos.obtener("p1")).thenReturn(Optional.of(new PilotoInfo("p1", "Valentina", "CLASE_A", true)));

        Reserva r = servicio.crear("p1", "NV-005", "  Europa  ", 7);

        assertThat(r.getId()).isNotBlank();
        assertThat(r.getDestino()).isEqualTo("Europa");
        assertThat(r.getMontoTotal()).isEqualTo(61740.0); // 9800*7*0.9
        assertThat(r.getCreadaEn()).isEqualTo(AHORA);
        assertThat(r.getEstadoPago()).isEqualTo(EstadoPago.PENDIENTE);
        verify(eventos).reservaCreada(r);
    }

    @Test
    void rechazaLicenciaInsuficiente() {
        when(pilotos.obtener("p3")).thenReturn(Optional.of(new PilotoInfo("p3", "Isidora", "CLASE_C", true)));
        assertThatThrownBy(() -> servicio.crear("p3", "NV-005", "Marte", 2))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("CLASE_A");
        verify(eventos, never()).reservaCreada(any());
    }

    @Test
    void rechazaPilotoInactivo() {
        when(pilotos.obtener("p9")).thenReturn(Optional.of(new PilotoInfo("p9", "Retirado", "CLASE_A", false)));
        assertThatThrownBy(() -> servicio.crear("p9", "NV-001", "Marte", 2))
                .isInstanceOf(ReglaNegocioException.class);
    }

    @Test
    void pilotoONaveInexistentes() {
        when(pilotos.obtener("nadie")).thenReturn(Optional.empty());
        when(naves.findById("NV-999")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> servicio.crear("nadie", "NV-001", "Marte", 2))
                .isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> servicio.crear("p1", "NV-999", "Marte", 2))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void validaEntradas() {
        assertThatThrownBy(() -> servicio.crear("", "NV-001", "Marte", 2)).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> servicio.crear("p1", null, "Marte", 2)).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> servicio.crear("p1", "NV-001", "M", 2)).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> servicio.crear("p1", "NV-001", "Marte", 0)).isInstanceOf(ReglaNegocioException.class);
    }

    @Test
    void listarYObtener() {
        Reserva r = new Reserva("r1", "p1", "NV-001", "Luna", 1, 1200, AHORA);
        when(reservas.findAllByOrderByCreadaEnDesc()).thenReturn(List.of(r));
        when(reservas.findByPilotoIdOrderByCreadaEnDesc("p1")).thenReturn(List.of(r));
        when(reservas.findById("r1")).thenReturn(Optional.of(r));
        when(naves.findAllByOrderByTarifaDiariaAsc()).thenReturn(List.of(EXPLORACION, LUJO));

        assertThat(servicio.listar(null)).containsExactly(r);
        assertThat(servicio.listar(" ")).containsExactly(r);
        assertThat(servicio.listar("p1")).containsExactly(r);
        assertThat(servicio.obtener("r1")).isSameAs(r);
        assertThat(servicio.listarNaves()).hasSize(2);
        assertThatThrownBy(() -> servicio.obtener("x")).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> servicio.obtener("")).isInstanceOf(ReglaNegocioException.class);
    }

    @Test
    void actualizaEstadoPago() {
        Reserva r = new Reserva("r1", "p1", "NV-001", "Luna", 1, 1200, AHORA);
        when(reservas.findById("r1")).thenReturn(Optional.of(r));

        Reserva actualizada = servicio.actualizarEstadoPago("r1", "RECHAZADO", "tx-9");

        assertThat(actualizada.getEstadoPago()).isEqualTo(EstadoPago.RECHAZADO);
        assertThat(actualizada.getEstado()).isEqualTo(EstadoReserva.CANCELADA);
        assertThatThrownBy(() -> servicio.actualizarEstadoPago("r1", "OTRO", "tx"))
                .isInstanceOf(ReglaNegocioException.class);
    }
}
