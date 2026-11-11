using NebulaPagos.Puertos;

namespace NebulaPagos.Api;

/// <summary>Endpoints HTTP de soporte (health y consulta para operaciones).</summary>
public static class Endpoints
{
    public static void MapearEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", Salud);
        app.MapGet("/api/pagos", ListarCobros);
        app.MapGet("/api/pagos/{reservaId}", ObtenerCobro);
    }

    public static IResult Salud() => Results.Ok(new { estado = "ok", servicio = "nebula-pagos" });

    public static async Task<IResult> ObtenerCobro(string reservaId, ICobroRepositorio repo, CancellationToken ct)
    {
        var cobro = await repo.ObtenerAsync(reservaId, ct);
        return cobro is null ? Results.NotFound(new { error = "Cobro no encontrado" }) : Results.Ok(cobro);
    }

    public static async Task<IResult> ListarCobros(ICobroRepositorio repo, CancellationToken ct, int limite = 50) =>
        Results.Ok(await repo.ListarAsync(limite, ct));
}
