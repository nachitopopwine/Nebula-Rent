"""Esquema GraphQL del BFF (API Gateway de Nébula Rent).

Query    → gRPC (pilotos Go, reservas Java) y REST (clima MCP TypeScript)
Mutation → gRPC (crear) y Kafka (pagar → .NET)
"""


from dataclasses import asdict
from typing import Optional

import strawberry
from strawberry.types import Info

from app import modelos
from app.servicios import Servicios


def _svc(info: Info) -> Servicios:
    return info.context["servicios"]


# ---------------------------- Tipos ----------------------------

@strawberry.type(description="Piloto registrado (servicio Go + PostgreSQL)")
class Piloto:
    id: strawberry.ID
    nombre: str
    licencia: str
    horas_vuelo: int
    activo: bool
    creado_en: str

    @staticmethod
    def de(m: modelos.Piloto) -> "Piloto":
        return Piloto(**asdict(m))


@strawberry.type(description="Nave arrendable (servicio Java + MySQL)")
class Nave:
    id: strawberry.ID
    nombre: str
    clase: str
    licencia_requerida: str
    tarifa_diaria: float
    capacidad: int

    @staticmethod
    def de(m: modelos.Nave) -> "Nave":
        return Nave(**asdict(m))


@strawberry.type(description="Reserva de una nave (servicio Java + MySQL)")
class Reserva:
    id: strawberry.ID
    piloto_id: str
    nave_id: str
    destino: str
    dias: int
    monto_total: float
    estado: str
    estado_pago: str
    creada_en: str

    @staticmethod
    def de(m: modelos.Reserva) -> "Reserva":
        return Reserva(**asdict(m))

    @strawberry.field(description="Piloto de la reserva (se resuelve vía gRPC a Go)")
    async def piloto(self, info: Info) -> Optional[Piloto]:
        p = await _svc(info).pilotos.obtener(self.piloto_id)
        return Piloto.de(p) if p else None

    @strawberry.field(description="Nave de la reserva")
    async def nave(self, info: Info) -> Optional[Nave]:
        naves = await _svc(info).reservas.listar_naves()
        return next((Nave.de(n) for n in naves if n.id == self.nave_id), None)


@strawberry.type
class Llamarada:
    id: str
    clase: str
    inicio: str
    pico: Optional[str]
    region: Optional[str]


@strawberry.type(description="Clima espacial según NASA DONKI (MCP Server)")
class ClimaEspacial:
    desde: str
    hasta: str
    total_llamaradas: int
    mayor_clase: Optional[str]
    puntaje: float
    nivel_riesgo: str
    origen: str
    llamaradas: list[Llamarada]

    @staticmethod
    def de(m: modelos.ClimaEspacial) -> "ClimaEspacial":
        datos = asdict(m)
        datos["llamaradas"] = [Llamarada(**x) for x in datos["llamaradas"]]
        return ClimaEspacial(**datos)


@strawberry.type
class EvaluacionRuta:
    destino: str
    dias_viaje: int
    puntaje: float
    riesgo: str
    recomendacion: str
    autorizado: bool
    origen: str

    @staticmethod
    def de(m: modelos.EvaluacionRuta) -> "EvaluacionRuta":
        return EvaluacionRuta(**asdict(m))


@strawberry.type
class ResultadoReserva:
    reserva: Reserva
    evaluacion_ruta: Optional[EvaluacionRuta]


@strawberry.type
class SolicitudPago:
    reserva_id: str
    monto: float
    estado: str
    mensaje: str


# ---------------------------- Inputs ----------------------------

@strawberry.input
class CrearPilotoInput:
    nombre: str
    licencia: str
    horas_vuelo: int = 0


@strawberry.input
class CrearReservaInput:
    piloto_id: str
    nave_id: str
    destino: str
    dias: int


# ---------------------------- Raíz ----------------------------

@strawberry.type
class Query:
    @strawberry.field
    async def pilotos(self, info: Info, limite: int = 50) -> list[Piloto]:
        return [Piloto.de(p) for p in await _svc(info).pilotos.listar(limite)]

    @strawberry.field
    async def piloto(self, info: Info, id: strawberry.ID) -> Optional[Piloto]:
        p = await _svc(info).pilotos.obtener(str(id))
        return Piloto.de(p) if p else None

    @strawberry.field
    async def naves(self, info: Info) -> list[Nave]:
        return [Nave.de(n) for n in await _svc(info).reservas.listar_naves()]

    @strawberry.field
    async def reservas(self, info: Info, piloto_id: Optional[str] = None) -> list[Reserva]:
        return [Reserva.de(r) for r in await _svc(info).reservas.listar(piloto_id)]

    @strawberry.field
    async def reserva(self, info: Info, id: strawberry.ID) -> Optional[Reserva]:
        r = await _svc(info).reservas.obtener(str(id))
        return Reserva.de(r) if r else None

    @strawberry.field
    async def clima_espacial(self, info: Info, dias: int = 7) -> ClimaEspacial:
        return ClimaEspacial.de(await _svc(info).clima.clima_espacial(dias))

    @strawberry.field
    async def evaluar_ruta(self, info: Info, destino: str) -> EvaluacionRuta:
        return EvaluacionRuta.de(await _svc(info).clima.evaluar_ruta(destino))


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def crear_piloto(self, info: Info, input: CrearPilotoInput) -> Piloto:
        p = await _svc(info).pilotos.crear(input.nombre, input.licencia, input.horas_vuelo)
        return Piloto.de(p)

    @strawberry.mutation(description="Evalúa el clima espacial y crea la reserva")
    async def crear_reserva(self, info: Info, input: CrearReservaInput) -> ResultadoReserva:
        reserva, evaluacion = await _svc(info).orquestador.crear_reserva(
            input.piloto_id, input.nave_id, input.destino, input.dias
        )
        return ResultadoReserva(
            reserva=Reserva.de(reserva),
            evaluacion_ruta=EvaluacionRuta.de(evaluacion) if evaluacion else None,
        )

    @strawberry.mutation(description="Envía la solicitud de pago por Kafka al servicio de pagos")
    async def pagar_reserva(self, info: Info, reserva_id: str, token_tarjeta: str) -> SolicitudPago:
        s = await _svc(info).orquestador.pagar_reserva(reserva_id, token_tarjeta)
        return SolicitudPago(**asdict(s))


schema = strawberry.Schema(query=Query, mutation=Mutation)
