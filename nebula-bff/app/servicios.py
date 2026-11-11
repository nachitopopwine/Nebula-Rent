"""Contenedor de dependencias del BFF."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.config import Config
from app.orquestador import Orquestador

log = logging.getLogger(__name__)


@dataclass
class Servicios:
    pilotos: Any
    reservas: Any
    clima: Any
    pagos: Any | None
    orquestador: Orquestador = field(init=False)

    def __post_init__(self) -> None:
        self.orquestador = Orquestador(self.reservas, self.clima, self.pagos)

    async def cerrar(self) -> None:
        for cliente in (self.pilotos, self.reservas, self.clima, self.pagos):
            if cliente is not None and hasattr(cliente, "cerrar"):
                try:
                    await cliente.cerrar()
                except Exception as e:  # noqa: BLE001
                    log.warning("Error cerrando %s: %s", type(cliente).__name__, e)


async def construir_servicios(cfg: Config) -> Servicios:  # pragma: no cover - cableado real
    from app.clients.clima import ClimaClient
    from app.clients.pagos import PagosKafka
    from app.clients.pilotos import PilotosClient
    from app.clients.reservas import ReservasClient

    try:
        pagos = await PagosKafka.conectar(cfg.kafka_brokers)
    except Exception as e:  # noqa: BLE001 - el BFF arranca aunque Kafka no esté listo
        log.error("Kafka no disponible (%s): la mutación pagarReserva fallará", e)
        pagos = None

    return Servicios(
        pilotos=PilotosClient.conectar(cfg.pilotos_addr),
        reservas=ReservasClient.conectar(cfg.reservas_addr),
        clima=ClimaClient.conectar(cfg.clima_url),
        pagos=pagos,
    )
