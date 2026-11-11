"""Orquestación del BFF: combina varios microservicios en una sola operación.

No depende de gRPC, Kafka ni HTTP: recibe los clientes por constructor (puertos),
lo que permite probarlo con dobles en memoria.
"""

from __future__ import annotations

import logging
import re
from typing import Protocol

from app.errores import (
    ErrorBFF,
    ErrorNoEncontrado,
    ErrorServicioNoDisponible,
    ErrorValidacion,
)
from app.modelos import EvaluacionRuta, Reserva, SolicitudPago

log = logging.getLogger(__name__)

PATRON_TOKEN = re.compile(r"^tok_[A-Za-z0-9_]{3,60}$")


class PuertoReservas(Protocol):
    async def obtener(self, reserva_id: str) -> Reserva | None: ...

    async def crear(self, piloto_id: str, nave_id: str, destino: str, dias: int) -> Reserva: ...


class PuertoClima(Protocol):
    async def evaluar_ruta(self, destino: str) -> EvaluacionRuta: ...


class PuertoPagos(Protocol):
    async def solicitar(self, reserva_id: str, monto: float, token_tarjeta: str) -> None: ...


class Orquestador:
    def __init__(self, reservas: PuertoReservas, clima: PuertoClima, pagos: PuertoPagos | None):
        self._reservas = reservas
        self._clima = clima
        self._pagos = pagos

    async def crear_reserva(
        self, piloto_id: str, nave_id: str, destino: str, dias: int
    ) -> tuple[Reserva, EvaluacionRuta | None]:
        """Consulta el clima espacial (MCP/REST) antes de reservar (gRPC).

        Si el clima no está disponible se reserva igual (degradación elegante),
        pero si el riesgo es EXTREMO se bloquea la reserva.
        """
        evaluacion: EvaluacionRuta | None
        try:
            evaluacion = await self._clima.evaluar_ruta(destino)
        except ErrorBFF as e:
            log.warning("Clima no disponible, se reserva sin evaluación: %s", e)
            evaluacion = None

        if evaluacion is not None and not evaluacion.autorizado:
            raise ErrorValidacion(
                f"Vuelos a {evaluacion.destino} suspendidos (riesgo {evaluacion.riesgo}): "
                f"{evaluacion.recomendacion}"
            )

        reserva = await self._reservas.crear(piloto_id, nave_id, destino, dias)
        return reserva, evaluacion

    async def pagar_reserva(self, reserva_id: str, token_tarjeta: str) -> SolicitudPago:
        """Valida la reserva (gRPC) y publica la solicitud de pago (Kafka → .NET)."""
        token = (token_tarjeta or "").strip()
        if not PATRON_TOKEN.match(token):
            raise ErrorValidacion("Token de tarjeta inválido (formato esperado: tok_xxx)")

        reserva = await self._reservas.obtener(reserva_id)
        if reserva is None:
            raise ErrorNoEncontrado(f"La reserva {reserva_id} no existe")
        if reserva.estado == "CANCELADA":
            raise ErrorValidacion("La reserva está cancelada")
        if reserva.estado_pago != "PENDIENTE":
            raise ErrorValidacion(f"La reserva ya tiene el pago en estado {reserva.estado_pago}")
        if self._pagos is None:
            raise ErrorServicioNoDisponible("El servicio de pagos no está disponible")

        await self._pagos.solicitar(reserva.id, reserva.monto_total, token)
        return SolicitudPago(
            reserva_id=reserva.id,
            monto=reserva.monto_total,
            estado="PENDIENTE",
            mensaje="Pago enviado a procesamiento. Consulta la reserva en unos segundos.",
        )
