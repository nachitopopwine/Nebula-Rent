package repositorio_test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
	"github.com/nebula-rent/nebula-pilotos/internal/repositorio"
)

// Test de integración: corre en CI contra el service container de PostgreSQL.
// Localmente se omite si TEST_DATABASE_URL no está definida.
func TestPostgres(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no definida")
	}
	ctx := context.Background()
	repo, err := repositorio.NuevoPostgres(ctx, url)
	if err != nil {
		t.Fatalf("conexión: %v", err)
	}
	defer repo.Cerrar()

	p, _ := dominio.NuevoPiloto(dominio.GenerarID(), "Piloto Integración", "CLASE_A", 10, time.Now())
	if err := repo.Guardar(ctx, p); err != nil {
		t.Fatalf("Guardar: %v", err)
	}
	got, err := repo.BuscarPorID(ctx, p.ID)
	if err != nil || got.Nombre != p.Nombre || got.Licencia != dominio.ClaseA {
		t.Fatalf("BuscarPorID = %+v, %v", got, err)
	}
	lista, err := repo.Listar(ctx, 100)
	if err != nil || len(lista) == 0 {
		t.Fatalf("Listar = %d, %v", len(lista), err)
	}
	if _, err := repo.BuscarPorID(ctx, dominio.GenerarID()); !errors.Is(err, dominio.ErrNoEncontrado) {
		t.Fatalf("esperaba ErrNoEncontrado, obtuve %v", err)
	}
}

func TestPostgresURLInvalida(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if _, err := repositorio.NuevoPostgres(ctx, "postgres://nadie@127.0.0.1:1/x?connect_timeout=1"); err == nil {
		t.Fatal("esperaba error con URL inalcanzable")
	}
}
