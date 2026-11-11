// Package grpcapi expone el servicio de pilotos vía gRPC.
package grpcapi

import (
	"context"
	"errors"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "github.com/nebula-rent/nebula-pilotos/gen/pilotosv1"
	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
)

// Servidor adapta dominio.Servicio al contrato gRPC PilotoService.
type Servidor struct {
	pb.UnimplementedPilotoServiceServer
	servicio *dominio.Servicio
}

// NuevoServidor crea el adaptador gRPC.
func NuevoServidor(s *dominio.Servicio) *Servidor {
	return &Servidor{servicio: s}
}

func (s *Servidor) CrearPiloto(ctx context.Context, req *pb.CrearPilotoRequest) (*pb.Piloto, error) {
	p, err := s.servicio.Crear(ctx, req.GetNombre(), req.GetLicencia(), req.GetHorasVuelo())
	if err != nil {
		return nil, aStatus(err)
	}
	return aProto(p), nil
}

func (s *Servidor) ObtenerPiloto(ctx context.Context, req *pb.ObtenerPilotoRequest) (*pb.Piloto, error) {
	p, err := s.servicio.Obtener(ctx, req.GetId())
	if err != nil {
		return nil, aStatus(err)
	}
	return aProto(p), nil
}

func (s *Servidor) ListarPilotos(ctx context.Context, req *pb.ListarPilotosRequest) (*pb.ListarPilotosResponse, error) {
	lista, err := s.servicio.Listar(ctx, int(req.GetLimite()))
	if err != nil {
		return nil, aStatus(err)
	}
	resp := &pb.ListarPilotosResponse{Pilotos: make([]*pb.Piloto, 0, len(lista))}
	for _, p := range lista {
		resp.Pilotos = append(resp.Pilotos, aProto(p))
	}
	return resp, nil
}

func aProto(p dominio.Piloto) *pb.Piloto {
	return &pb.Piloto{
		Id:         p.ID,
		Nombre:     p.Nombre,
		Licencia:   string(p.Licencia),
		HorasVuelo: p.HorasVuelo,
		Activo:     p.Activo,
		CreadoEn:   p.CreadoEn.Format(time.RFC3339),
	}
}

func aStatus(err error) error {
	switch {
	case dominio.EsErrorDeValidacion(err):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, dominio.ErrNoEncontrado):
		return status.Error(codes.NotFound, err.Error())
	default:
		return status.Error(codes.Internal, "error interno del servicio de pilotos")
	}
}
