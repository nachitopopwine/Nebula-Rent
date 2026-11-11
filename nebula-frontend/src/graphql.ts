import { gql } from "@apollo/client";

// ---------- Tipos (espejo del esquema GraphQL del BFF) ----------
export interface Piloto {
  id: string;
  nombre: string;
  licencia: string;
  horasVuelo: number;
  activo: boolean;
}

export interface Nave {
  id: string;
  nombre: string;
  clase: string;
  licenciaRequerida: string;
  tarifaDiaria: number;
  capacidad: number;
}

export interface Reserva {
  id: string;
  destino: string;
  dias: number;
  montoTotal: number;
  estado: string;
  estadoPago: string;
  creadaEn: string;
  piloto: { nombre: string } | null;
  nave: { nombre: string } | null;
}

export interface ClimaEspacial {
  nivelRiesgo: string;
  mayorClase: string | null;
  totalLlamaradas: number;
  origen: string;
}

export interface EvaluacionRuta {
  destino: string;
  riesgo: string;
  recomendacion: string;
  autorizado: boolean;
}

export const DESTINOS = ["Luna", "Marte", "Cinturón de Asteroides", "Europa", "Titán", "Encélado"];
export const LICENCIAS = ["CLASE_A", "CLASE_B", "CLASE_C"];

// ---------- Queries ----------
export const CLIMA = gql`
  query Clima($dias: Int!) {
    climaEspacial(dias: $dias) {
      nivelRiesgo
      mayorClase
      totalLlamaradas
      origen
    }
  }
`;

export const NAVES = gql`
  query Naves {
    naves {
      id
      nombre
      clase
      licenciaRequerida
      tarifaDiaria
      capacidad
    }
  }
`;

export const PILOTOS = gql`
  query Pilotos {
    pilotos {
      id
      nombre
      licencia
      horasVuelo
      activo
    }
  }
`;

export const RESERVAS = gql`
  query Reservas {
    reservas {
      id
      destino
      dias
      montoTotal
      estado
      estadoPago
      creadaEn
      piloto {
        nombre
      }
      nave {
        nombre
      }
    }
  }
`;

// ---------- Mutations ----------
export const CREAR_PILOTO = gql`
  mutation CrearPiloto($input: CrearPilotoInput!) {
    crearPiloto(input: $input) {
      id
      nombre
    }
  }
`;

export const CREAR_RESERVA = gql`
  mutation CrearReserva($input: CrearReservaInput!) {
    crearReserva(input: $input) {
      reserva {
        id
        montoTotal
      }
      evaluacionRuta {
        destino
        riesgo
        recomendacion
        autorizado
      }
    }
  }
`;

export const PAGAR_RESERVA = gql`
  mutation PagarReserva($reservaId: String!, $tokenTarjeta: String!) {
    pagarReserva(reservaId: $reservaId, tokenTarjeta: $tokenTarjeta) {
      reservaId
      estado
      mensaje
    }
  }
`;

export const creditos = (n: number) =>
  `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n)} ₢`;
