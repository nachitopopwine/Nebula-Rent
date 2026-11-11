package dominio_test

import (
	"context"
	"errors"
	"regexp"
	"testing"
	"time"

	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
	"github.com/nebula-rent/nebula-pilotos/internal/repositorio"
)

var fijo = time.Date(2026, 11, 11, 12, 0, 0, 0, time.UTC)

func TestParseLicencia(t *testing.T) {
	casos := map[string]struct {
		entrada string
		want    dominio.Licencia
		err     error
	}{
		"clase a":    {"CLASE_A", dominio.ClaseA, nil},
		"minusculas": {"  clase_b ", dominio.ClaseB, nil},
		"clase c":    {"CLASE_C", dominio.ClaseC, nil},
		"invalida":   {"CLASE_Z", "", dominio.ErrLicenciaInvalida},
		"vacia":      {"", "", dominio.ErrLicenciaInvalida},
	}
	for nombre, c := range casos {
		t.Run(nombre, func(t *testing.T) {
			got, err := dominio.ParseLicencia(c.entrada)
			if !errors.Is(err, c.err) || got != c.want {
				t.Fatalf("ParseLicencia(%q) = %q, %v; want %q, %v", c.entrada, got, err, c.want, c.err)
			}
		})
	}
}

func TestNuevoPiloto(t *testing.T) {
	p, err := dominio.NuevoPiloto("id-1", "  Valentina Orbe ", "clase_a", 1200, fijo)
	if err != nil {
		t.Fatalf("error inesperado: %v", err)
	}
	if p.Nombre != "Valentina Orbe" || p.Licencia != dominio.ClaseA || !p.Activo || p.HorasVuelo != 1200 {
		t.Fatalf("piloto mal construido: %+v", p)
	}

	invalidos := []struct {
		nombre, licencia string
		horas            int32
		err              error
	}{
		{"Al", "CLASE_A", 10, dominio.ErrNombreInvalido},
		{"Nombre Válido", "PILOTO", 10, dominio.ErrLicenciaInvalida},
		{"Nombre Válido", "CLASE_B", -1, dominio.ErrHorasInvalidas},
		{"Nombre Válido", "CLASE_B", 100001, dominio.ErrHorasInvalidas},
	}
	for _, c := range invalidos {
		if _, err := dominio.NuevoPiloto("x", c.nombre, c.licencia, c.horas, fijo); !errors.Is(err, c.err) {
			t.Errorf("NuevoPiloto(%q,%q,%d) err = %v; want %v", c.nombre, c.licencia, c.horas, err, c.err)
		}
	}
}

func TestEsErrorDeValidacion(t *testing.T) {
	if !dominio.EsErrorDeValidacion(dominio.ErrNombreInvalido) {
		t.Error("ErrNombreInvalido debería ser de validación")
	}
	if dominio.EsErrorDeValidacion(dominio.ErrNoEncontrado) {
		t.Error("ErrNoEncontrado no es de validación")
	}
}

func TestNormalizarLimite(t *testing.T) {
	for entrada, want := range map[int]int{0: 50, -3: 50, 10: 10, 500: 200} {
		if got := dominio.NormalizarLimite(entrada); got != want {
			t.Errorf("NormalizarLimite(%d) = %d; want %d", entrada, got, want)
		}
	}
}

func TestGenerarID(t *testing.T) {
	re := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	a, b := dominio.GenerarID(), dominio.GenerarID()
	if !re.MatchString(a) || a == b {
		t.Fatalf("UUID inválido o repetido: %s %s", a, b)
	}
}

func nuevoServicio() *dominio.Servicio {
	n := 0
	return dominio.NuevoServicio(repositorio.NuevaMemoria()).
		ConReloj(func() time.Time { n++; return fijo.Add(time.Duration(n) * time.Minute) }).
		ConGeneradorID(func() string { return "p-" + string(rune('a'+n)) })
}

func TestServicioCrearObtenerListar(t *testing.T) {
	ctx := context.Background()
	s := nuevoServicio()

	creado, err := s.Crear(ctx, "Tomás Cometa", "CLASE_B", 300)
	if err != nil {
		t.Fatalf("Crear: %v", err)
	}
	if _, err := s.Crear(ctx, "Isidora Quasar", "CLASE_C", 40); err != nil {
		t.Fatalf("Crear 2: %v", err)
	}

	obtenido, err := s.Obtener(ctx, creado.ID)
	if err != nil || obtenido.Nombre != "Tomás Cometa" {
		t.Fatalf("Obtener = %+v, %v", obtenido, err)
	}

	lista, err := s.Listar(ctx, 0)
	if err != nil || len(lista) != 2 || lista[0].Nombre != "Tomás Cometa" {
		t.Fatalf("Listar = %+v, %v", lista, err)
	}

	lista, _ = s.Listar(ctx, 1)
	if len(lista) != 1 {
		t.Fatalf("Listar con límite 1 devolvió %d", len(lista))
	}
}

func TestServicioErrores(t *testing.T) {
	ctx := context.Background()
	s := nuevoServicio()
	if _, err := s.Crear(ctx, "X", "CLASE_A", 1); !errors.Is(err, dominio.ErrNombreInvalido) {
		t.Errorf("esperaba ErrNombreInvalido, obtuve %v", err)
	}
	if _, err := s.Obtener(ctx, "  "); !errors.Is(err, dominio.ErrIDRequerido) {
		t.Errorf("esperaba ErrIDRequerido, obtuve %v", err)
	}
	if _, err := s.Obtener(ctx, "no-existe"); !errors.Is(err, dominio.ErrNoEncontrado) {
		t.Errorf("esperaba ErrNoEncontrado, obtuve %v", err)
	}
}

type repoRoto struct{ repositorio.Memoria }

func (r *repoRoto) Guardar(context.Context, dominio.Piloto) error { return errors.New("db caída") }

func TestServicioErrorDePersistencia(t *testing.T) {
	s := dominio.NuevoServicio(&repoRoto{})
	if _, err := s.Crear(context.Background(), "Piloto Uno", "CLASE_A", 1); err == nil {
		t.Fatal("esperaba error de persistencia")
	}
}
