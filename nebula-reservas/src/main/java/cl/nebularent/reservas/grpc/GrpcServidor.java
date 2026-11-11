package cl.nebularent.reservas.grpc;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import io.grpc.BindableService;
import io.grpc.Grpc;
import io.grpc.InsecureServerCredentials;
import io.grpc.Server;
import io.grpc.health.v1.HealthCheckResponse.ServingStatus;
import io.grpc.protobuf.services.HealthStatusManager;
import io.grpc.protobuf.services.ProtoReflectionService;

/** Arranca y detiene el servidor gRPC junto con el contexto de Spring. */
@Component
public class GrpcServidor implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(GrpcServidor.class);

    private final int puerto;
    private final BindableService servicio;
    private final HealthStatusManager salud = new HealthStatusManager();
    private Server servidor;

    public GrpcServidor(@Value("${nebula.grpc.port}") int puerto, ReservaGrpcService servicio) {
        this.puerto = puerto;
        this.servicio = servicio;
    }

    @Override
    public synchronized void start() {
        try {
            servidor = Grpc.newServerBuilderForPort(puerto, InsecureServerCredentials.create())
                    .addService(servicio)
                    .addService(salud.getHealthService())
                    .addService(ProtoReflectionService.newInstance())
                    .build()
                    .start();
            salud.setStatus("", ServingStatus.SERVING);
            log.info("Reservas gRPC escuchando en el puerto {}", servidor.getPort());
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo iniciar el servidor gRPC", e);
        }
    }

    @Override
    public synchronized void stop() {
        if (servidor != null) {
            salud.enterTerminalState();
            servidor.shutdown();
            try {
                if (!servidor.awaitTermination(10, TimeUnit.SECONDS)) {
                    servidor.shutdownNow();
                }
            } catch (InterruptedException e) {
                servidor.shutdownNow();
                Thread.currentThread().interrupt();
            }
            servidor = null;
        }
    }

    @Override
    public synchronized boolean isRunning() {
        return servidor != null && !servidor.isShutdown();
    }

    /** Puerto real (útil cuando se configura 0 en tests). */
    public synchronized int puertoReal() {
        return servidor == null ? -1 : servidor.getPort();
    }
}
