// Package dominio contiene las reglas de negocio de los pilotos de Nébula Rent.
// No depende de gRPC ni de la base de datos.
package dominio

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"
)

// Errores de validación y de negocio.
var (
	ErrNombreInvalido   = errors.New("el nombre debe tener entre 3 y 80 caracteres")
	ErrLicenciaInvalida = errors.New("licencia inválida: use CLASE_A, CLASE_B o CLASE_C")
	ErrHorasInvalidas   = errors.New("las horas de vuelo deben estar entre 0 y 100000")
	ErrIDRequerido      = errors.New("el id del piloto es obligatorio")
	ErrNoEncontrado     = errors.New("piloto no encontrado")
)

// Licencia de vuelo. CLASE_A es la más alta (puede pilotear cualquier nave).
type Licencia string

const (
	ClaseA Licencia = "CLASE_A"
	ClaseB Licencia = "CLASE_B"
	ClaseC Licencia = "CLASE_C"
)

// ParseLicencia normaliza y valida una licencia escrita por el usuario.
func ParseLicencia(s string) (Licencia, error) {
	l := Licencia(strings.ToUpper(strings.TrimSpace(s)))
	switch l {
	case ClaseA, ClaseB, ClaseC:
		return l, nil
	default:
		return "", ErrLicenciaInvalida
	}
}

// Piloto registrado en la plataforma.
type Piloto struct {
	ID         string
	Nombre     string
	Licencia   Licencia
	HorasVuelo int32
	Activo     bool
	CreadoEn   time.Time
}

// NuevoPiloto valida los datos de entrada y construye un piloto activo.
func NuevoPiloto(id, nombre, licencia string, horas int32, ahora time.Time) (Piloto, error) {
	nombre = strings.TrimSpace(nombre)
	if n := utf8.RuneCountInString(nombre); n < 3 || n > 80 {
		return Piloto{}, ErrNombreInvalido
	}
	lic, err := ParseLicencia(licencia)
	if err != nil {
		return Piloto{}, err
	}
	if horas < 0 || horas > 100000 {
		return Piloto{}, ErrHorasInvalidas
	}
	return Piloto{
		ID:         id,
		Nombre:     nombre,
		Licencia:   lic,
		HorasVuelo: horas,
		Activo:     true,
		CreadoEn:   ahora.UTC(),
	}, nil
}

// EsErrorDeValidacion indica si el error proviene de datos de entrada inválidos.
func EsErrorDeValidacion(err error) bool {
	return errors.Is(err, ErrNombreInvalido) ||
		errors.Is(err, ErrLicenciaInvalida) ||
		errors.Is(err, ErrHorasInvalidas) ||
		errors.Is(err, ErrIDRequerido)
}
