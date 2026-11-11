using System.Text.Json;

namespace NebulaPagos.Dominio;

/// <summary>Deserializa los mensajes Kafka y los dirige al caso de uso correcto.</summary>
public sealed class EnrutadorMensajes
{
    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ProcesadorPagos _procesador;
    private readonly ILogger<EnrutadorMensajes> _log;

    public EnrutadorMensajes(ProcesadorPagos procesador, ILogger<EnrutadorMensajes> log)
    {
        _procesador = procesador;
        _log = log;
    }

    /// <returns>true si el mensaje se procesó; false si se descartó por inválido o desconocido.</returns>
    public async Task<bool> ManejarAsync(string topico, string? json, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            _log.LogWarning("Mensaje vacío en {Topico}", topico);
            return false;
        }

        try
        {
            switch (topico)
            {
                case Topicos.ReservasCreadas:
                    var reserva = JsonSerializer.Deserialize<ReservaCreadaEvento>(json, Json);
                    if (reserva is null || string.IsNullOrWhiteSpace(reserva.ReservaId)) return false;
                    await _procesador.RegistrarReservaAsync(reserva, ct);
                    return true;

                case Topicos.PagosSolicitados:
                    var solicitud = JsonSerializer.Deserialize<SolicitudPagoEvento>(json, Json);
                    if (solicitud is null || string.IsNullOrWhiteSpace(solicitud.ReservaId)) return false;
                    await _procesador.ProcesarSolicitudAsync(solicitud, ct);
                    return true;

                default:
                    _log.LogWarning("Tópico no soportado: {Topico}", topico);
                    return false;
            }
        }
        catch (JsonException ex)
        {
            _log.LogError(ex, "JSON inválido en {Topico}", topico);
            return false;
        }
    }
}
