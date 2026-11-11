import type { MockedResponse } from "@apollo/client/testing";
import { CLIMA, NAVES, PILOTOS, RESERVAS } from "../graphql";

export const naves = [
  { id: "NV-001", nombre: "Colibrí Estelar", clase: "EXPLORACION", licenciaRequerida: "CLASE_C", tarifaDiaria: 1200, capacidad: 2 },
  { id: "NV-005", nombre: "Aurora Boreal", clase: "LUJO", licenciaRequerida: "CLASE_A", tarifaDiaria: 9800, capacidad: 10 },
];

export const pilotos = [
  { id: "p1", nombre: "Valentina Orbe", licencia: "CLASE_A", horasVuelo: 2400, activo: true },
  { id: "p2", nombre: "Isidora Quasar", licencia: "CLASE_C", horasVuelo: 85, activo: true },
];

export const reservas = [
  {
    id: "r1", destino: "Europa", dias: 7, montoTotal: 61740, estado: "CONFIRMADA", estadoPago: "PENDIENTE",
    creadaEn: "2026-11-11T12:00:00Z", piloto: { nombre: "Valentina Orbe" }, nave: { nombre: "Aurora Boreal" },
  },
  {
    id: "r2", destino: "Luna", dias: 1, montoTotal: 1200, estado: "CONFIRMADA", estadoPago: "APROBADO",
    creadaEn: "2026-11-10T12:00:00Z", piloto: { nombre: "Isidora Quasar" }, nave: { nombre: "Colibrí Estelar" },
  },
];

export const mockClima = (nivel = "MODERADO"): MockedResponse => ({
  request: { query: CLIMA, variables: { dias: 7 } },
  result: { data: { climaEspacial: { nivelRiesgo: nivel, mayorClase: "M2.1", totalLlamaradas: 4, origen: "NASA_DONKI" } } },
});

export const mockNaves: MockedResponse = { request: { query: NAVES }, result: { data: { naves } } };
export const mockPilotos: MockedResponse = { request: { query: PILOTOS }, result: { data: { pilotos } } };
export const mockReservas: MockedResponse = { request: { query: RESERVAS }, result: { data: { reservas } } };
