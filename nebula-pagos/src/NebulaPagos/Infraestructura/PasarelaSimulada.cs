using NebulaPagos.Dominio;
using NebulaPagos.Puertos;

namespace NebulaPagos.Infraestructura;

/// <summary>
/// Pasarela de pagos ficticia "Banco Galáctico".
/// - Token vacío o que empieza con "tok_rechazo" → rechazado.
/// - Monto mayor a 500.000 créditos → rechazado por límite.
/// - En otro caso → aprobado.
/// </summary>
public sealed class PasarelaSimulada : IPasarelaPago
{
    public const double LimitePorTransaccion = 500_000;

    public Task<ResultadoPasarela> CobrarAsync(string reservaId, double monto, string tokenTarjeta, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(tokenTarjeta))
            return Task.FromResult(new ResultadoPasarela(false, null, "Token de tarjeta requerido"));
        if (tokenTarjeta.StartsWith("tok_rechazo", StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(new ResultadoPasarela(false, null, "Tarjeta rechazada por el Banco Galáctico"));
        if (monto <= 0)
            return Task.FromResult(new ResultadoPasarela(false, null, "Monto inválido"));
        if (monto > LimitePorTransaccion)
            return Task.FromResult(new ResultadoPasarela(false, null, "Monto excede el límite por transacción"));

        var tx = "TX-" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
        return Task.FromResult(new ResultadoPasarela(true, tx, null));
    }
}
