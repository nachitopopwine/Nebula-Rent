# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/NebulaPagos/NebulaPagos.csproj src/NebulaPagos/
RUN dotnet restore src/NebulaPagos/NebulaPagos.csproj
COPY src ./src
RUN dotnet publish src/NebulaPagos/NebulaPagos.csproj -c Release -o /out --no-restore

# ---------- runtime ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
ENV PORT=8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "NebulaPagos.dll"]
