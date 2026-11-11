"""Publicador Kafka hacia nebula-pagos (.NET): tópico 'pagos.solicitados'."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable

from app.errores import ErrorServicioNoDisponible

log = logging.getLogger(__name__)

TOPICO_PAGOS_SOLICITADOS = "pagos.solicitados"


def construir_evento(reserva_id: str, monto: float, token_tarjeta: str, ahora: datetime) -> dict:
    return {
        "reservaId": reserva_id,
        "monto": monto,
        "tokenTarjeta": token_tarjeta,
        "solicitadoEn": ahora.isoformat(),
    }


class PagosKafka:
    """Envuelve un productor con la interfaz de aiokafka (start/stop/send_and_wait)."""

    def __init__(self, productor: Any, reloj: Callable[[], datetime] | None = None):
        self._productor = productor
        self._reloj = reloj or (lambda: datetime.now(timezone.utc))

    @classmethod
    async def conectar(cls, brokers: str) -> "PagosKafka":
        from aiokafka import AIOKafkaProducer

        productor = AIOKafkaProducer(bootstrap_servers=brokers, acks="all", enable_idempotence=True)
        await productor.start()
        return cls(productor)

    async def solicitar(self, reserva_id: str, monto: float, token_tarjeta: str) -> None:
        evento = construir_evento(reserva_id, monto, token_tarjeta, self._reloj())
        try:
            await self._productor.send_and_wait(
                TOPICO_PAGOS_SOLICITADOS,
                key=reserva_id.encode(),
                value=json.dumps(evento).encode(),
            )
        except Exception as e:  # noqa: BLE001 - cualquier fallo del broker
            log.error("No se pudo publicar la solicitud de pago %s: %s", reserva_id, e)
            raise ErrorServicioNoDisponible("No se pudo enviar el pago, intenta nuevamente") from e
        log.info("Solicitud de pago publicada para la reserva %s", reserva_id)

    async def cerrar(self) -> None:
        await self._productor.stop()
