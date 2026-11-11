using System.Diagnostics.CodeAnalysis;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;
using NebulaPagos.Dominio;
using NebulaPagos.Puertos;

namespace NebulaPagos.Infraestructura;

/// <summary>Persistencia de cobros en MongoDB (colección "cobros").</summary>
[ExcludeFromCodeCoverage(Justification = "Adaptador de infraestructura; requiere MongoDB real")]
public sealed class MongoCobroRepositorio : ICobroRepositorio
{
    private readonly IMongoCollection<Cobro> _coleccion;

    static MongoCobroRepositorio()
    {
        if (!BsonClassMap.IsClassMapRegistered(typeof(Cobro)))
        {
            BsonClassMap.RegisterClassMap<Cobro>(cm =>
            {
                cm.AutoMap();
                cm.MapIdMember(c => c.ReservaId);
                cm.MapMember(c => c.Estado).SetSerializer(new EnumSerializer<EstadoCobro>(BsonType.String));
                cm.SetIgnoreExtraElements(true);
            });
        }
    }

    public MongoCobroRepositorio(IMongoClient cliente, string baseDatos)
    {
        _coleccion = cliente.GetDatabase(baseDatos).GetCollection<Cobro>("cobros");
        _coleccion.Indexes.CreateOne(new CreateIndexModel<Cobro>(
            Builders<Cobro>.IndexKeys.Descending(c => c.CreadoEn)));
    }

    public async Task<Cobro?> ObtenerAsync(string reservaId, CancellationToken ct = default) =>
        await _coleccion.Find(c => c.ReservaId == reservaId).FirstOrDefaultAsync(ct);

    public Task GuardarAsync(Cobro cobro, CancellationToken ct = default) =>
        _coleccion.ReplaceOneAsync(c => c.ReservaId == cobro.ReservaId, cobro,
            new ReplaceOptions { IsUpsert = true }, ct);

    public async Task<IReadOnlyList<Cobro>> ListarAsync(int limite, CancellationToken ct = default) =>
        await _coleccion.Find(FilterDefinition<Cobro>.Empty)
            .SortByDescending(c => c.CreadoEn)
            .Limit(limite <= 0 ? 50 : limite)
            .ToListAsync(ct);
}
