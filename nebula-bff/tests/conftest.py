"""Dobles de prueba de los microservicios que consume el BFF."""

from __future__ import annotations

import pytest

from app.errores import ErrorServicioNoDisponible, ErrorValidacion
from app.modelos import ClimaEspacial, EvaluacionRuta, Llamarada, Nave, Piloto, Reserva


@pytest.fixture
def anyio_backend():
    return "asyncio"


def piloto(id_="p1", licencia="CLASE_A") -> Piloto:
    return Piloto(id_, "Valentina Orbe", licencia, 2400, True, "2026-11-11T12:00:00Z")


def reserva(id_="r1", estado="CONFIRMADA", estado_pago="PENDIENTE") -> Reserva:
    return Reserva(id_, "p1", "NV-005", "Europa", 7, 61740.0, estado, estado_pago, "2026-11-11T12:00:00Z")


NAVES = [
    Nave("NV-001", "Colibrí Estelar", "EXPLORACION", "CLASE_C", 1200.0, 2),
    Nave("NV-005", "Aurora Boreal", "LUJO", "CLASE_A", 9800.0, 10),
]


class PilotosFalso:
    def __init__(self):
        self.pilotos = {"p1": piloto()}

    async def listar(self, limite=50):
        return list(self.pilotos.values())[:limite]

    async def obtener(self, piloto_id):
        return self.pilotos.get(piloto_id)

    async def crear(self, nombre, licencia, horas_vuelo):
        if licencia not in ("CLASE_A", "CLASE_B", "CLASE_C"):
            raise ErrorValidacion("licencia inválida: use CLASE_A, CLASE_B o CLASE_C")
        p = Piloto("p-nuevo", nombre, licencia, horas_vuelo, True, "2026-11-11T12:00:00Z")
        self.pilotos[p.id] = p
        return p


class ReservasFalso:
    def __init__(self):
        self.reservas = {"r1": reserva()}
        self.creadas: list[tuple] = []

    async def listar_naves(self):
        return NAVES

    async def listar(self, piloto_id=None):
        return [r for r in self.reservas.values() if not piloto_id or r.piloto_id == piloto_id]

    async def obtener(self, reserva_id):
        return self.reservas.get(reserva_id)

    async def crear(self, piloto_id, nave_id, destino, dias):
        self.creadas.append((piloto_id, nave_id, destino, dias))
        r = Reserva("r-nueva", piloto_id, nave_id, destino, dias, 2400.0, "CONFIRMADA", "PENDIENTE", "2026-11-11T12:00:00Z")
        self.reservas[r.id] = r
        return r


class ClimaFalso:
    def __init__(self, riesgo="BAJO", autorizado=True, caido=False):
        self.riesgo, self.autorizado, self.caido = riesgo, autorizado, caido

    async def clima_espacial(self, dias=7):
        return ClimaEspacial("2026-11-04", "2026-11-11", 1, "M1.0", 1.0, "BAJO", "NASA_DONKI",
                             [Llamarada("f1", "M1.0", "2026-11-10T00:00Z")])

    async def evaluar_ruta(self, destino):
        if self.caido:
            raise ErrorServicioNoDisponible("El servicio de clima no está disponible")
        return EvaluacionRuta(destino, 18, 1.4, self.riesgo, "Recomendación de prueba", self.autorizado, "NASA_DONKI")


class PagosFalso:
    def __init__(self):
        self.solicitudes: list[tuple] = []

    async def solicitar(self, reserva_id, monto, token_tarjeta):
        self.solicitudes.append((reserva_id, monto, token_tarjeta))
