package cl.nebularent.reservas.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import cl.nebularent.reservas.grpc.GrpcServidor;
import cl.nebularent.reservas.grpc.ReservaGrpcService;
import cl.nebularent.reservas.repositorio.NaveRepository;
import cl.nebularent.reservas.servicio.ReservaService;
import io.grpc.ManagedChannel;

class ConfigTest {

    @Test
    void siembraLaFlotaSoloSiEstaVacia() {
        NaveRepository naves = mock(NaveRepository.class);
        when(naves.count()).thenReturn(0L);
        new DatosIniciales(naves).run();
        verify(naves).saveAll(DatosIniciales.FLOTA);

        NaveRepository llenas = mock(NaveRepository.class);
        when(llenas.count()).thenReturn(6L);
        new DatosIniciales(llenas).run();
        verify(llenas, never()).saveAll(anyList());
    }

    @Test
    void creaCanalHaciaPilotos() {
        ManagedChannel canal = new GrpcClientesConfig().pilotosChannel("localhost:50051");
        assertThat(canal.authority()).isEqualTo("localhost:50051");
        canal.shutdownNow();
    }

    @Test
    void servidorGrpcArrancaYSeDetiene() {
        GrpcServidor servidor = new GrpcServidor(0, new ReservaGrpcService(mock(ReservaService.class)));
        assertThat(servidor.isRunning()).isFalse();
        assertThat(servidor.puertoReal()).isEqualTo(-1);
        servidor.start();
        assertThat(servidor.isRunning()).isTrue();
        assertThat(servidor.puertoReal()).isPositive();
        servidor.stop();
        assertThat(servidor.isRunning()).isFalse();
        servidor.stop(); // idempotente
    }
}
