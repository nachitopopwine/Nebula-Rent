using System.Collections.Concurrent;
using NebulaPagos.Dominio;
using NebulaPagos.Puertos;

namespace NebulaPagos.Infraestructura;

/// <summary>Repositorio en memoria (tests y modo dev sin MONGO_URL).</summary>
public sealed class CobroRepositorioMemoria : ICobroRepositorio
{
    private readonly ConcurrentDictionary<string, Cobro> _cobros = new();

    public Task<Cobro?> ObtenerAsync(string reservaId, CancellationToken ct = default) =>
        Task.FromResult(_cobros.TryGetValue(reservaId, out var c) ? c : null);

    public Task GuardarAsync(Cobro cobro, CancellationToken ct = default)
    {
        _cobros[cobro.ReservaId] = cobro;
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Cobro>> ListarAsync(int limite, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Cobro>>(_cobros.Values
            .OrderByDescending(c => c.CreadoEn)
            .Take(limite <= 0 ? 50 : limite)
            .ToList());
}
