package cl.nebularent.reservas.eventos;

import cl.nebularent.reservas.dominio.Reserva;

/** Puerto de salida de eventos de dominio. */
public interface EventosPublisher {
    void reservaCreada(Reserva reserva);
}
