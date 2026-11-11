import { GraphQLError } from "graphql";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReservaForm } from "../components/ReservaForm";
import { Reservas } from "../components/Reservas";
import { CREAR_RESERVA, PAGAR_RESERVA, RESERVAS, creditos } from "../graphql";
import { mockNaves, mockPilotos, mockReservas } from "./mocks";

describe("Reservas", () => {
  it("lista reservas y envía el pago de las pendientes", async () => {
    const user = userEvent.setup();
    const pagar: MockedResponse = {
      request: { query: PAGAR_RESERVA, variables: { reservaId: "r1", tokenTarjeta: "tok_master_5555" } },
      result: { data: { pagarReserva: { reservaId: "r1", estado: "PENDIENTE", mensaje: "Pago enviado a procesamiento." } } },
    };
    render(
      <MockedProvider mocks={[mockReservas, mockPilotos, mockNaves, pagar, mockReservas]} addTypename={false}>
        <Reservas />
      </MockedProvider>,
    );

    const fila = (await screen.findByText("Aurora Boreal → Europa")).closest("li")!;
    expect(within(fila).getByText("PENDIENTE")).toBeInTheDocument();
    // La reserva ya pagada no muestra botón de pago
    const pagada = screen.getByText("Colibrí Estelar → Luna").closest("li")!;
    expect(within(pagada).queryByRole("button")).toBeNull();

    const token = within(fila).getByLabelText("Token de pago r1");
    await user.clear(token);
    await user.type(token, "tok_master_5555");
    await user.click(within(fila).getByRole("button", { name: "Pagar" }));

    expect(await screen.findByText("Pago enviado a procesamiento.")).toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay reservas", async () => {
    render(
      <MockedProvider
        mocks={[{ request: { query: RESERVAS }, result: { data: { reservas: [] } } }, mockPilotos, mockNaves]}
        addTypename={false}
      >
        <Reservas />
      </MockedProvider>,
    );
    expect(await screen.findByText("Aún no hay reservas.")).toBeInTheDocument();
  });

  it("muestra el error del pago", async () => {
    const user = userEvent.setup();
    const pagar: MockedResponse = {
      request: { query: PAGAR_RESERVA, variables: { reservaId: "r1", tokenTarjeta: "tok_visa_4242" } },
      result: { errors: [new GraphQLError("El servicio de pagos no está disponible")] },
    };
    render(
      <MockedProvider mocks={[mockReservas, mockPilotos, mockNaves, pagar]} addTypename={false}>
        <Reservas />
      </MockedProvider>,
    );
    const fila = (await screen.findByText("Aurora Boreal → Europa")).closest("li")!;
    await user.click(within(fila).getByRole("button", { name: "Pagar" }));
    expect(await screen.findByText(/pagos no está disponible/)).toBeInTheDocument();
  });
});

describe("ReservaForm", () => {
  it("calcula el estimado, reserva y muestra la evaluación de clima", async () => {
    const user = userEvent.setup();
    const crear: MockedResponse = {
      request: {
        query: CREAR_RESERVA,
        variables: { input: { pilotoId: "p1", naveId: "NV-005", destino: "Europa", dias: 7 } },
      },
      result: {
        data: {
          crearReserva: {
            reserva: { id: "r9", montoTotal: 61740 },
            evaluacionRuta: { destino: "Europa", riesgo: "MODERADO", recomendacion: "Mantener escudos activos.", autorizado: true },
          },
        },
      },
    };
    render(
      <MockedProvider mocks={[mockPilotos, mockNaves, crear, { ...mockReservas }]} addTypename={false}>
        <ReservaForm />
      </MockedProvider>,
    );

    await screen.findByRole("option", { name: /Valentina Orbe/ });
    await screen.findByRole("option", { name: /Aurora Boreal/ });
    await user.selectOptions(screen.getByLabelText("Piloto"), "p1");
    await user.selectOptions(screen.getByLabelText("Nave"), "NV-005");
    await user.selectOptions(screen.getByLabelText("Destino"), "Europa");
    await user.clear(screen.getByLabelText("Días"));
    await user.type(screen.getByLabelText("Días"), "7");

    expect(screen.getByText(creditos(61740))).toBeInTheDocument();
    expect(screen.getByText("-10% estadía larga")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reservar" }));

    const exito = await screen.findByRole("status");
    expect(exito).toHaveTextContent("Reserva confirmada");
    expect(exito).toHaveTextContent("MODERADO");
  });

  it("muestra el rechazo por tormenta solar", async () => {
    const user = userEvent.setup();
    const crear: MockedResponse = {
      request: {
        query: CREAR_RESERVA,
        variables: { input: { pilotoId: "p2", naveId: "NV-001", destino: "Luna", dias: 3 } },
      },
      result: { errors: [new GraphQLError("Vuelos a Luna suspendidos (riesgo EXTREMO)")] },
    };
    render(
      <MockedProvider mocks={[mockPilotos, mockNaves, crear]} addTypename={false}>
        <ReservaForm />
      </MockedProvider>,
    );
    await screen.findByRole("option", { name: /Isidora Quasar/ });
    await screen.findByRole("option", { name: /Colibrí Estelar/ });
    await user.selectOptions(screen.getByLabelText("Piloto"), "p2");
    await user.selectOptions(screen.getByLabelText("Nave"), "NV-001");
    await user.click(screen.getByRole("button", { name: "Reservar" }));
    expect(await screen.findByText(/suspendidos/)).toBeInTheDocument();
  });
});

