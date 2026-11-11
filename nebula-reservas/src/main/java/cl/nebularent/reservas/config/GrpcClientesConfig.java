package cl.nebularent.reservas.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;

@Configuration
public class GrpcClientesConfig {

    @Bean(name = "pilotosChannel", destroyMethod = "shutdownNow")
    ManagedChannel pilotosChannel(@Value("${nebula.pilotos.addr}") String direccion) {
        return ManagedChannelBuilder.forTarget(direccion).usePlaintext().build();
    }
}
