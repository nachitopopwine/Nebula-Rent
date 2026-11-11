package cl.nebularent.reservas.dominio;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** Reserva de una nave por parte de un piloto. */
@Entity
@Table(name = "reservas", indexes = @Index(name = "idx_reservas_piloto", columnList = "piloto_id"))
public class Reserva {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "piloto_id", nullable = false, length = 36)
    private String pilotoId;

    @Column(name = "nave_id", nullable = false, length = 40)
    private String naveId;

    @Column(nullable = false, length = 60)
    private String destino;

    @Column(nullable = false)
    private int dias;

    @Column(name = "monto_total", nullable = false)
    private double montoTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoReserva estado;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 15)
    private EstadoPago estadoPago;

    @Column(name = "transaccion_id", length = 64)
    private String transaccionId;

    @Column(name = "creada_en", nullable = false)
    private Instant creadaEn;

    protected Reserva() {
    }

    public Reserva(String id, String pilotoId, String naveId, String destino, int dias,
                   double montoTotal, Instant creadaEn) {
        this.id = id;
        this.pilotoId = pilotoId;
        this.naveId = naveId;
        this.destino = destino;
        this.dias = dias;
        this.montoTotal = montoTotal;
        this.creadaEn = creadaEn;
        this.estado = EstadoReserva.CONFIRMADA;
        this.estadoPago = EstadoPago.PENDIENTE;
    }

    /**
     * Registra el resultado del pago. Un pago rechazado cancela la reserva.
     * Es idempotente: repetir el mismo estado no cambia nada.
     */
    public void registrarPago(EstadoPago nuevo, String transaccionId) {
        if (nuevo == estadoPago) {
            return;
        }
        if (estadoPago != EstadoPago.PENDIENTE) {
            throw new ReglaNegocioException(
                    "La reserva " + id + " ya tiene el pago en estado " + estadoPago);
        }
        if (nuevo == EstadoPago.PENDIENTE) {
            throw new ReglaNegocioException("No se puede volver un pago a PENDIENTE");
        }
        this.estadoPago = nuevo;
        this.transaccionId = transaccionId;
        if (nuevo == EstadoPago.RECHAZADO) {
            this.estado = EstadoReserva.CANCELADA;
        }
    }

    public String getId() { return id; }
    public String getPilotoId() { return pilotoId; }
    public String getNaveId() { return naveId; }
    public String getDestino() { return destino; }
    public int getDias() { return dias; }
    public double getMontoTotal() { return montoTotal; }
    public EstadoReserva getEstado() { return estado; }
    public EstadoPago getEstadoPago() { return estadoPago; }
    public String getTransaccionId() { return transaccionId; }
    public Instant getCreadaEn() { return creadaEn; }
}
