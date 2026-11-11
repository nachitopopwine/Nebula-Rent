// Package repositorio contiene las implementaciones de persistencia de pilotos.
package repositorio

import (
	"context"
	"sort"
	"sync"

	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
)

// Memoria es un repositorio en memoria, usado en tests y en modo desarrollo
// cuando no se define DATABASE_URL.
type Memoria struct {
	mu      sync.RWMutex
	pilotos map[string]dominio.Piloto
}

// NuevaMemoria crea un repositorio vacío.
func NuevaMemoria() *Memoria {
	return &Memoria{pilotos: map[string]dominio.Piloto{}}
}

func (m *Memoria) Guardar(_ context.Context, p dominio.Piloto) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.pilotos == nil {
		m.pilotos = map[string]dominio.Piloto{}
	}
	m.pilotos[p.ID] = p
	return nil
}

func (m *Memoria) BuscarPorID(_ context.Context, id string) (dominio.Piloto, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.pilotos[id]
	if !ok {
		return dominio.Piloto{}, dominio.ErrNoEncontrado
	}
	return p, nil
}

func (m *Memoria) Listar(_ context.Context, limite int) ([]dominio.Piloto, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	lista := make([]dominio.Piloto, 0, len(m.pilotos))
	for _, p := range m.pilotos {
		lista = append(lista, p)
	}
	sort.Slice(lista, func(i, j int) bool { return lista[i].CreadoEn.Before(lista[j].CreadoEn) })
	if limite > 0 && len(lista) > limite {
		lista = lista[:limite]
	}
	return lista, nil
}
