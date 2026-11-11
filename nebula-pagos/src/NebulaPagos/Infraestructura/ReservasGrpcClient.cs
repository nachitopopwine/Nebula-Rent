using System.Diagnostics.CodeAnalysis;
using Grpc.Core;
using NebulaPagos.Dominio;
using NebulaPagos.Puertos;
using NebulaRent.Reservas.V1;

namespace NebulaPagos.Infraestructura;

/// <summary>Cliente gRPC .NET → Java (nebula-reservas).</summary>
[ExcludeFromCodeCoverage(Justification = "Adaptador de red; el contrato se prueba en nebula-reservas")]
public sealed class ReservasGrpcClient : IReservasClient
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    private readonly ReservaService.ReservaServiceClient _cliente;

    public ReservasGrpcClient(ReservaService.ReservaServiceClient cliente)
    {
        _cliente = cliente;
    }

    public async Task<ReservaInfo?> ObtenerAsync(string reservaId, CancellationToken ct = default)
    {
        try
        {
            var r = await _cliente.ObtenerReservaAsync(new ObtenerReservaRequest { Id = reservaId },
                deadline: DateTime.UtcNow.Add(Timeout), cancellationToken: ct);
            return new ReservaInfo(r.Id, r.PilotoId, r.MontoTotal, r.EstadoPago);
        }
        catch (RpcException e) when (e.StatusCode is StatusCode.NotFound or StatusCode.InvalidArgument)
        {
            return null;
        }
    }

    public async Task ActualizarEstadoPagoAsync(string reservaId, string estadoPago, string? transaccionId,
        CancellationToken ct = default)
    {
        await _cliente.ActualizarEstadoPagoAsync(new ActualizarEstadoPagoRequest
        {
            ReservaId = reservaId,
            EstadoPago = estadoPago,
            TransaccionId = transaccionId ?? "",
        }, deadline: DateTime.UtcNow.Add(Timeout), cancellationToken: ct);
    }
}
