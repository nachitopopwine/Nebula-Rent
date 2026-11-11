using Microsoft.Extensions.Logging.Abstractions;
using NebulaPagos.Dominio;
using NebulaPagos.Infraestructura;
using Xunit;

namespace NebulaPagos.Tests;

public class ProcesadorPagosTests
{
    private static readonly DateTimeOffset Ahora = new(2026, 11, 11, 12, 0, 0, TimeSpan.Zero);

    private readonly CobroRepositorioMemoria _repo = new();
    private readonly ReservasFalso _reservas = new();
    private readonly PublisherFalso _publisher = new();
    private readonly ProcesadorPagos _procesador;

    public ProcesadorPagosTests()
    {
        _procesador = new ProcesadorPagos(_repo, _reservas, new PasarelaSimulada(), _publisher,
            new RelojFijo(Ahora), NullLogger<ProcesadorPagos>.Instance);
    }

    private Task<Cobro> RegistrarAsync(string id = "r1", double monto = 3600) =>
        _procesador.RegistrarReservaAsync(new ReservaCreadaEvento(id, "p1", "NV-001", monto, Ahora));

    [Fact]
    public async Task RegistraCobroPendiente()
    {
        var cobro = await RegistrarAsync();

        Assert.Equal(EstadoCobro.Pendiente, cobro.Estado);
        Assert.Equal(3600, cobro.Monto);
        Assert.Equal(Ahora, cobro.CreadoEn);
        Assert.NotNull(await _repo.ObtenerAsync("r1"));
    }

    [Fact]
    public async Task RegistroEsIdempotente()
    {
        var primero = await RegistrarAsync();
        var segundo = await RegistrarAsync(monto: 9999);

        Assert.Same(primero, segundo);
        Assert.Equal(3600, segundo.Monto);
    }

    [Fact]
    public async Task ApruebaPagoNotificaAReservasYPublicaEvento()
    {
        await RegistrarAsync();

        var cobro = await _procesador.ProcesarSolicitudAsync(new SolicitudPagoEvento("r1", 3600, "tok_visa_4242", Ahora));

        Assert.NotNull(cobro);
        Assert.Equal(EstadoCobro.Aprobado, cobro!.Estado);
        Assert.StartsWith("TX-", cobro.TransaccionId);
        Assert.Equal(Ahora, cobro.ProcesadoEn);

        var (reservaId, estado, tx) = Assert.Single(_reservas.Actualizaciones);
        Assert.Equal(("r1", "APROBADO", cobro.TransaccionId), (reservaId, estado, tx));

        var publicado = Assert.Single(_publisher.Publicados);
        Assert.Equal(Topicos.PagosProcesados, publicado.Topico);
        var evento = Assert.IsType<PagoProcesadoEvento>(publicado.Evento);
        Assert.Equal("APROBADO", evento.Estado);
    }

    [Fact]
    public async Task RechazaTarjetaInvalida()
    {
        await RegistrarAsync();
        var cobro = await _procesador.ProcesarSolicitudAsync(new SolicitudPagoEvento("r1", 3600, "tok_rechazo_fondos", null));

        Assert.Equal(EstadoCobro.Rechazado, cobro!.Estado);
        Assert.Contains("rechazada", cobro.Motivo);
        Assert.Equal("RECHAZADO", _reservas.Actualizaciones.Single().Estado);
    }

    [Fact]
    public async Task RechazaMontoDistinto()
    {
        await RegistrarAsync();
        var cobro = await _procesador.ProcesarSolicitudAsync(new SolicitudPagoEvento("r1", 10, "tok_visa", null));

        Assert.Equal(EstadoCobro.Rechazado, cobro!.Estado);
        Assert.Contains("no coincide", cobro.Motivo);
    }

    [Fact]
    public async Task SolicitudRepetidaNoCobraDosVeces()
    {
        await RegistrarAsync();
        var solicitud = new SolicitudPagoEvento("r1", 3600, "tok_visa", null);
        await _procesador.ProcesarSolicitudAsync(solicitud);
        await _procesador.ProcesarSolicitudAsync(solicitud);

        Assert.Single(_reservas.Actualizaciones);
        Assert.Single(_publisher.Publicados);
    }

    [Fact]
    public async Task SiElEventoDeReservaNoLlegoConsultaPorGrpc()
    {
        _reservas.Reservas["r2"] = new ReservaInfo("r2", "p2", 5000, "PENDIENTE");

        var cobro = await _procesador.ProcesarSolicitudAsync(new SolicitudPagoEvento("r2", 5000, "tok_visa", null));

        Assert.Equal(EstadoCobro.Aprobado, cobro!.Estado);
        Assert.Equal("p2", cobro.PilotoId);
    }

    [Fact]
    public async Task ReservaInexistenteDevuelveNull()
    {
        var cobro = await _procesador.ProcesarSolicitudAsync(new SolicitudPagoEvento("nada", 1, "tok", null));

        Assert.Null(cobro);
        Assert.Empty(_reservas.Actualizaciones);
    }
}
