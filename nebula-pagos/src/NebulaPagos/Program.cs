using MongoDB.Driver;
using NebulaPagos.Api;
using NebulaPagos.Dominio;
using NebulaPagos.Infraestructura;
using NebulaPagos.Puertos;
using NebulaRent.Reservas.V1;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.WebHost.UseUrls($"http://0.0.0.0:{config["PORT"] ?? "8080"}");

// --- Persistencia: MongoDB (o memoria si no hay MONGO_URL) ---
var mongoUrl = config["MONGO_URL"];
if (!string.IsNullOrWhiteSpace(mongoUrl))
{
    builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoUrl));
    builder.Services.AddSingleton<ICobroRepositorio>(sp =>
        new MongoCobroRepositorio(sp.GetRequiredService<IMongoClient>(), config["MONGO_DATABASE"] ?? "nebula_pagos"));
}
else
{
    builder.Services.AddSingleton<ICobroRepositorio, CobroRepositorioMemoria>();
}

// --- gRPC hacia Reservas (Java) ---
var reservasAddr = config["RESERVAS_GRPC_ADDR"] ?? "localhost:9090";
builder.Services.AddSingleton(_ =>
{
    var canal = Grpc.Net.Client.GrpcChannel.ForAddress($"http://{reservasAddr}");
    return new ReservaService.ReservaServiceClient(canal);
});
builder.Services.AddSingleton<IReservasClient, ReservasGrpcClient>();

// --- Kafka ---
var brokers = config["KAFKA_BROKERS"] ?? "localhost:9092";
builder.Services.AddSingleton<IEventoPublisher>(_ => new KafkaEventoPublisher(brokers));
builder.Services.AddHostedService<ConsumidorKafka>();

// --- Dominio ---
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPasarelaPago, PasarelaSimulada>();
builder.Services.AddSingleton<ProcesadorPagos>();
builder.Services.AddSingleton<EnrutadorMensajes>();

var app = builder.Build();
app.MapearEndpoints();
app.Run();
