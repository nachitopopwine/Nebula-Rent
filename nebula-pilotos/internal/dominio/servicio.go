package dominio

import (
	"context"
	"crypto/rand"
	"fmt"
	"strings"
	"time"
)

// Repositorio abstrae la persistencia (PostgreSQL en producción, memoria en tests).
type Repositorio interface {
	Guardar(ctx context.Context, p Piloto) error
	BuscarPorID(ctx context.Context, id string) (Piloto, error)
	Listar(ctx context.Context, limite int) ([]Piloto, error)
}

const (
	limitePorDefecto = 50
	limiteMaximo     = 200
)

// Servicio implementa los casos de uso de pilotos.
type Servicio struct {
	repo  Repositorio
	reloj func() time.Time
	genID func() string
}

// NuevoServicio crea el servicio con reloj real y UUID v4.
func NuevoServicio(repo Repositorio) *Servicio {
	return &Servicio{repo: repo, reloj: time.Now, genID: GenerarID}
}

// ConReloj permite fijar la hora (útil en tests).
func (s *Servicio) ConReloj(reloj func() time.Time) *Servicio {
	s.reloj = reloj
	return s
}

// ConGeneradorID permite fijar los IDs (útil en tests).
func (s *Servicio) ConGeneradorID(gen func() string) *Servicio {
	s.genID = gen
	return s
}

// Crear registra un nuevo piloto.
func (s *Servicio) Crear(ctx context.Context, nombre, licencia string, horas int32) (Piloto, error) {
	p, err := NuevoPiloto(s.genID(), nombre, licencia, horas, s.reloj())
	if err != nil {
		return Piloto{}, err
	}
	if err := s.repo.Guardar(ctx, p); err != nil {
		return Piloto{}, fmt.Errorf("guardando piloto: %w", err)
	}
	return p, nil
}

// Obtener busca un piloto por su id.
func (s *Servicio) Obtener(ctx context.Context, id string) (Piloto, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return Piloto{}, ErrIDRequerido
	}
	return s.repo.BuscarPorID(ctx, id)
}

// Listar devuelve pilotos ordenados por fecha de creación, acotando el límite.
func (s *Servicio) Listar(ctx context.Context, limite int) ([]Piloto, error) {
	return s.repo.Listar(ctx, NormalizarLimite(limite))
}

// NormalizarLimite aplica el valor por defecto y el máximo permitido.
func NormalizarLimite(limite int) int {
	switch {
	case limite <= 0:
		return limitePorDefecto
	case limite > limiteMaximo:
		return limiteMaximo
	default:
		return limite
	}
}

// GenerarID crea un UUID v4 usando solo la librería estándar.
func GenerarID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
