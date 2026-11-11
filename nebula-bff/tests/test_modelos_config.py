import json
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.clients.pagos import TOPICO_PAGOS_SOLICITADOS, PagosKafka, construir_evento
from app.config import Config
from app.errores import ErrorServicioNoDisponible
from app.modelos import (
    clima_desde_json,
    evaluacion_desde_json,
    nave_desde_proto,
    piloto_desde_proto,
    reserva_desde_proto,
)
from app.servicios import Servicios
from tests.conftest import ClimaFalso, PilotosFalso, ReservasFalso


def test_config_por_defecto_y_desde_entorno():
    assert Config.desde_entorno({}) == Config()
    cfg = Config.desde_entorno({
        "PILOTOS_GRPC_ADDR": "pilotos:50051",
        "RESERVAS_GRPC_ADDR": "reservas:9090",
        "CLIMA_MCP_URL": "http://clima-mcp:3000/",
        "KAFKA_BROKERS": "kafka:9092",
        "CORS_ORIGINS": "http://a.cl, http://b.cl,",
    })
    assert cfg.pilotos_addr == "pilotos:50051"
    assert cfg.clima_url == "http://clima-mcp:3000"
    assert cfg.cors_origins == ("http://a.cl", "http://b.cl")


def test_conversores_desde_proto():
    p = piloto_desde_proto(SimpleNamespace(id="p1", nombre="N", licencia="CLASE_B", horas_vuelo=5, activo=1, creado_en="t"))
    assert p.horas_vuelo == 5 and p.activo is True

    n = nave_desde_proto(SimpleNamespace(id="NV", nombre="X", clase="LUJO", licencia_requerida="CLASE_A", tarifa_diaria=10, capacidad=3))
    assert n.tarifa_diaria == 10.0

    r = reserva_desde_proto(SimpleNamespace(id="r", piloto_id="p", nave_id="n", destino="Luna", dias=2,
                                            monto_total=5, estado="CONFIRMADA", estado_pago="PENDIENTE", creada_en="t"))
    assert r.monto_total == 5.0 and r.dias == 2


def test_conversores_desde_json():
    c = clima_desde_json({
        "desde": "2026-11-04", "hasta": "2026-11-11", "totalLlamaradas": 1, "mayorClase": "X1.0",
        "puntaje": 10, "nivelRiesgo": "ALTO", "origen": "CACHE",
        "llamaradas": [{"id": "a", "clase": "X1.0", "inicio": "t", "pico": None, "region": "13900"}],
    })
    assert c.nivel_riesgo == "ALTO" and c.llamaradas[0].region == "13900"

    vacio = clima_desde_json({"desde": "a", "hasta": "b"})
    assert vacio.llamaradas == [] and vacio.nivel_riesgo == "DESCONOCIDO"

    e = evaluacion_desde_json({"destino": "Marte", "diasViaje": 7, "puntaje": 3, "riesgo": "MODERADO",
                               "recomendacion": "ok", "autorizado": False, "origen": "NASA_DONKI"})
    assert e.autorizado is False and e.dias_viaje == 7


class ProductorFalso:
    def __init__(self, falla=False):
        self.enviados, self.falla, self.detenido = [], falla, False

    async def send_and_wait(self, topico, key, value):
        if self.falla:
            raise RuntimeError("broker caído")
        self.enviados.append((topico, key, value))

    async def stop(self):
        self.detenido = True


AHORA = datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc)


def test_evento_de_pago_tiene_el_formato_que_espera_dotnet():
    assert construir_evento("r1", 10.5, "tok_x", AHORA) == {
        "reservaId": "r1", "monto": 10.5, "tokenTarjeta": "tok_x", "solicitadoEn": "2026-11-11T12:00:00+00:00",
    }


@pytest.mark.anyio
async def test_pagos_kafka_publica_y_cierra():
    productor = ProductorFalso()
    pagos = PagosKafka(productor, reloj=lambda: AHORA)
    await pagos.solicitar("r1", 100.0, "tok_visa")
    topico, clave, valor = productor.enviados[0]
    assert topico == TOPICO_PAGOS_SOLICITADOS
    assert clave == b"r1"
    assert json.loads(valor)["monto"] == 100.0
    await pagos.cerrar()
    assert productor.detenido


@pytest.mark.anyio
async def test_pagos_kafka_traduce_errores_del_broker():
    with pytest.raises(ErrorServicioNoDisponible):
        await PagosKafka(ProductorFalso(falla=True)).solicitar("r1", 1, "tok_x")


@pytest.mark.anyio
async def test_servicios_cierra_todos_los_clientes_aunque_alguno_falle():
    cerrados = []

    class Cliente:
        def __init__(self, nombre, falla=False):
            self.nombre, self.falla = nombre, falla

        async def cerrar(self):
            if self.falla:
                raise RuntimeError("x")
            cerrados.append(self.nombre)

    s = Servicios(pilotos=Cliente("p", falla=True), reservas=Cliente("r"), clima=Cliente("c"), pagos=None)
    await s.cerrar()
    assert cerrados == ["r", "c"]

    s2 = Servicios(pilotos=PilotosFalso(), reservas=ReservasFalso(), clima=ClimaFalso(), pagos=None)
    assert s2.orquestador is not None
