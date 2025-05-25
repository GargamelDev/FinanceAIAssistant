# Use the official .NET SDK image as the build image
FROM mcr.microsoft.com/dotnet/sdk:9.0-preview AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["FinanceChatApi/FinanceChatApi.csproj", "FinanceChatApi/"]
RUN dotnet restore "FinanceChatApi/FinanceChatApi.csproj"

# Copy the remaining source code
COPY ["FinanceChatApi/", "FinanceChatApi/"]

# Build the application
RUN dotnet build "FinanceChatApi/FinanceChatApi.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "FinanceChatApi/FinanceChatApi.csproj" -c Release -o /app/publish

# Build the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0-preview AS final
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 80
EXPOSE 443
ENTRYPOINT ["dotnet", "FinanceChatApi.dll"] 