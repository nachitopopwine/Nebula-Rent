using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NebulaPagos.Api;
using NebulaPagos.Dominio;
using NebulaPagos.Infraestructura;
using Xunit;

namespace NebulaPagos.Tests;

public class PasarelaSimuladaTests
{
    private readonly PasarelaSimulada _pasarela = new();

    [Theory]
    [InlineData("", 100, false)]
    [InlineData("tok_rechazo_123", 100, false)]
    [InlineData("TOK_RECHAZO", 100, false)]
    [InlineData("tok_visa", 0, false)]
    [InlineData("tok_visa", 500_001, false)]
    [InlineData("tok_visa", 500_000, true)]
    [InlineData("tok_master", 1200.5, true)]
    public async Task ReglasDeAprobacion(string token, double monto, bool aprobado)
    {
        var r = await _pasarela.CobrarAsync("r1", monto, token);

        Assert.Equal(aprobado, r.Aprobado);
        if (aprobado)
        {
            Assert.Matches("^TX-[0-9A-F]{12}$", r.TransaccionId);
            Assert.Null(r.Motivo);
        }
        else
        {
            Assert.Null(r.TransaccionId);
            Assert.False(string.IsNullOrWhiteSpace(r.Motivo));
        }
    }
}

public class CobroRepositorioMemoriaTests
{
    [Fact]
    public async Task GuardaObtieneYListaOrdenado()
    {
        var repo = new CobroRepositorioMemoria();
        var t0 = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        await repo.GuardarAsync(new Cobro { ReservaId = "a", CreadoEn = t0 });
        await repo.GuardarAsync(new Cobro { ReservaId = "b", CreadoEn = t0.AddHours(1) });

        Assert.Equal("a", (await repo.ObtenerAsync("a"))!.ReservaId);
        Assert.Null(await repo.ObtenerAsync("z"));

        var lista = await repo.ListarAsync(0);
        Assert.Equal(new[] { "b", "a" }, lista.Select(c => c.ReservaId));
        Assert.Single(await repo.ListarAsync(1));
    }

    [Fact]
    public void EstadoEnFormatoDeContrato()
    {
        Assert.Equal("PENDIENTE", EstadoCobro.Pendiente.AContrato());
        Assert.Equal("APROBADO", EstadoCobro.Aprobado.AContrato());
        Assert.Equal("RECHAZADO", EstadoCobro.Rechazado.AContrato());
    }
}

public class EnrutadorMensajesTests
{
    private readonly CobroRepositorioMemoria _repo = new();
    private readonly ReservasFalso _reservas = new();
    private readonly EnrutadorMensajes _enrutador;

    public EnrutadorMensajesTests()
    {
        var procesador = new ProcesadorPagos(_repo, _reservas, new PasarelaSimulada(), new PublisherFalso(),
            TimeProvider.System, NullLogger<ProcesadorPagos>.Instance);
        _enrutador = new EnrutadorMensajes(procesador, NullLogger<EnrutadorMensajes>.Instance);
    }

    [Fact]
    public async Task ProcesaEventoDeJavaYSolicitudDelBff()
    {
        // Formato que publica nebula-reservas (Java)
        const string reserva = """{"reservaId":"r1","pilotoId":"p1","naveId":"NV-001","montoTotal":2400.0,"creadaEn":"2026-11-11T12:00:00Z"}""";
        // Formato que publica nebula-bff (Python)
        const string solicitud = """{"reservaId":"r1","monto":2400.0,"tokenTarjeta":"tok_visa","solicitadoEn":"2026-11-11T12:05:00+00:00"}""";

        Assert.True(await _enrutador.ManejarAsync(Topicos.ReservasCreadas, reserva));
        Assert.True(await _enrutador.ManejarAsync(Topicos.PagosSolicitados, solicitud));

        Assert.Equal(EstadoCobro.Aprobado, (await _repo.ObtenerAsync("r1"))!.Estado);
        Assert.Equal("APROBADO", _reservas.Actualizaciones.Single().Estado);
    }

    [Theory]
    [InlineData("reservas.creadas", "")]
    [InlineData("reservas.creadas", "{no es json")]
    [InlineData("reservas.creadas", """{"pilotoId":"p1"}""")]
    [InlineData("pagos.solicitados", """{"monto":1}""")]
    [InlineData("otro.topico", """{"reservaId":"r1"}""")]
    public async Task DescartaMensajesInvalidos(string topico, string json)
    {
        Assert.False(await _enrutador.ManejarAsync(topico, json));
    }
}

public class EndpointsTests
{
    private static int Codigo(IResult r) => ((IStatusCodeHttpResult)r).StatusCode ?? 0;

    [Fact]
    public void SaludResponde200()
    {
        Assert.Equal(200, Codigo(Endpoints.Salud()));
    }

    [Fact]
    public async Task ObtieneYListaCobros()
    {
        var repo = new CobroRepositorioMemoria();
        await repo.GuardarAsync(new Cobro { ReservaId = "r1", Monto = 10 });

        var ok = await Endpoints.ObtenerCobro("r1", repo, CancellationToken.None);
        Assert.Equal(200, Codigo(ok));
        Assert.IsType<Cobro>(((IValueHttpResult)ok).Value);

        Assert.Equal(404, Codigo(await Endpoints.ObtenerCobro("x", repo, CancellationToken.None)));
        Assert.Equal(200, Codigo(await Endpoints.ListarCobros(repo, CancellationToken.None)));
    }
}
