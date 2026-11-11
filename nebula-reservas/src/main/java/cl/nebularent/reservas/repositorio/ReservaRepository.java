package cl.nebularent.reservas.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import cl.nebularent.reservas.dominio.Reserva;

public interface ReservaRepository extends JpaRepository<Reserva, String> {
    List<Reserva> findAllByOrderByCreadaEnDesc();

    List<Reserva> findByPilotoIdOrderByCreadaEnDesc(String pilotoId);
}
