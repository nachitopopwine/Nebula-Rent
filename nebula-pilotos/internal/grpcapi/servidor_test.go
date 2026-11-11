package grpcapi_test

import (
	"context"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"

	pb "github.com/nebula-rent/nebula-pilotos/gen/pilotosv1"
	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
	"github.com/nebula-rent/nebula-pilotos/internal/grpcapi"
	"github.com/nebula-rent/nebula-pilotos/internal/repositorio"
)

// cliente levanta un servidor gRPC real en memoria (bufconn) y devuelve un cliente.
func cliente(t *testing.T) pb.PilotoServiceClient {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	pb.RegisterPilotoServiceServer(srv, grpcapi.NuevoServidor(dominio.NuevoServicio(repositorio.NuevaMemoria())))
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.Stop)

	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	return pb.NewPilotoServiceClient(conn)
}

func TestFlujoCompletoGRPC(t *testing.T) {
	ctx := context.Background()
	c := cliente(t)

	creado, err := c.CrearPiloto(ctx, &pb.CrearPilotoRequest{Nombre: "Valentina Orbe", Licencia: "CLASE_A", HorasVuelo: 1500})
	if err != nil {
		t.Fatalf("CrearPiloto: %v", err)
	}
	if creado.Id == "" || !creado.Activo || creado.CreadoEn == "" {
		t.Fatalf("respuesta incompleta: %+v", creado)
	}

	obtenido, err := c.ObtenerPiloto(ctx, &pb.ObtenerPilotoRequest{Id: creado.Id})
	if err != nil || obtenido.Nombre != "Valentina Orbe" {
		t.Fatalf("ObtenerPiloto = %+v, %v", obtenido, err)
	}

	lista, err := c.ListarPilotos(ctx, &pb.ListarPilotosRequest{})
	if err != nil || len(lista.Pilotos) != 1 {
		t.Fatalf("ListarPilotos = %+v, %v", lista, err)
	}
}

func TestCodigosDeError(t *testing.T) {
	ctx := context.Background()
	c := cliente(t)

	_, err := c.CrearPiloto(ctx, &pb.CrearPilotoRequest{Nombre: "X", Licencia: "CLASE_A"})
	if status.Code(err) != codes.InvalidArgument {
		t.Errorf("esperaba InvalidArgument, obtuve %v", err)
	}
	_, err = c.ObtenerPiloto(ctx, &pb.ObtenerPilotoRequest{Id: "no-existe"})
	if status.Code(err) != codes.NotFound {
		t.Errorf("esperaba NotFound, obtuve %v", err)
	}
	_, err = c.ObtenerPiloto(ctx, &pb.ObtenerPilotoRequest{})
	if status.Code(err) != codes.InvalidArgument {
		t.Errorf("esperaba InvalidArgument por id vacío, obtuve %v", err)
	}
}
