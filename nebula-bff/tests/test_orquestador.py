import pytest

from app.errores import ErrorNoEncontrado, ErrorServicioNoDisponible, ErrorValidacion
from app.orquestador import Orquestador
from tests.conftest import ClimaFalso, PagosFalso, ReservasFalso, reserva

pytestmark = pytest.mark.anyio


async def test_crea_reserva_con_evaluacion_de_clima():
    reservas = ReservasFalso()
    o = Orquestador(reservas, ClimaFalso(riesgo="MODERADO"), PagosFalso())

    r, evaluacion = await o.crear_reserva("p1", "NV-001", "Marte", 3)

    assert r.id == "r-nueva"
    assert evaluacion.riesgo == "MODERADO"
    assert reservas.creadas == [("p1", "NV-001", "Marte", 3)]


async def test_bloquea_reserva_con_tormenta_extrema():
    reservas = ReservasFalso()
    o = Orquestador(reservas, ClimaFalso(riesgo="EXTREMO", autorizado=False), PagosFalso())

    with pytest.raises(ErrorValidacion, match="suspendidos"):
        await o.crear_reserva("p1", "NV-001", "Europa", 3)
    assert reservas.creadas == []


async def test_reserva_igual_si_clima_no_responde():
    o = Orquestador(ReservasFalso(), ClimaFalso(caido=True), PagosFalso())
    r, evaluacion = await o.crear_reserva("p1", "NV-001", "Luna", 1)
    assert r.id == "r-nueva"
    assert evaluacion is None


async def test_pagar_publica_solicitud():
    pagos = PagosFalso()
    o = Orquestador(ReservasFalso(), ClimaFalso(), pagos)

    s = await o.pagar_reserva("r1", "  tok_visa_4242 ")

    assert s.estado == "PENDIENTE"
    assert s.monto == 61740.0
    assert pagos.solicitudes == [("r1", 61740.0, "tok_visa_4242")]


@pytest.mark.parametrize("token", ["", "visa", "tok_", "tok_con espacio", None])
async def test_pagar_rechaza_tokens_invalidos(token):
    o = Orquestador(ReservasFalso(), ClimaFalso(), PagosFalso())
    with pytest.raises(ErrorValidacion, match="Token"):
        await o.pagar_reserva("r1", token)


async def test_pagar_valida_estado_de_la_reserva():
    reservas = ReservasFalso()
    reservas.reservas["pagada"] = reserva("pagada", estado_pago="APROBADO")
    reservas.reservas["cancelada"] = reserva("cancelada", estado="CANCELADA", estado_pago="RECHAZADO")
    o = Orquestador(reservas, ClimaFalso(), PagosFalso())

    with pytest.raises(ErrorNoEncontrado):
        await o.pagar_reserva("nada", "tok_visa")
    with pytest.raises(ErrorValidacion, match="APROBADO"):
        await o.pagar_reserva("pagada", "tok_visa")
    with pytest.raises(ErrorValidacion, match="cancelada"):
        await o.pagar_reserva("cancelada", "tok_visa")


async def test_pagar_sin_kafka():
    o = Orquestador(ReservasFalso(), ClimaFalso(), None)
    with pytest.raises(ErrorServicioNoDisponible):
        await o.pagar_reserva("r1", "tok_visa")
