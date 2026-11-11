"""BFF / API Gateway de Nébula Rent: expone un único endpoint GraphQL en /graphql."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from app.config import Config
from app.schema import schema
from app.servicios import Servicios, construir_servicios

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def obtener_contexto(request: Request) -> dict:
    return {"servicios": request.app.state.servicios}


def crear_app(servicios: Servicios | None = None, cfg: Config | None = None) -> FastAPI:
    cfg = cfg or Config.desde_entorno()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.servicios = servicios or await construir_servicios(cfg)
        yield
        await app.state.servicios.cerrar()

    app = FastAPI(title="Nébula Rent BFF", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cfg.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def salud() -> dict:
        return {"estado": "ok", "servicio": "nebula-bff"}

    app.include_router(GraphQLRouter(schema, context_getter=obtener_contexto), prefix="/graphql")
    return app


app = crear_app()
