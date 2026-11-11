// Servidor gRPC del microservicio de Pilotos de Nébula Rent.
package main

import (
	"context"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	pb "github.com/nebula-rent/nebula-pilotos/gen/pilotosv1"
	"github.com/nebula-rent/nebula-pilotos/internal/dominio"
	"github.com/nebula-rent/nebula-pilotos/internal/grpcapi"
	"github.com/nebula-rent/nebula-pilotos/internal/repositorio"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var repo dominio.Repositorio
	if url := os.Getenv("DATABASE_URL"); url != "" {
		pg, err := repositorio.NuevoPostgres(ctx, url)
		if err != nil {
			log.Error("no se pudo conectar a PostgreSQL", "err", err)
			os.Exit(1)
		}
		defer pg.Cerrar()
		repo = pg
		log.Info("usando PostgreSQL")
	} else {
		repo = repositorio.NuevaMemoria()
		log.Warn("DATABASE_URL no definida: usando repositorio en memoria")
	}

	servicio := dominio.NuevoServicio(repo)
	sembrar(ctx, servicio, log)

	puerto := os.Getenv("GRPC_PORT")
	if puerto == "" {
		puerto = "50051"
	}
	lis, err := net.Listen("tcp", ":"+puerto)
	if err != nil {
		log.Error("no se pudo abrir el puerto", "err", err)
		os.Exit(1)
	}

	srv := grpc.NewServer()
	pb.RegisterPilotoServiceServer(srv, grpcapi.NuevoServidor(servicio))
	salud := health.NewServer()
	healthpb.RegisterHealthServer(srv, salud)
	reflection.Register(srv)

	go func() {
		<-ctx.Done()
		log.Info("apagando servidor gRPC")
		salud.Shutdown()
		srv.GracefulStop()
	}()

	log.Info("pilotos gRPC escuchando", "puerto", puerto)
	if err := srv.Serve(lis); err != nil {
		log.Error("servidor detenido", "err", err)
	}
}

// sembrar crea pilotos de demostración si la base está vacía.
func sembrar(ctx context.Context, s *dominio.Servicio, log *slog.Logger) {
	if lista, err := s.Listar(ctx, 1); err != nil || len(lista) > 0 {
		return
	}
	demo := []struct {
		nombre, licencia string
		horas            int32
	}{
		{"Valentina Orbe", "CLASE_A", 2400},
		{"Tomás Cometa", "CLASE_B", 640},
		{"Isidora Quasar", "CLASE_C", 85},
	}
	for _, d := range demo {
		if _, err := s.Crear(ctx, d.nombre, d.licencia, d.horas); err != nil {
			log.Warn("no se pudo sembrar piloto", "nombre", d.nombre, "err", err)
		}
	}
	log.Info("pilotos de demostración creados")
}
