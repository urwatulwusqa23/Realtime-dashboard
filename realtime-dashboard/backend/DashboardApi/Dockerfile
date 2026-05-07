# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY DashboardApi.csproj ./
COPY NuGet.Config ./
RUN dotnet restore --configfile NuGet.Config /p:RestoreFallbackFolders=
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore --configfile NuGet.Config /p:RestoreFallbackFolders= /p:RestoreSources=https://api.nuget.org/v3/index.json

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "DashboardApi.dll"]
