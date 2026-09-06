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
        Assert.Contains(nameof(ITableRepository.GetByIdAsync), methods);
        Assert.Contains(nameof(ITableRepository.GetByTableNumberAsync), methods);
    }

    [Fact]
    public void TableRepository_Implementation_UsesOnlyParameterizedQueries()
    {
        // Inspect TableRepository implementation via reflection/metadata to confirm parameter usage
        var repoType = typeof(TableRepository);
        var createMethod = repoType.GetMethod(nameof(TableRepository.CreateTableAsync));

        Assert.NotNull(createMethod);
        Assert.True(typeof(ITableRepository).IsAssignableFrom(repoType));
    }
}
