package cl.nebularent.reservas.eventos;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import cl.nebularent.reservas.dominio.Reserva;

/** Publica "reservas.creadas" en Kafka; lo consume nebula-pagos (.NET). */
@Component
public class KafkaEventosPublisher implements EventosPublisher {

    private static final Logger log = LoggerFactory.getLogger(KafkaEventosPublisher.class);

    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper json;
    private final String topico;

    public KafkaEventosPublisher(KafkaTemplate<String, String> kafka, ObjectMapper json,
                                 @Value("${nebula.kafka.topico-reservas}") String topico) {
        this.kafka = kafka;
        this.json = json;
        this.topico = topico;
    }

    @Override
    public void reservaCreada(Reserva r) {
        String payload = aJson(r);
        kafka.send(topico, r.getId(), payload)
                .whenComplete((ok, err) -> {
                    if (err != null) {
                        log.error("No se pudo publicar la reserva {} en {}", r.getId(), topico, err);
                    } else {
                        log.info("Evento publicado en {}: reserva {}", topico, r.getId());
                    }
                });
    }

    String aJson(Reserva r) {
        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("reservaId", r.getId());
        evento.put("pilotoId", r.getPilotoId());
        evento.put("naveId", r.getNaveId());
        evento.put("montoTotal", r.getMontoTotal());
        evento.put("creadaEn", r.getCreadaEn().toString());
        try {
            return json.writeValueAsString(evento);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo serializar el evento", e);
        }
    }
}
