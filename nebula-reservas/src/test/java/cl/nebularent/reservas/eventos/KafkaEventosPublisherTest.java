package cl.nebularent.reservas.eventos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import cl.nebularent.reservas.dominio.Reserva;

class KafkaEventosPublisherTest {

    @SuppressWarnings("unchecked")
    private final KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
    private final ObjectMapper json = new ObjectMapper();
    private final KafkaEventosPublisher publisher = new KafkaEventosPublisher(kafka, json, "reservas.creadas");
    private final Reserva reserva = new Reserva("r1", "p1", "NV-003", "Encélado", 4, 14000.0,
            Instant.parse("2026-11-11T12:00:00Z"));

    @Test
    void serializaElEvento() throws Exception {
        JsonNode nodo = json.readTree(publisher.aJson(reserva));
        assertThat(nodo.get("reservaId").asText()).isEqualTo("r1");
        assertThat(nodo.get("pilotoId").asText()).isEqualTo("p1");
        assertThat(nodo.get("naveId").asText()).isEqualTo("NV-003");
        assertThat(nodo.get("montoTotal").asDouble()).isEqualTo(14000.0);
        assertThat(nodo.get("creadaEn").asText()).isEqualTo("2026-11-11T12:00:00Z");
    }

    @Test
    void publicaEnElTopicoConLaReservaComoClave() {
        CompletableFuture<SendResult<String, String>> ok = CompletableFuture.completedFuture(null);
        when(kafka.send(eq("reservas.creadas"), eq("r1"), anyString())).thenReturn(ok);
        publisher.reservaCreada(reserva);
        verify(kafka).send(eq("reservas.creadas"), eq("r1"), anyString());
    }

    @Test
    void noFallaSiKafkaRechazaElMensaje() {
        CompletableFuture<SendResult<String, String>> error = CompletableFuture.failedFuture(new RuntimeException("sin broker"));
        when(kafka.send(eq("reservas.creadas"), eq("r1"), anyString())).thenReturn(error);
        publisher.reservaCreada(reserva); // solo registra el error
        verify(kafka).send(eq("reservas.creadas"), eq("r1"), anyString());
    }
}
