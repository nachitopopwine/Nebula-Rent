package repositorio_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
	"github.com/nebula-rent/nebula-pilotos/internal/repositorio"
)

func TestMemoria(t *testing.T) {
	ctx := context.Background()
	m := repositorio.NuevaMemoria()
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	for i, nombre := range []string{"Primero", "Segundo", "Tercero"} {
		p, _ := dominio.NuevoPiloto(nombre, nombre, "CLASE_C", 0, base.Add(time.Duration(i)*time.Hour))
		if err := m.Guardar(ctx, p); err != nil {
			t.Fatal(err)
		}
	}

	lista, _ := m.Listar(ctx, 2)
	if len(lista) != 2 || lista[0].Nombre != "Primero" || lista[1].Nombre != "Segundo" {
		t.Fatalf("orden o límite incorrecto: %+v", lista)
	}
	if _, err := m.BuscarPorID(ctx, "Tercero"); err != nil {
		t.Fatalf("BuscarPorID: %v", err)
	}
	if _, err := m.BuscarPorID(ctx, "nadie"); !errors.Is(err, dominio.ErrNoEncontrado) {
		t.Fatalf("esperaba ErrNoEncontrado, obtuve %v", err)
	}

	var cero repositorio.Memoria
	if err := cero.Guardar(ctx, dominio.Piloto{ID: "z"}); err != nil {
		t.Fatalf("el valor cero debe ser usable: %v", err)
	}
}
