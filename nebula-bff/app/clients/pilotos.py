"""Cliente gRPC hacia nebula-pilotos (Go)."""

from __future__ import annotations

import grpc

from app.clients.grpc_util import errores_grpc
from app.errores import ErrorNoEncontrado
from app.gen import pilotos_pb2, pilotos_pb2_grpc
from app.modelos import Piloto, piloto_desde_proto


class PilotosClient:
    def __init__(self, canal: grpc.aio.Channel, timeout: float = 3.0):
        self._canal = canal
        self._stub = pilotos_pb2_grpc.PilotoServiceStub(canal)
        self._timeout = timeout

    @classmethod
    def conectar(cls, direccion: str) -> "PilotosClient":
        return cls(grpc.aio.insecure_channel(direccion))

    @errores_grpc("pilotos")
    async def listar(self, limite: int = 50) -> list[Piloto]:
        resp = await self._stub.ListarPilotos(
            pilotos_pb2.ListarPilotosRequest(limite=limite), timeout=self._timeout
        )
        return [piloto_desde_proto(p) for p in resp.pilotos]

    async def obtener(self, piloto_id: str) -> Piloto | None:
        try:
            return await self._obtener(piloto_id)
        except ErrorNoEncontrado:
            return None

    @errores_grpc("pilotos")
    async def _obtener(self, piloto_id: str) -> Piloto:
        resp = await self._stub.ObtenerPiloto(
            pilotos_pb2.ObtenerPilotoRequest(id=piloto_id), timeout=self._timeout
        )
        return piloto_desde_proto(resp)

    @errores_grpc("pilotos")
    async def crear(self, nombre: str, licencia: str, horas_vuelo: int) -> Piloto:
        resp = await self._stub.CrearPiloto(
            pilotos_pb2.CrearPilotoRequest(nombre=nombre, licencia=licencia, horas_vuelo=horas_vuelo),
            timeout=self._timeout,
        )
        return piloto_desde_proto(resp)

    async def cerrar(self) -> None:
        await self._canal.close()
