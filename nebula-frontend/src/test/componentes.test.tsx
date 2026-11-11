import { GraphQLError } from "graphql";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import App from "../App";
import { ClimaBanner } from "../components/ClimaBanner";
import { Flota } from "../components/Flota";
import { Pilotos } from "../components/Pilotos";
import { CLIMA, CREAR_PILOTO, NAVES, PILOTOS, creditos } from "../graphql";
import { mockClima, mockNaves, mockPilotos, mockReservas, pilotos } from "./mocks";

const con = (mocks: MockedResponse[], ui: ReactNode) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

describe("ClimaBanner", () => {
  it("muestra el nivel de riesgo solar", async () => {
    con([mockClima("ALTO")], <ClimaBanner />);
    expect(screen.getByText(/Escaneando/)).toBeInTheDocument();
    expect(await screen.findByText("Riesgo solar: ALTO")).toBeInTheDocument();
    expect(screen.getByText(/máxima M2.1/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("riesgo-alto");
  });

  it("indica cuando el clima no está disponible", async () => {
    con([{ request: { query: CLIMA, variables: { dias: 7 } }, error: new Error("caído") }], <ClimaBanner />);
    expect(await screen.findByText("Clima espacial no disponible")).toBeInTheDocument();
  });
});

describe("Flota", () => {
  it("lista las naves con su tarifa", async () => {
    con([mockNaves], <Flota />);
    expect(await screen.findByText("Aurora Boreal")).toBeInTheDocument();
    expect(screen.getByText(creditos(9800))).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("muestra el error del BFF", async () => {
    con([{ request: { query: NAVES }, error: new Error("BFF caído") }], <Flota />);
    expect(await screen.findByText(/BFF caído/)).toBeInTheDocument();
  });
});

describe("Pilotos", () => {
  it("lista y registra pilotos", async () => {
    const user = userEvent.setup();
    const crear: MockedResponse = {
      request: {
        query: CREAR_PILOTO,
        variables: { input: { nombre: "Tomás Cometa", licencia: "CLASE_B", horasVuelo: 640 } },
      },
      result: { data: { crearPiloto: { id: "p3", nombre: "Tomás Cometa" } } },
    };
    const refetch: MockedResponse = {
      request: { query: PILOTOS },
      result: {
        data: { pilotos: [...pilotos, { id: "p3", nombre: "Tomás Cometa", licencia: "CLASE_B", horasVuelo: 640, activo: true }] },
      },
    };
    con([mockPilotos, crear, refetch], <Pilotos />);

    expect(await screen.findByText("Valentina Orbe")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre"), "Tomás Cometa");
    await user.selectOptions(screen.getByLabelText("Licencia"), "CLASE_B");
    await user.clear(screen.getByLabelText("Horas de vuelo"));
    await user.type(screen.getByLabelText("Horas de vuelo"), "640");
    await user.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByText("Tomás Cometa")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
  });

  it("muestra errores de validación del servicio Go", async () => {
    const user = userEvent.setup();
    const crear: MockedResponse = {
      request: { query: CREAR_PILOTO, variables: { input: { nombre: "Ana", licencia: "CLASE_C", horasVuelo: 0 } } },
      result: { errors: [new GraphQLError("el nombre debe tener entre 3 y 80 caracteres")] },
    };
    con([mockPilotos, crear], <Pilotos />);
    await user.type(await screen.findByLabelText("Nombre"), "Ana");
    await user.click(screen.getByRole("button", { name: "Registrar" }));
    expect(await screen.findByText(/entre 3 y 80/)).toBeInTheDocument();
  });
});

describe("App", () => {
  it("navega entre secciones", async () => {
    const user = userEvent.setup();
    con([mockClima(), mockNaves, mockPilotos, mockReservas, mockPilotos, mockNaves], <App />);

    expect(await screen.findByText("Colibrí Estelar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flota" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Pilotos" }));
    expect(await screen.findByText("Isidora Quasar")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reservas" }));
    expect(await screen.findByText("Aurora Boreal → Europa")).toBeInTheDocument();
  });
});
