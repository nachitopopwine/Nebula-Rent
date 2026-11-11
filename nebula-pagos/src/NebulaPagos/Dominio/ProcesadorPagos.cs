using NebulaPagos.Puertos;

namespace NebulaPagos.Dominio;

/// <summary>
/// Orquesta el ciclo de vida del cobro:
/// 1) "reservas.creadas" (Kafka, desde Java) → registra un cobro PENDIENTE.
/// 2) "pagos.solicitados" (Kafka, desde el BFF) → cobra en la pasarela,
///    informa a Reservas vía gRPC y publica "pagos.procesados".
/// </summary>
public sealed class ProcesadorPagos
{
    private const double ToleranciaMonto = 0.01;

    private readonly ICobroRepositorio _repo;
    private readonly IReservasClient _reservas;
    private readonly IPasarelaPago _pasarela;
    private readonly IEventoPublisher _publisher;
    private readonly TimeProvider _reloj;
    private readonly ILogger<ProcesadorPagos> _log;

    public ProcesadorPagos(ICobroRepositorio repo, IReservasClient reservas, IPasarelaPago pasarela,
        IEventoPublisher publisher, TimeProvider reloj, ILogger<ProcesadorPagos> log)
    {
        _repo = repo;
        _reservas = reservas;
        _pasarela = pasarela;
        _publisher = publisher;
        _reloj = reloj;
        _log = log;
    }

    public async Task<Cobro> RegistrarReservaAsync(ReservaCreadaEvento evento, CancellationToken ct = default)
    {
        var existente = await _repo.ObtenerAsync(evento.ReservaId, ct);
        if (existente is not null)
        {
            return existente; // idempotente: Kafka puede reentregar mensajes
        }

        var cobro = new Cobro
        {
            ReservaId = evento.ReservaId,
            PilotoId = evento.PilotoId,
            Monto = evento.MontoTotal,
            Estado = EstadoCobro.Pendiente,
            CreadoEn = _reloj.GetUtcNow(),
        };
        await _repo.GuardarAsync(cobro, ct);
        _log.LogInformation("Cobro pendiente registrado para la reserva {ReservaId} por {Monto}", cobro.ReservaId, cobro.Monto);
        return cobro;
    }

    public async Task<Cobro?> ProcesarSolicitudAsync(SolicitudPagoEvento solicitud, CancellationToken ct = default)
    {
        var cobro = await _repo.ObtenerAsync(solicitud.ReservaId, ct)
                    ?? await CrearDesdeReservasAsync(solicitud.ReservaId, ct);
        if (cobro is null)
        {
            _log.LogWarning("Solicitud de pago para reserva inexistente {ReservaId}", solicitud.ReservaId);
            return null;
        }

        if (cobro.Estado != EstadoCobro.Pendiente)
        {
            return cobro; // ya procesado: idempotente
        }

        ResultadoPasarela resultado;
        if (Math.Abs(solicitud.Monto - cobro.Monto) > ToleranciaMonto)
        {
            resultado = new ResultadoPasarela(false, null,
                $"El monto {solicitud.Monto:F2} no coincide con el de la reserva {cobro.Monto:F2}");
        }
        else
        {
            resultado = await _pasarela.CobrarAsync(cobro.ReservaId, cobro.Monto, solicitud.TokenTarjeta, ct);
        }

        cobro.Estado = resultado.Aprobado ? EstadoCobro.Aprobado : EstadoCobro.Rechazado;
        cobro.TransaccionId = resultado.TransaccionId;
        cobro.Motivo = resultado.Motivo;
        cobro.ProcesadoEn = _reloj.GetUtcNow();
        await _repo.GuardarAsync(cobro, ct);

        await _reservas.ActualizarEstadoPagoAsync(cobro.ReservaId, cobro.Estado.AContrato(), cobro.TransaccionId, ct);
        await _publisher.PublicarAsync(Topicos.PagosProcesados, cobro.ReservaId,
            new PagoProcesadoEvento(cobro.ReservaId, cobro.Estado.AContrato(), cobro.TransaccionId, cobro.Motivo,
                cobro.ProcesadoEn.Value), ct);

        _log.LogInformation("Pago {Estado} para la reserva {ReservaId}", cobro.Estado, cobro.ReservaId);
        return cobro;
    }

    /// <summary>Si el evento de reserva aún no llegó, se consulta a Reservas por gRPC.</summary>
    private async Task<Cobro?> CrearDesdeReservasAsync(string reservaId, CancellationToken ct)
    {
        var reserva = await _reservas.ObtenerAsync(reservaId, ct);
        if (reserva is null)
        {
            return null;
        }
        return await RegistrarReservaAsync(
            new ReservaCreadaEvento(reserva.Id, reserva.PilotoId, "", reserva.MontoTotal, _reloj.GetUtcNow()), ct);
    }
}
