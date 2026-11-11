"""Pruebas del servidor HTTP (FastAPI) y del cliente REST de clima."""

import pytest

pytest.importorskip("fastapi")
httpx = pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

from app.clients.clima import ClimaClient  # noqa: E402
from app.config import Config  # noqa: E402
from app.errores import ErrorServicioNoDisponible, ErrorValidacion  # noqa: E402
from app.main import crear_app  # noqa: E402
from app.servicios import Servicios  # noqa: E402
from tests.conftest import ClimaFalso, PagosFalso, PilotosFalso, ReservasFalso  # noqa: E402


def test_health_y_endpoint_graphql():
    svc = Servicios(PilotosFalso(), ReservasFalso(), ClimaFalso(), PagosFalso())
    with TestClient(crear_app(svc, Config())) as cliente:
        assert cliente.get("/health").json() == {"estado": "ok", "servicio": "nebula-bff"}
        r = cliente.post("/graphql", json={"query": "{ naves { id } }"})
        assert r.status_code == 200
        assert r.json()["data"]["naves"][0]["id"] == "NV-001"


def cliente_clima(handler) -> ClimaClient:
    return ClimaClient(httpx.AsyncClient(base_url="http://clima", transport=httpx.MockTransport(handler)))


@pytest.mark.anyio
async def test_cliente_clima_consume_la_api_rest():
    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.path == "/api/v1/clima":
            assert req.url.params["dias"] == "5"
            return httpx.Response(200, json={"desde": "a", "hasta": "b", "nivelRiesgo": "BAJO", "llamaradas": []})
        assert req.url.params["destino"] == "Titán"
        return httpx.Response(200, json={"destino": "Titán", "diasViaje": 25, "riesgo": "ALTO", "autorizado": True})

    c = cliente_clima(handler)
    assert (await c.clima_espacial(5)).nivel_riesgo == "BAJO"
    assert (await c.evaluar_ruta("Titán")).riesgo == "ALTO"
    await c.cerrar()


@pytest.mark.anyio
async def test_cliente_clima_traduce_errores():
    c400 = cliente_clima(lambda req: httpx.Response(400, json={"error": "destino obligatorio"}))
    with pytest.raises(ErrorValidacion, match="destino obligatorio"):
        await c400.evaluar_ruta("")

    c503 = cliente_clima(lambda req: httpx.Response(503))
    with pytest.raises(ErrorServicioNoDisponible, match="503"):
        await c503.clima_espacial()

    def caido(req):
        raise httpx.ConnectError("sin conexión")

    with pytest.raises(ErrorServicioNoDisponible, match="no está disponible"):
        await cliente_clima(caido).clima_espacial()
