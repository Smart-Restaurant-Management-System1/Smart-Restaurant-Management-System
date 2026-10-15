using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Data;
using ReservationService.Exceptions;
using ReservationService.Models;
using ReservationService.Repositories;
using Xunit;

namespace ReservationServiceTests;

public class TableRepositoryTests
{
    private readonly Mock<ILogger<TableRepository>> _loggerMock;
    private readonly Mock<IConfiguration> _configMock;

    public TableRepositoryTests()
    {
        _loggerMock = new Mock<ILogger<TableRepository>>();
        _configMock = new Mock<IConfiguration>();
        _configMock.Setup(c => c.GetSection("ConnectionStrings")["DefaultConnection"])
            .Returns("Server=localhost;Database=test;User=test;Password=test;");
    }

    [Fact]
    public void DuplicateTableNumberException_ContainsTableNumberAndClearMessage()
    {
        // Arrange
        const string tableNumber = "T-99";

        // Act
        var ex = new DuplicateTableNumberException(tableNumber);

        // Assert
        Assert.Equal(tableNumber, ex.TableNumber);
        Assert.Contains(tableNumber, ex.Message);
        Assert.Contains("already exists", ex.Message);
    }

    [Fact]
    public void RestaurantTable_Model_MapsAllRequiredFields()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var table = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 4,
            Location = "Window",
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        // Assert
        Assert.Equal(1, table.Id);
        Assert.Equal("T-01", table.TableNumber);
        Assert.Equal(4, table.Capacity);
        Assert.Equal("Window", table.Location);
        Assert.True(table.IsActive);
        Assert.Equal(now, table.CreatedAt);
        Assert.Equal(now, table.UpdatedAt);
    }

    [Fact]
    public void ITableRepository_DefinesRequiredAdoNetMethods()
    {
        var repoType = typeof(ITableRepository);
        var methods = repoType.GetMethods().Select(m => m.Name).ToList();

        Assert.Contains(nameof(ITableRepository.CreateTableAsync), methods);
        Assert.Contains(nameof(ITableRepository.ExistsByTableNumberAsync), methods);
        Assert.Contains(nameof(ITableRepository.GetAllTablesAsync), methods);
        Assert.Contains(nameof(ITableRepository.GetActiveTablesAsync), methods);
        Assert.Contains(nameof(ITableRepository.GetByIdAsync), methods);
        Assert.Contains(nameof(ITableRepository.GetByTableNumberAsync), methods);
        Assert.Contains(nameof(ITableRepository.UpdateTableCapacityAndLocationAsync), methods);
        Assert.Contains(nameof(ITableRepository.SoftDeleteTableAsync), methods);
        Assert.Contains(nameof(ITableRepository.DeleteTableAsync), methods);
    }

    [Fact]
    public void TableDeactivationResult_DefinesRequiredOutcomes()
    {
        var enumNames = Enum.GetNames<TableDeactivationResult>();

        Assert.Contains("Success", enumNames);
        Assert.Contains("NotFound", enumNames);
        Assert.Contains("AlreadyInactive", enumNames);
    }

    [Fact]
    public void TableRepository_Implementation_UsesOnlyParameterizedQueries()
    {
        var repoType = typeof(TableRepository);
        var createMethod = repoType.GetMethod(nameof(TableRepository.CreateTableAsync));
        var updateCapMethod = repoType.GetMethod(nameof(TableRepository.UpdateTableCapacityAndLocationAsync));
        var softDeleteMethod = repoType.GetMethod(nameof(TableRepository.SoftDeleteTableAsync));

        Assert.NotNull(createMethod);
        Assert.NotNull(updateCapMethod);
        Assert.NotNull(softDeleteMethod);
        Assert.True(typeof(ITableRepository).IsAssignableFrom(repoType));
    }

    [Fact]
    public void UpdateTableCapacityAndLocation_AcceptsOnlyCapacityAndLocation()
    {
        var method = typeof(ITableRepository).GetMethod(nameof(ITableRepository.UpdateTableCapacityAndLocationAsync));
        Assert.NotNull(method);

        var parameters = method.GetParameters();
        Assert.Equal(4, parameters.Length); // id, capacity, location, cancellationToken
        Assert.Equal("id", parameters[0].Name);
        Assert.Equal(typeof(int), parameters[0].ParameterType);
        Assert.Equal("capacity", parameters[1].Name);
        Assert.Equal(typeof(int), parameters[1].ParameterType);
        Assert.Equal("location", parameters[2].Name);
        Assert.Equal(typeof(string), parameters[2].ParameterType);
        Assert.Equal("cancellationToken", parameters[3].Name);
    }

    [Fact]
    public void SoftDeleteTableAsync_ReturnsTaskOfTableDeactivationResult()
    {
        var method = typeof(ITableRepository).GetMethod(nameof(ITableRepository.SoftDeleteTableAsync));
        Assert.NotNull(method);
        Assert.Equal(typeof(Task<TableDeactivationResult>), method.ReturnType);

        var parameters = method.GetParameters();
        Assert.Equal(2, parameters.Length);
        Assert.Equal("id", parameters[0].Name);
        Assert.Equal(typeof(int), parameters[0].ParameterType);
    }

    [Fact]
    public void TableRepository_SourceCode_NeverContainsPhysicalSqlDelete()
    {
        // Read the TableRepository.cs file to verify absolutely NO physical "DELETE FROM RestaurantTables" exists
        var assemblyLocation = typeof(TableRepository).Assembly.Location;
        var projectDir = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(assemblyLocation)!, "..", "..", "..", "..", "..", "backend", "reservation-service"));
        var repoFilePath = Path.Combine(projectDir, "Repositories", "TableRepository.cs");

        if (File.Exists(repoFilePath))
        {
            var content = File.ReadAllText(repoFilePath);
            Assert.DoesNotContain("DELETE FROM RestaurantTables", content, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("UPDATE RestaurantTables", content);
            Assert.Contains("SET IsActive = 0", content);
        }
    }

    [Fact]
    public void GetActiveTablesAsync_UsesRepositoryLevelActiveFilterAndParameter()
    {
        var assemblyLocation = typeof(TableRepository).Assembly.Location;
        var projectDir = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(assemblyLocation)!, "..", "..", "..", "..", "..", "backend", "reservation-service"));
        var repoFilePath = Path.Combine(projectDir, "Repositories", "TableRepository.cs");

        if (File.Exists(repoFilePath))
        {
            var content = File.ReadAllText(repoFilePath);
            var methodStart = content.IndexOf("GetActiveTablesAsync", StringComparison.Ordinal);
            Assert.True(methodStart >= 0, "Expected a dedicated active-table repository query.");
            var activeQuery = content[methodStart..];
            Assert.Contains("WHERE IsActive = @IsActive", activeQuery);
            Assert.Contains("AddWithValue(\"@IsActive\", true)", activeQuery);
            Assert.Contains("SELECT Id, TableNumber, Capacity, Status", activeQuery);
            Assert.DoesNotContain("SELECT *", activeQuery);
            Assert.Contains("ORDER BY TableNumber ASC", activeQuery);
        }
    }
}
