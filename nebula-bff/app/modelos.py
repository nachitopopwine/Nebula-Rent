"""Modelos internos del BFF y conversores desde gRPC (protobuf) y REST (JSON).

Los conversores usan acceso por atributo/clave, así no dependen del código generado.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping


@dataclass
class Piloto:
    id: str
    nombre: str
    licencia: str
    horas_vuelo: int
    activo: bool
    creado_en: str


@dataclass
class Nave:
    id: str
    nombre: str
    clase: str
    licencia_requerida: str
    tarifa_diaria: float
    capacidad: int


@dataclass
class Reserva:
    id: str
    piloto_id: str
    nave_id: str
    destino: str
    dias: int
    monto_total: float
    estado: str
    estado_pago: str
    creada_en: str


@dataclass
class Llamarada:
    id: str
    clase: str
    inicio: str
    pico: str | None = None
    region: str | None = None


@dataclass
class ClimaEspacial:
    desde: str
    hasta: str
    total_llamaradas: int
    mayor_clase: str | None
    puntaje: float
    nivel_riesgo: str
    origen: str
    llamaradas: list[Llamarada] = field(default_factory=list)


@dataclass
class EvaluacionRuta:
    destino: str
    dias_viaje: int
    puntaje: float
    riesgo: str
    recomendacion: str
    autorizado: bool
    origen: str


@dataclass
class SolicitudPago:
    reserva_id: str
    monto: float
    estado: str
    mensaje: str


# ---------- gRPC → modelo ----------

def piloto_desde_proto(m: Any) -> Piloto:
    return Piloto(
        id=m.id,
        nombre=m.nombre,
        licencia=m.licencia,
        horas_vuelo=int(m.horas_vuelo),
        activo=bool(m.activo),
        creado_en=m.creado_en,
    )


def nave_desde_proto(m: Any) -> Nave:
    return Nave(
        id=m.id,
        nombre=m.nombre,
        clase=m.clase,
        licencia_requerida=m.licencia_requerida,
        tarifa_diaria=float(m.tarifa_diaria),
        capacidad=int(m.capacidad),
    )


def reserva_desde_proto(m: Any) -> Reserva:
    return Reserva(
        id=m.id,
        piloto_id=m.piloto_id,
        nave_id=m.nave_id,
        destino=m.destino,
        dias=int(m.dias),
        monto_total=float(m.monto_total),
        estado=m.estado,
        estado_pago=m.estado_pago,
        creada_en=m.creada_en,
    )


# ---------- REST (MCP Server) → modelo ----------

def clima_desde_json(d: Mapping[str, Any]) -> ClimaEspacial:
    return ClimaEspacial(
        desde=d["desde"],
        hasta=d["hasta"],
        total_llamaradas=int(d.get("totalLlamaradas", 0)),
        mayor_clase=d.get("mayorClase"),
        puntaje=float(d.get("puntaje", 0)),
        nivel_riesgo=d.get("nivelRiesgo", "DESCONOCIDO"),
        origen=d.get("origen", "DESCONOCIDO"),
        llamaradas=[
            Llamarada(
                id=str(x.get("id", "")),
                clase=x.get("clase", ""),
                inicio=x.get("inicio", ""),
                pico=x.get("pico"),
                region=x.get("region"),
            )
            for x in d.get("llamaradas", [])
        ],
    )


def evaluacion_desde_json(d: Mapping[str, Any]) -> EvaluacionRuta:
    return EvaluacionRuta(
        destino=d["destino"],
        dias_viaje=int(d.get("diasViaje", 0)),
        puntaje=float(d.get("puntaje", 0)),
        riesgo=d.get("riesgo", "DESCONOCIDO"),
        recomendacion=d.get("recomendacion", ""),
        autorizado=bool(d.get("autorizado", True)),
        origen=d.get("origen", "DESCONOCIDO"),
    )
