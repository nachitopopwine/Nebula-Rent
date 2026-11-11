namespace NebulaPagos.Dominio;

public enum EstadoCobro
{
    Pendiente,
    Aprobado,
    Rechazado,
}

public static class EstadoCobroExtensions
{
    /// <summary>Formato del contrato gRPC/Kafka: PENDIENTE, APROBADO, RECHAZADO.</summary>
    public static string AContrato(this EstadoCobro estado) => estado.ToString().ToUpperInvariant();
}

/// <summary>Cobro asociado a una reserva. El id es el de la reserva (1 cobro por reserva).</summary>
public sealed class Cobro
{
    public string ReservaId { get; set; } = "";
    public string PilotoId { get; set; } = "";
    public double Monto { get; set; }
    public EstadoCobro Estado { get; set; } = EstadoCobro.Pendiente;
    public string? TransaccionId { get; set; }
    public string? Motivo { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
    public DateTimeOffset? ProcesadoEn { get; set; }
}

// ---------- Eventos Kafka (JSON camelCase) ----------

/// <summary>Publicado por nebula-reservas (Java) en "reservas.creadas".</summary>
public sealed record ReservaCreadaEvento(
    string ReservaId, string PilotoId, string NaveId, double MontoTotal, DateTimeOffset CreadaEn);

/// <summary>Publicado por nebula-bff (Python) en "pagos.solicitados".</summary>
public sealed record SolicitudPagoEvento(
    string ReservaId, double Monto, string TokenTarjeta, DateTimeOffset? SolicitadoEn);

/// <summary>Publicado por este servicio en "pagos.procesados".</summary>
public sealed record PagoProcesadoEvento(
    string ReservaId, string Estado, string? TransaccionId, string? Motivo, DateTimeOffset ProcesadoEn);

/// <summary>Datos mínimos de una reserva obtenidos vía gRPC.</summary>
public sealed record ReservaInfo(string Id, string PilotoId, double MontoTotal, string EstadoPago);

/// <summary>Respuesta de la pasarela de pago.</summary>
public sealed record ResultadoPasarela(bool Aprobado, string? TransaccionId, string? Motivo);

public static class Topicos
{
    public const string ReservasCreadas = "reservas.creadas";
    public const string PagosSolicitados = "pagos.solicitados";
    public const string PagosProcesados = "pagos.procesados";
}
