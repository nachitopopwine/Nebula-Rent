"""Traducción de errores gRPC a errores del BFF."""

from __future__ import annotations

import functools
from typing import Awaitable, Callable, ParamSpec, TypeVar

import grpc

from app.errores import ErrorBFF, ErrorNoEncontrado, ErrorServicioNoDisponible, ErrorValidacion

P = ParamSpec("P")
T = TypeVar("T")


def traducir(servicio: str, e: grpc.aio.AioRpcError) -> ErrorBFF:
    codigo = e.code()
    detalle = e.details() or ""
    if codigo == grpc.StatusCode.INVALID_ARGUMENT:
        return ErrorValidacion(detalle)
    if codigo == grpc.StatusCode.NOT_FOUND:
        return ErrorNoEncontrado(detalle)
    if codigo in (grpc.StatusCode.UNAVAILABLE, grpc.StatusCode.DEADLINE_EXCEEDED):
        return ErrorServicioNoDisponible(f"El servicio de {servicio} no está disponible")
    return ErrorBFF(f"Error en el servicio de {servicio}")


def errores_grpc(servicio: str) -> Callable[[Callable[P, Awaitable[T]]], Callable[P, Awaitable[T]]]:
    """Decorador: convierte AioRpcError en errores del BFF."""

    def decorador(fn: Callable[P, Awaitable[T]]) -> Callable[P, Awaitable[T]]:
        @functools.wraps(fn)
        async def envoltura(*args: P.args, **kwargs: P.kwargs) -> T:
            try:
                return await fn(*args, **kwargs)
            except grpc.aio.AioRpcError as e:
                raise traducir(servicio, e) from e

        return envoltura

    return decorador
