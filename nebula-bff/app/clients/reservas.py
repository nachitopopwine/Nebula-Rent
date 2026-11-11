"""Cliente gRPC hacia nebula-reservas (Java)."""

from __future__ import annotations

import grpc

from app.clients.grpc_util import errores_grpc
from app.errores import ErrorNoEncontrado
from app.gen import reservas_pb2, reservas_pb2_grpc
from app.modelos import Nave, Reserva, nave_desde_proto, reserva_desde_proto


class ReservasClient:
    def __init__(self, canal: grpc.aio.Channel, timeout: float = 5.0):
        self._canal = canal
        self._stub = reservas_pb2_grpc.ReservaServiceStub(canal)
        self._timeout = timeout

    @classmethod
    def conectar(cls, direccion: str) -> "ReservasClient":
        return cls(grpc.aio.insecure_channel(direccion))

    @errores_grpc("reservas")
    async def listar_naves(self) -> list[Nave]:
        resp = await self._stub.ListarNaves(reservas_pb2.ListarNavesRequest(), timeout=self._timeout)
        return [nave_desde_proto(n) for n in resp.naves]

    @errores_grpc("reservas")
    async def listar(self, piloto_id: str | None = None) -> list[Reserva]:
        resp = await self._stub.ListarReservas(
            reservas_pb2.ListarReservasRequest(piloto_id=piloto_id or ""), timeout=self._timeout
        )
        return [reserva_desde_proto(r) for r in resp.reservas]

    async def obtener(self, reserva_id: str) -> Reserva | None:
        try:
            return await self._obtener(reserva_id)
        except ErrorNoEncontrado:
            return None

    @errores_grpc("reservas")
    async def _obtener(self, reserva_id: str) -> Reserva:
        resp = await self._stub.ObtenerReserva(
            reservas_pb2.ObtenerReservaRequest(id=reserva_id), timeout=self._timeout
        )
        return reserva_desde_proto(resp)

    @errores_grpc("reservas")
    async def crear(self, piloto_id: str, nave_id: str, destino: str, dias: int) -> Reserva:
        resp = await self._stub.CrearReserva(
            reservas_pb2.CrearReservaRequest(
                piloto_id=piloto_id, nave_id=nave_id, destino=destino, dias=dias
            ),
            timeout=self._timeout,
        )
        return reserva_desde_proto(resp)

    async def cerrar(self) -> None:
        await self._canal.close()
