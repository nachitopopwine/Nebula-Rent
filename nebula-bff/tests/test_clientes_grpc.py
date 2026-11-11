"""Clientes gRPC contra servidores gRPC reales en memoria que simulan Go y Java.

Requiere el código generado (scripts/gen_proto.sh); en CI se genera antes de los tests.
"""

import pytest

grpc = pytest.importorskip("grpc")
pilotos_pb2 = pytest.importorskip("app.gen.pilotos_pb2")

from app.clients.grpc_util import traducir  # noqa: E402
from app.clients.pilotos import PilotosClient  # noqa: E402
from app.clients.reservas import ReservasClient  # noqa: E402
from app.errores import ErrorBFF, ErrorServicioNoDisponible, ErrorValidacion  # noqa: E402
from app.gen import pilotos_pb2_grpc, reservas_pb2, reservas_pb2_grpc  # noqa: E402

pytestmark = pytest.mark.anyio


class PilotosServidor(pilotos_pb2_grpc.PilotoServiceServicer):
    async def ListarPilotos(self, request, context):
        return pilotos_pb2.ListarPilotosResponse(pilotos=[
            pilotos_pb2.Piloto(id="p1", nombre="Valentina Orbe", licencia="CLASE_A", horas_vuelo=2400, activo=True)
        ][: request.limite or 50])

    async def ObtenerPiloto(self, request, context):
        if request.id != "p1":
            await context.abort(grpc.StatusCode.NOT_FOUND, "piloto no encontrado")
        return pilotos_pb2.Piloto(id="p1", nombre="Valentina Orbe", licencia="CLASE_A")

    async def CrearPiloto(self, request, context):
        if request.licencia not in ("CLASE_A", "CLASE_B", "CLASE_C"):
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "licencia inválida")
        return pilotos_pb2.Piloto(id="nuevo", nombre=request.nombre, licencia=request.licencia,
                                  horas_vuelo=request.horas_vuelo, activo=True)


RESERVA = reservas_pb2.Reserva(id="r1", piloto_id="p1", nave_id="NV-001", destino="Luna", dias=2,
                               monto_total=2400, estado="CONFIRMADA", estado_pago="PENDIENTE")


class ReservasServidor(reservas_pb2_grpc.ReservaServiceServicer):
    async def ListarNaves(self, request, context):
        return reservas_pb2.ListarNavesResponse(naves=[
            reservas_pb2.Nave(id="NV-001", nombre="Colibrí Estelar", clase="EXPLORACION",
                              licencia_requerida="CLASE_C", tarifa_diaria=1200, capacidad=2)
        ])

    async def ListarReservas(self, request, context):
        return reservas_pb2.ListarReservasResponse(reservas=[RESERVA] if request.piloto_id in ("", "p1") else [])

    async def ObtenerReserva(self, request, context):
        if request.id != "r1":
            await context.abort(grpc.StatusCode.NOT_FOUND, "no existe")
        return RESERVA

    async def CrearReserva(self, request, context):
        if request.dias > 30:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Los días deben estar entre 1 y 30")
        return reservas_pb2.Reserva(id="r2", piloto_id=request.piloto_id, nave_id=request.nave_id,
                                    destino=request.destino, dias=request.dias, monto_total=100,
                                    estado="CONFIRMADA", estado_pago="PENDIENTE")


@pytest.fixture
async def direccion():
    servidor = grpc.aio.server()
    pilotos_pb2_grpc.add_PilotoServiceServicer_to_server(PilotosServidor(), servidor)
    reservas_pb2_grpc.add_ReservaServiceServicer_to_server(ReservasServidor(), servidor)
    puerto = servidor.add_insecure_port("127.0.0.1:0")
    await servidor.start()
    yield f"127.0.0.1:{puerto}"
    await servidor.stop(None)


async def test_cliente_pilotos(direccion):
    c = PilotosClient.conectar(direccion)
    assert (await c.listar())[0].nombre == "Valentina Orbe"
    assert (await c.obtener("p1")).licencia == "CLASE_A"
    assert await c.obtener("nadie") is None
    assert (await c.crear("Tomás", "CLASE_B", 10)).horas_vuelo == 10
    with pytest.raises(ErrorValidacion, match="licencia"):
        await c.crear("Tomás", "CLASE_Z", 10)
    await c.cerrar()


async def test_cliente_reservas(direccion):
    c = ReservasClient.conectar(direccion)
    assert (await c.listar_naves())[0].licencia_requerida == "CLASE_C"
    assert len(await c.listar()) == 1
    assert await c.listar("otro") == []
    assert (await c.obtener("r1")).monto_total == 2400.0
    assert await c.obtener("x") is None
    assert (await c.crear("p1", "NV-001", "Marte", 3)).id == "r2"
    with pytest.raises(ErrorValidacion):
        await c.crear("p1", "NV-001", "Marte", 99)
    await c.cerrar()


async def test_servicio_caido():
    c = PilotosClient(grpc.aio.insecure_channel("127.0.0.1:1"), timeout=0.5)
    with pytest.raises(ErrorServicioNoDisponible):
        await c.listar()
    await c.cerrar()


class ErrorFalso(grpc.aio.AioRpcError):
    def __init__(self, codigo):
        super().__init__(codigo, grpc.aio.Metadata(), grpc.aio.Metadata(), details="detalle")


def test_traducir_codigos_desconocidos():
    err = traducir("pilotos", ErrorFalso(grpc.StatusCode.INTERNAL))
    assert type(err) is ErrorBFF
