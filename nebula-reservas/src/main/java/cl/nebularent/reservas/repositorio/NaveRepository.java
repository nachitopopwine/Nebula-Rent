package cl.nebularent.reservas.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import cl.nebularent.reservas.dominio.Nave;

public interface NaveRepository extends JpaRepository<Nave, String> {
    List<Nave> findAllByOrderByTarifaDiariaAsc();
}
