package cl.nebularent.reservas.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Nave espacial disponible para arriendo. */
@Entity
@Table(name = "naves")
public class Nave {

    @Id
    @Column(length = 40)
    private String id;

    @Column(nullable = false, length = 80)
    private String nombre;

    /** CARGA, EXPLORACION o LUJO. */
    @Column(nullable = false, length = 20)
    private String clase;

    @Column(name = "licencia_requerida", nullable = false, length = 10)
    private String licenciaRequerida;

    @Column(name = "tarifa_diaria", nullable = false)
    private double tarifaDiaria;

    @Column(nullable = false)
    private int capacidad;

    protected Nave() {
    }

    public Nave(String id, String nombre, String clase, String licenciaRequerida, double tarifaDiaria, int capacidad) {
        this.id = id;
        this.nombre = nombre;
        this.clase = clase;
        this.licenciaRequerida = licenciaRequerida;
        this.tarifaDiaria = tarifaDiaria;
        this.capacidad = capacidad;
    }

    public String getId() { return id; }
    public String getNombre() { return nombre; }
    public String getClase() { return clase; }
    public String getLicenciaRequerida() { return licenciaRequerida; }
    public double getTarifaDiaria() { return tarifaDiaria; }
    public int getCapacidad() { return capacidad; }
}
