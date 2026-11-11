using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Confluent.Kafka;
using NebulaPagos.Dominio;
using NebulaPagos.Puertos;

namespace NebulaPagos.Infraestructura;

/// <summary>Publica eventos JSON en Kafka.</summary>
[ExcludeFromCodeCoverage(Justification = "Adaptador de infraestructura; requiere broker Kafka")]
public sealed class KafkaEventoPublisher : IEventoPublisher, IDisposable
{
    private readonly IProducer<string, string> _producer;

    public KafkaEventoPublisher(string brokers)
    {
        _producer = new ProducerBuilder<string, string>(new ProducerConfig
        {
            BootstrapServers = brokers,
            Acks = Acks.All,
            EnableIdempotence = true,
        }).Build();
    }

    public async Task PublicarAsync(string topico, string clave, object evento, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(evento, evento.GetType(), EnrutadorMensajes.Json);
        await _producer.ProduceAsync(topico, new Message<string, string> { Key = clave, Value = json }, ct);
    }

    public void Dispose()
    {
        _producer.Flush(TimeSpan.FromSeconds(5));
        _producer.Dispose();
    }
}

/// <summary>Consume "reservas.creadas" (Java) y "pagos.solicitados" (BFF Python).</summary>
[ExcludeFromCodeCoverage(Justification = "Bucle de consumo; la lógica vive en EnrutadorMensajes")]
public sealed class ConsumidorKafka : BackgroundService
{
    private readonly EnrutadorMensajes _enrutador;
    private readonly ILogger<ConsumidorKafka> _log;
    private readonly string _brokers;

    public ConsumidorKafka(EnrutadorMensajes enrutador, ILogger<ConsumidorKafka> log, IConfiguration config)
    {
        _enrutador = enrutador;
        _log = log;
        _brokers = config["KAFKA_BROKERS"] ?? "localhost:9092";
    }

    protected override Task ExecuteAsync(CancellationToken ct) => Task.Run(() => ConsumirAsync(ct), ct);

    private async Task ConsumirAsync(CancellationToken ct)
    {
        var config = new ConsumerConfig
        {
            BootstrapServers = _brokers,
            GroupId = "nebula-pagos",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
        };
        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        consumer.Subscribe(new[] { Topicos.ReservasCreadas, Topicos.PagosSolicitados });
        _log.LogInformation("Consumiendo Kafka en {Brokers}", _brokers);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                var resultado = consumer.Consume(ct);
                await _enrutador.ManejarAsync(resultado.Topic, resultado.Message.Value, ct);
                consumer.Commit(resultado);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (ConsumeException ex)
            {
                _log.LogWarning(ex, "Error consumiendo Kafka: {Razon}", ex.Error.Reason);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Error procesando mensaje; se reintentará en 2 s");
                await Task.Delay(TimeSpan.FromSeconds(2), ct);
            }
        }
        consumer.Close();
    }
}
