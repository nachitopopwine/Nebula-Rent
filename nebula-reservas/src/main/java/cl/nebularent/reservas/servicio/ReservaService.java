package cl.nebularent.reservas.servicio;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import cl.nebularent.reservas.cliente.PilotosClient;
import cl.nebularent.reservas.cliente.PilotosClient.PilotoInfo;
import cl.nebularent.reservas.dominio.EstadoPago;
import cl.nebularent.reservas.dominio.Nave;
import cl.nebularent.reservas.dominio.RecursoNoEncontradoException;
import cl.nebularent.reservas.dominio.ReglaNegocioException;
import cl.nebularent.reservas.dominio.ReglasDeVuelo;
import cl.nebularent.reservas.dominio.Reserva;
import cl.nebularent.reservas.eventos.EventosPublisher;
import cl.nebularent.reservas.repositorio.NaveRepository;
import cl.nebularent.reservas.repositorio.ReservaRepository;

/** Casos de uso de reservas. */
@Service
@Transactional
public class ReservaService {

    private final NaveRepository naves;
    private final ReservaRepository reservas;
    private final PilotosClient pilotos;
    private final EventosPublisher eventos;
    private final Clock reloj;

    public ReservaService(NaveRepository naves, ReservaRepository reservas, PilotosClient pilotos,
                          EventosPublisher eventos, Clock reloj) {
        this.naves = naves;
        this.reservas = reservas;
        this.pilotos = pilotos;
        this.eventos = eventos;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public List<Nave> listarNaves() {
        return naves.findAllByOrderByTarifaDiariaAsc();
    }

    public Reserva crear(String pilotoId, String naveId, String destino, int dias) {
        requerido(pilotoId, "pilotoId");
        requerido(naveId, "naveId");
        requerido(destino, "destino");
        String destinoLimpio = destino.trim();
        if (destinoLimpio.length() < 2 || destinoLimpio.length() > 60) {
            throw new ReglaNegocioException("El destino debe tener entre 2 y 60 caracteres");
        }
        ReglasDeVuelo.validarDias(dias);

        Nave nave = naves.findById(naveId)
                .orElseThrow(() -> new RecursoNoEncontradoException("La nave " + naveId + " no existe"));
        PilotoInfo piloto = pilotos.obtener(pilotoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("El piloto " + pilotoId + " no existe"));

        if (!piloto.activo()) {
            throw new ReglaNegocioException("El piloto " + piloto.nombre() + " no está activo");
        }
        if (!ReglasDeVuelo.puedePilotear(piloto.licencia(), nave.getLicenciaRequerida())) {
            throw new ReglaNegocioException("La licencia " + piloto.licencia() + " no permite pilotear "
                    + nave.getNombre() + " (requiere " + nave.getLicenciaRequerida() + ")");
        }

        double monto = ReglasDeVuelo.calcularMonto(nave.getTarifaDiaria(), dias);
        Reserva reserva = new Reserva(UUID.randomUUID().toString(), pilotoId, naveId, destinoLimpio,
                dias, monto, reloj.instant());
        Reserva guardada = reservas.save(reserva);
        eventos.reservaCreada(guardada);
        return guardada;
    }

    @Transactional(readOnly = true)
    public Reserva obtener(String id) {
        requerido(id, "id");
        return reservas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("La reserva " + id + " no existe"));
    }

    @Transactional(readOnly = true)
    public List<Reserva> listar(String pilotoId) {
        if (pilotoId == null || pilotoId.isBlank()) {
            return reservas.findAllByOrderByCreadaEnDesc();
        }
        return reservas.findByPilotoIdOrderByCreadaEnDesc(pilotoId);
    }

    /** Invocado por nebula-pagos (.NET) vía gRPC tras procesar un cobro. */
    public Reserva actualizarEstadoPago(String reservaId, String estadoPago, String transaccionId) {
        EstadoPago estado = EstadoPago.desde(estadoPago);
        Reserva reserva = obtener(reservaId);
        reserva.registrarPago(estado, transaccionId);
        return reservas.save(reserva);
    }

    private static void requerido(String valor, String campo) {
        if (valor == null || valor.isBlank()) {
            throw new ReglaNegocioException("El campo " + campo + " es obligatorio");
        }
    }
}
