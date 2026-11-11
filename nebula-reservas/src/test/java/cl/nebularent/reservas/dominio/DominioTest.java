package cl.nebularent.reservas.dominio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class DominioTest {

    @ParameterizedTest
    @CsvSource({
            "CLASE_A, CLASE_A, true",
            "CLASE_A, CLASE_C, true",
            "CLASE_B, CLASE_C, true",
            "CLASE_B, CLASE_A, false",
            "CLASE_C, CLASE_B, false",
            "CLASE_X, CLASE_C, false",
            "CLASE_A, CLASE_X, false"
    })
    void licencias(String piloto, String requerida, boolean esperado) {
        assertThat(ReglasDeVuelo.puedePilotear(piloto, requerida)).isEqualTo(esperado);
    }

    @Test
    void montoSinDescuento() {
        assertThat(ReglasDeVuelo.calcularMonto(1200.0, 3)).isEqualTo(3600.0);
    }

    @Test
    void montoConDescuentoDesdeSieteDias() {
        // 1000 * 7 = 7000 - 10% = 6300
        assertThat(ReglasDeVuelo.calcularMonto(1000.0, 7)).isEqualTo(6300.0);
    }

    @Test
    void montoRedondeaADosDecimales() {
        assertThat(ReglasDeVuelo.calcularMonto(333.333, 1)).isEqualTo(333.33);
    }

    @Test
    void montoRechazaValoresInvalidos() {
        assertThatThrownBy(() -> ReglasDeVuelo.calcularMonto(-1, 2)).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> ReglasDeVuelo.calcularMonto(100, 0)).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> ReglasDeVuelo.calcularMonto(100, 31)).isInstanceOf(ReglaNegocioException.class);
    }

    @Test
    void estadoPagoDesdeTexto() {
        assertThat(EstadoPago.desde(" aprobado ")).isEqualTo(EstadoPago.APROBADO);
        assertThatThrownBy(() -> EstadoPago.desde("PAGADO")).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> EstadoPago.desde(" ")).isInstanceOf(ReglaNegocioException.class);
        assertThatThrownBy(() -> EstadoPago.desde(null)).isInstanceOf(ReglaNegocioException.class);
    }

    private Reserva nuevaReserva() {
        return new Reserva("r1", "p1", "NV-001", "Luna", 2, 2400.0, Instant.parse("2026-11-11T12:00:00Z"));
    }

    @Test
    void reservaNuevaQuedaConfirmadaYPendiente() {
        Reserva r = nuevaReserva();
        assertThat(r.getEstado()).isEqualTo(EstadoReserva.CONFIRMADA);
        assertThat(r.getEstadoPago()).isEqualTo(EstadoPago.PENDIENTE);
        assertThat(r.getTransaccionId()).isNull();
    }

    @Test
    void pagoAprobado() {
        Reserva r = nuevaReserva();
        r.registrarPago(EstadoPago.APROBADO, "tx-1");
        assertThat(r.getEstadoPago()).isEqualTo(EstadoPago.APROBADO);
        assertThat(r.getEstado()).isEqualTo(EstadoReserva.CONFIRMADA);
        assertThat(r.getTransaccionId()).isEqualTo("tx-1");
        // idempotente
        r.registrarPago(EstadoPago.APROBADO, "tx-1");
        assertThat(r.getEstadoPago()).isEqualTo(EstadoPago.APROBADO);
    }

    @Test
    void pagoRechazadoCancelaLaReserva() {
        Reserva r = nuevaReserva();
        r.registrarPago(EstadoPago.RECHAZADO, "tx-2");
        assertThat(r.getEstado()).isEqualTo(EstadoReserva.CANCELADA);
    }

    @Test
    void noSePuedeCambiarUnPagoFinal() {
        Reserva r = nuevaReserva();
        r.registrarPago(EstadoPago.APROBADO, "tx-1");
        assertThatThrownBy(() -> r.registrarPago(EstadoPago.RECHAZADO, "tx-3"))
                .isInstanceOf(ReglaNegocioException.class);
    }

    @Test
    void noSePuedeVolverAPendiente() {
        Reserva r = nuevaReserva();
        r.registrarPago(EstadoPago.PENDIENTE, null); // mismo estado: no-op
        assertThat(r.getEstadoPago()).isEqualTo(EstadoPago.PENDIENTE);
        r.registrarPago(EstadoPago.RECHAZADO, "tx");
        assertThatThrownBy(() -> r.registrarPago(EstadoPago.PENDIENTE, null))
                .isInstanceOf(ReglaNegocioException.class);
    }
}
