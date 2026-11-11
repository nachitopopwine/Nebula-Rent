"""Configuración del BFF leída desde variables de entorno."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class Config:
    pilotos_addr: str = "localhost:50051"
    reservas_addr: str = "localhost:9090"
    clima_url: str = "http://localhost:3000"
    kafka_brokers: str = "localhost:9092"
    cors_origins: tuple[str, ...] = ("http://localhost:5173",)

    @classmethod
    def desde_entorno(cls, env: Mapping[str, str] | None = None) -> "Config":
        env = os.environ if env is None else env
        origins = env.get("CORS_ORIGINS")
        return cls(
            pilotos_addr=env.get("PILOTOS_GRPC_ADDR", cls.pilotos_addr),
            reservas_addr=env.get("RESERVAS_GRPC_ADDR", cls.reservas_addr),
            clima_url=env.get("CLIMA_MCP_URL", cls.clima_url).rstrip("/"),
            kafka_brokers=env.get("KAFKA_BROKERS", cls.kafka_brokers),
            cors_origins=tuple(o.strip() for o in origins.split(",") if o.strip())
            if origins
            else cls.cors_origins,
        )
