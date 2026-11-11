"""Pruebas del esquema GraphQL ejecutando operaciones reales contra dobles."""

import pytest

pytest.importorskip("strawberry")

from app.schema import schema  # noqa: E402
from app.servicios import Servicios  # noqa: E402
from tests.conftest import ClimaFalso, PagosFalso, PilotosFalso, ReservasFalso  # noqa: E402

pytestmark = pytest.mark.anyio


def contexto(**kwargs):
    svc = Servicios(
        pilotos=kwargs.get("pilotos", PilotosFalso()),
        reservas=kwargs.get("reservas", ReservasFalso()),
        clima=kwargs.get("clima", ClimaFalso()),
        pagos=kwargs.get("pagos", PagosFalso()),
    )
    return {"servicios": svc}


async def ejecutar(query, variables=None, **kwargs):
    return await schema.execute(query, variable_values=variables, context_value=contexto(**kwargs))


async def test_consulta_pilotos_y_naves():
    r = await ejecutar("{ pilotos { id nombre licencia horasVuelo } naves { id nombre tarifaDiaria } }")
    assert r.errors is None
    assert r.data["pilotos"][0] == {"id": "p1", "nombre": "Valentina Orbe", "licencia": "CLASE_A", "horasVuelo": 2400}
    assert len(r.data["naves"]) == 2


async def test_reserva_con_piloto_y_nave_anidados():
    r = await ejecutar('{ reserva(id: "r1") { id montoTotal estadoPago piloto { nombre } nave { nombre } } }')
    assert r.errors is None
    assert r.data["reserva"] == {
        "id": "r1", "montoTotal": 61740.0, "estadoPago": "PENDIENTE",
        "piloto": {"nombre": "Valentina Orbe"}, "nave": {"nombre": "Aurora Boreal"},
    }


async def test_consultas_que_no_encuentran_datos():
    r = await ejecutar('{ reserva(id: "x") { id } piloto(id: "x") { id } reservas(pilotoId: "nadie") { id } }')
    assert r.data == {"reserva": None, "piloto": None, "reservas": []}


async def test_clima_y_evaluacion_de_ruta():
    r = await ejecutar('{ climaEspacial(dias: 3) { nivelRiesgo llamaradas { clase } } evaluarRuta(destino: "Europa") { riesgo autorizado } }')
    assert r.errors is None
    assert r.data["climaEspacial"] == {"nivelRiesgo": "BAJO", "llamaradas": [{"clase": "M1.0"}]}
    assert r.data["evaluarRuta"] == {"riesgo": "BAJO", "autorizado": True}


async def test_mutacion_crear_piloto_y_error_de_validacion():
    m = "mutation($i: CrearPilotoInput!) { crearPiloto(input: $i) { id licencia } }"
    ok = await ejecutar(m, {"i": {"nombre": "Tomás Cometa", "licencia": "CLASE_B", "horasVuelo": 10}})
    assert ok.data["crearPiloto"] == {"id": "p-nuevo", "licencia": "CLASE_B"}

    malo = await ejecutar(m, {"i": {"nombre": "Tomás Cometa", "licencia": "CLASE_Z"}})
    assert "licencia inválida" in malo.errors[0].message


async def test_mutacion_crear_reserva():
    m = """mutation { crearReserva(input: {pilotoId: "p1", naveId: "NV-001", destino: "Marte", dias: 3}) {
             reserva { id destino } evaluacionRuta { riesgo } } }"""
    r = await ejecutar(m)
    assert r.errors is None
    assert r.data["crearReserva"] == {"reserva": {"id": "r-nueva", "destino": "Marte"}, "evaluacionRuta": {"riesgo": "BAJO"}}

    sin_clima = await ejecutar(m, clima=ClimaFalso(caido=True))
    assert sin_clima.data["crearReserva"]["evaluacionRuta"] is None


async def test_mutacion_pagar_reserva():
    pagos = PagosFalso()
    r = await ejecutar('mutation { pagarReserva(reservaId: "r1", tokenTarjeta: "tok_visa") { estado monto } }', pagos=pagos)
    assert r.errors is None
    assert r.data["pagarReserva"] == {"estado": "PENDIENTE", "monto": 61740.0}
    assert pagos.solicitudes == [("r1", 61740.0, "tok_visa")]
