using NebulaPagos.Dominio;
using NebulaPagos.Puertos;

namespace NebulaPagos.Tests;

/// <summary>Reloj fijo para resultados deterministas.</summary>
internal sealed class RelojFijo(DateTimeOffset ahora) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => ahora;
}

/// <summary>Simula nebula-reservas (Java) registrando las llamadas gRPC.</summary>
internal sealed class ReservasFalso : IReservasClient
{
    public Dictionary<string, ReservaInfo> Reservas { get; } = new();
    public List<(string ReservaId, string Estado, string? Tx)> Actualizaciones { get; } = new();

    public Task<ReservaInfo?> ObtenerAsync(string reservaId, CancellationToken ct = default) =>
        Task.FromResult(Reservas.TryGetValue(reservaId, out var r) ? r : null);

    public Task ActualizarEstadoPagoAsync(string reservaId, string estadoPago, string? transaccionId, CancellationToken ct = default)
    {
        Actualizaciones.Add((reservaId, estadoPago, transaccionId));
        return Task.CompletedTask;
    }
}

internal sealed class PublisherFalso : IEventoPublisher
{
    public List<(string Topico, string Clave, object Evento)> Publicados { get; } = new();

    public Task PublicarAsync(string topico, string clave, object evento, CancellationToken ct = default)
    {
        Publicados.Add((topico, clave, evento));
        return Task.CompletedTask;
    }
}
