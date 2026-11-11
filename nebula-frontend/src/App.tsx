import { useState } from "react";
import { ClimaBanner } from "./components/ClimaBanner";
import { Flota } from "./components/Flota";
import { Pilotos } from "./components/Pilotos";
import { Reservas } from "./components/Reservas";

const SECCIONES = [
  { id: "flota", titulo: "Flota" },
  { id: "pilotos", titulo: "Pilotos" },
  { id: "reservas", titulo: "Reservas" },
] as const;

type Seccion = (typeof SECCIONES)[number]["id"];

export default function App() {
  const [seccion, setSeccion] = useState<Seccion>("flota");

  return (
    <div className="app">
      <header className="cabecera">
        <div className="marca">
          <span className="logo" aria-hidden>◐</span>
          <div>
            <h1>Nébula Rent</h1>
            <p>Arriendo de naves · Puerto Espacial Atacama</p>
          </div>
        </div>
        <nav aria-label="Secciones">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              className={seccion === s.id ? "pestaña activa" : "pestaña"}
              aria-current={seccion === s.id ? "page" : undefined}
              onClick={() => setSeccion(s.id)}
            >
              {s.titulo}
            </button>
          ))}
        </nav>
      </header>

      <ClimaBanner />

      <main>
        {seccion === "flota" && <Flota />}
        {seccion === "pilotos" && <Pilotos />}
        {seccion === "reservas" && <Reservas />}
      </main>

      <footer className="pie">
        React → GraphQL → BFF (Python) → gRPC · Kafka · REST → Go · Java · .NET · TypeScript
      </footer>
    </div>
  );
}
