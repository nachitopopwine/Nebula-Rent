package cl.nebularent.reservas.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import cl.nebularent.reservas.dominio.Nave;
import cl.nebularent.reservas.repositorio.NaveRepository;

/** Siembra la flota de naves si la tabla está vacía. */
@Component
public class DatosIniciales implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);

    static final List<Nave> FLOTA = List.of(
            new Nave("NV-001", "Colibrí Estelar", "EXPLORACION", "CLASE_C", 1200.0, 2),
            new Nave("NV-002", "Mula de Titán", "CARGA", "CLASE_C", 1800.0, 4),
            new Nave("NV-003", "Andes Profundo", "EXPLORACION", "CLASE_B", 3500.0, 6),
            new Nave("NV-004", "Cóndor Austral", "CARGA", "CLASE_B", 4200.0, 8),
            new Nave("NV-005", "Aurora Boreal", "LUJO", "CLASE_A", 9800.0, 10),
            new Nave("NV-006", "Atacama Prime", "LUJO", "CLASE_A", 15500.0, 12));

    private final NaveRepository naves;

    public DatosIniciales(NaveRepository naves) {
        this.naves = naves;
    }

    @Override
    public void run(String... args) {
        if (naves.count() == 0) {
            naves.saveAll(FLOTA);
            log.info("Flota inicial creada: {} naves", FLOTA.size());
        }
    }
}
