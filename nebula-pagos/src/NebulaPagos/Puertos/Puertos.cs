using NebulaPagos.Dominio;

namespace NebulaPagos.Puertos;

public interface ICobroRepositorio
{
    Task<Cobro?> ObtenerAsync(string reservaId, CancellationToken ct = default);
    Task GuardarAsync(Cobro cobro, CancellationToken ct = default);
    Task<IReadOnlyList<Cobro>> ListarAsync(int limite, CancellationToken ct = default);
}

/// <summary>Cliente gRPC hacia nebula-reservas (Java).</summary>
public interface IReservasClient
{
    Task<ReservaInfo?> ObtenerAsync(string reservaId, CancellationToken ct = default);
    Task ActualizarEstadoPagoAsync(string reservaId, string estadoPago, string? transaccionId, CancellationToken ct = default);
}

public interface IPasarelaPago
{
    Task<ResultadoPasarela> CobrarAsync(string reservaId, double monto, string tokenTarjeta, CancellationToken ct = default);
}

public interface IEventoPublisher
{
    Task PublicarAsync(string topico, string clave, object evento, CancellationToken ct = default);
}
