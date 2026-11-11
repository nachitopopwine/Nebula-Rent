"""Errores de negocio del BFF. Se muestran tal cual al cliente GraphQL."""


class ErrorBFF(Exception):
    codigo = "ERROR_INTERNO"

    def __init__(self, mensaje: str):
        super().__init__(mensaje)
        self.mensaje = mensaje


class ErrorValidacion(ErrorBFF):
    codigo = "VALIDACION"


class ErrorNoEncontrado(ErrorBFF):
    codigo = "NO_ENCONTRADO"


class ErrorServicioNoDisponible(ErrorBFF):
    codigo = "SERVICIO_NO_DISPONIBLE"
