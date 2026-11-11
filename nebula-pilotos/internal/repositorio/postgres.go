package repositorio

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
)

const esquema = `
CREATE TABLE IF NOT EXISTS pilotos (
    id           UUID PRIMARY KEY,
    nombre       VARCHAR(80)  NOT NULL,
    licencia     VARCHAR(10)  NOT NULL,
    horas_vuelo  INTEGER      NOT NULL DEFAULT 0,
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pilotos_creado_en ON pilotos (creado_en);
`

// Postgres implementa dominio.Repositorio sobre PostgreSQL.
type Postgres struct {
	pool *pgxpool.Pool
}

// NuevoPostgres abre el pool de conexiones y aplica el esquema.
func NuevoPostgres(ctx context.Context, url string) (*Postgres, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("conectando a postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping a postgres: %w", err)
	}
	if _, err := pool.Exec(ctx, esquema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("migrando esquema: %w", err)
	}
	return &Postgres{pool: pool}, nil
}

// Cerrar libera el pool.
func (p *Postgres) Cerrar() { p.pool.Close() }

func (p *Postgres) Guardar(ctx context.Context, pi dominio.Piloto) error {
	_, err := p.pool.Exec(ctx, `
		INSERT INTO pilotos (id, nombre, licencia, horas_vuelo, activo, creado_en)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
		  nombre = EXCLUDED.nombre, licencia = EXCLUDED.licencia,
		  horas_vuelo = EXCLUDED.horas_vuelo, activo = EXCLUDED.activo`,
		pi.ID, pi.Nombre, string(pi.Licencia), pi.HorasVuelo, pi.Activo, pi.CreadoEn)
	return err
}

func (p *Postgres) BuscarPorID(ctx context.Context, id string) (dominio.Piloto, error) {
	row := p.pool.QueryRow(ctx, `
		SELECT id::text, nombre, licencia, horas_vuelo, activo, creado_en
		FROM pilotos WHERE id::text = $1`, id)
	pi, err := escanear(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return dominio.Piloto{}, dominio.ErrNoEncontrado
	}
	return pi, err
}

func (p *Postgres) Listar(ctx context.Context, limite int) ([]dominio.Piloto, error) {
	rows, err := p.pool.Query(ctx, `
		SELECT id::text, nombre, licencia, horas_vuelo, activo, creado_en
		FROM pilotos ORDER BY creado_en ASC LIMIT $1`, limite)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var lista []dominio.Piloto
	for rows.Next() {
		pi, err := escanear(rows)
		if err != nil {
			return nil, err
		}
		lista = append(lista, pi)
	}
	return lista, rows.Err()
}

func escanear(row pgx.Row) (dominio.Piloto, error) {
	var pi dominio.Piloto
	var lic string
	err := row.Scan(&pi.ID, &pi.Nombre, &lic, &pi.HorasVuelo, &pi.Activo, &pi.CreadoEn)
	pi.Licencia = dominio.Licencia(lic)
	return pi, err
}
