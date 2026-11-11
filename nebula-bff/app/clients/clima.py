"""Cliente REST hacia nebula-clima-mcp (TypeScript)."""

from __future__ import annotations

import httpx

from app.errores import ErrorServicioNoDisponible, ErrorValidacion
from app.modelos import ClimaEspacial, EvaluacionRuta, clima_desde_json, evaluacion_desde_json


class ClimaClient:
    def __init__(self, http: httpx.AsyncClient):
        self._http = http

    @classmethod
    def conectar(cls, base_url: str, timeout: float = 10.0) -> "ClimaClient":
        return cls(httpx.AsyncClient(base_url=base_url, timeout=timeout))

    async def clima_espacial(self, dias: int = 7) -> ClimaEspacial:
        return clima_desde_json(await self._get("/api/v1/clima", {"dias": dias}))

    async def evaluar_ruta(self, destino: str) -> EvaluacionRuta:
        return evaluacion_desde_json(await self._get("/api/v1/rutas/evaluar", {"destino": destino}))

    async def _get(self, ruta: str, params: dict) -> dict:
        try:
            resp = await self._http.get(ruta, params=params)
        except httpx.HTTPError as e:
            raise ErrorServicioNoDisponible("El servicio de clima no está disponible") from e
        if resp.status_code == 400:
            raise ErrorValidacion(resp.json().get("error", "Solicitud inválida"))
        if resp.status_code >= 400:
            raise ErrorServicioNoDisponible(f"El servicio de clima respondió {resp.status_code}")
        return resp.json()

    async def cerrar(self) -> None:
        await self._http.aclose()
