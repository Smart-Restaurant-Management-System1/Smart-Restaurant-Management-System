using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.DTOs;
using ReservationService.Exceptions;
using ReservationService.Models;
using ReservationService.Repositories;
using Xunit;

namespace ReservationServiceTests;

public class TablesControllerTests
{
    private readonly Mock<ITableRepository> _mockRepo;
    private readonly Mock<ILogger<TablesController>> _mockLogger;
    private readonly TablesController _controller;

    public TablesControllerTests()
    {
        _mockRepo = new Mock<ITableRepository>();
        _mockLogger = new Mock<ILogger<TablesController>>();
        _controller = new TablesController(_mockRepo.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task CreateTable_ValidAdminRequest_Returns201Created()
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = "T-01",
            Capacity = 4,
            Location = "Window",
            Status = "Available"
        };

        _mockRepo.Setup(r => r.CreateTableAsync(It.IsAny<RestaurantTable>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RestaurantTable
            {
                Id = 1,
                TableNumber = "T-01",
                Capacity = 4,
                Location = "Window",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(201, createdResult.StatusCode);

        var dto = Assert.IsType<TableResponseDto>(createdResult.Value);
        Assert.Equal(1, dto.Id);
        Assert.Equal("T-01", dto.TableNumber);
        Assert.Equal(4, dto.Capacity);
        Assert.Equal("Window", dto.Location);
        Assert.Equal("Available", dto.Status);
    }

    [Fact]
    public async Task CreateTable_InactiveStatus_Returns201WithInactiveStatus()
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = "T-02",
            Capacity = 6,
            Location = "Patio",
            Status = "Inactive"
        };

        _mockRepo.Setup(r => r.CreateTableAsync(It.Is<RestaurantTable>(t => !t.IsActive), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RestaurantTable
            {
                Id = 2,
                TableNumber = "T-02",
                Capacity = 6,
                Location = "Patio",
                IsActive = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var dto = Assert.IsType<TableResponseDto>(createdResult.Value);
        Assert.Equal("Inactive", dto.Status);
    }

    [Fact]
    public async Task CreateTable_DuplicateTableNumber_Returns400BadRequest()
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = "T-01",
            Capacity = 4,
            Location = "Window"
        };

        _mockRepo.Setup(r => r.CreateTableAsync(It.IsAny<RestaurantTable>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DuplicateTableNumberException("Table number 'T-01' already exists."));

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequestResult.StatusCode);
        Assert.NotNull(badRequestResult.Value);

        var messageProp = badRequestResult.Value.GetType().GetProperty("message");
        Assert.NotNull(messageProp);
        var message = messageProp.GetValue(badRequestResult.Value)?.ToString();
        Assert.Contains("already exists", message);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateTable_MissingTableNumber_Returns400BadRequest(string? tableNumber)
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = tableNumber!,
            Capacity = 4,
            Location = "Main Dining"
        };

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequestResult.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-10)]
    public async Task CreateTable_ZeroOrNegativeCapacity_Returns400BadRequest(int capacity)
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = "T-10",
            Capacity = capacity,
            Location = "Bar Area"
        };

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequestResult.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CreateTable_MissingLocation_Returns400BadRequest(string? location)
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = "T-10",
            Capacity = 4,
            Location = location!
        };

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequestResult.StatusCode);
    }

    [Fact]
    public async Task CreateTable_InvalidStatus_Returns400BadRequest()
    {
        // Arrange
        var request = new CreateTableRequestDto
        {
            TableNumber = "T-10",
            Capacity = 4,
            Location = "Patio",
            Status = "InvalidStatus"
        };

        // Act
        var result = await _controller.CreateTable(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequestResult.StatusCode);
    }

    [Fact]
    public void CreateTable_HasAuthorizeAdminAttribute()
    {
        // Arrange
        var method = typeof(TablesController).GetMethod(nameof(TablesController.CreateTable));
        Assert.NotNull(method);

        // Act
        var authorizeAttribute = method.GetCustomAttribute<AuthorizeAttribute>();

        // Assert
        Assert.NotNull(authorizeAttribute);
        Assert.Equal(AppRoles.Admin, authorizeAttribute.Roles);
    }

    [Fact]
    public async Task GetTables_ReturnsMappedTableResponseDtos()
    {
        // Arrange
        var tables = new List<RestaurantTable>
        {
            new() { Id = 1, TableNumber = "T-01", Capacity = 2, Location = "Window", IsActive = true, CreatedAt = DateTime.UtcNow },
            new() { Id = 2, TableNumber = "T-02", Capacity = 4, Location = "Main Dining", IsActive = false, CreatedAt = DateTime.UtcNow }
        };

        _mockRepo.Setup(r => r.GetAllTablesAsync(null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(tables);

        // Act
        var result = await _controller.GetTables();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dtos = Assert.IsAssignableFrom<IEnumerable<TableResponseDto>>(okResult.Value).ToList();
        Assert.Equal(2, dtos.Count);
        Assert.Equal("Available", dtos[0].Status);
        Assert.Equal("Inactive", dtos[1].Status);
    }

    [Fact]
    public async Task GetTableById_WhenExists_ReturnsOkWithDto()
    {
        // Arrange
        var table = new RestaurantTable
        {
            Id = 5,
            TableNumber = "T-05",
            Capacity = 8,
            Location = "Private Dining",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _mockRepo.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(table);

        // Act
        var result = await _controller.GetTableById(5);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<TableResponseDto>(okResult.Value);
        Assert.Equal(5, dto.Id);
        Assert.Equal("T-05", dto.TableNumber);
    }

    [Fact]
    public void GetTables_HasAuthorizeAdminAttribute()
    {
        var method = typeof(TablesController).GetMethod(nameof(TablesController.GetTables));
        Assert.NotNull(method);
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(AppRoles.Admin, attr.Roles);
    }

    [Fact]
    public void GetTableById_HasAuthorizeAdminAttribute()
    {
        var method = typeof(TablesController).GetMethod(nameof(TablesController.GetTableById));
        Assert.NotNull(method);
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(AppRoles.Admin, attr.Roles);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetTableById_InvalidId_Returns400BadRequest(int id)
    {
        var result = await _controller.GetTableById(id);
        var badReq = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badReq.StatusCode);
    }

    [Fact]
    public async Task GetTableById_WhenNotFound_Returns404NotFound()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((RestaurantTable?)null);

        // Act
        var result = await _controller.GetTableById(99);

        // Assert
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFoundResult.StatusCode);
    }

    [Fact]
    public async Task UpdateTable_ValidRequest_UpdatesCapacityAndLocation_Returns200Ok()
    {
        // Arrange
        var request = new UpdateTableRequestDto
        {
            Capacity = 6,
            Location = "Main Dining"
        };

        var existing = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 2,
            Location = "Window",
            IsActive = true
        };

        var updated = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 6,
            Location = "Main Dining",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _mockRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _mockRepo.Setup(r => r.UpdateTableCapacityAndLocationAsync(1, 6, "Main Dining", It.IsAny<CancellationToken>()))
            .ReturnsAsync(updated);

        // Act
        var result = await _controller.UpdateTable(1, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
        var dto = Assert.IsType<TableResponseDto>(okResult.Value);
        Assert.Equal("T-01", dto.TableNumber);
        Assert.Equal(6, dto.Capacity);
        Assert.Equal("Main Dining", dto.Location);
    }

    [Fact]
    public async Task UpdateTable_WhenNotFound_Returns404NotFound()
    {
        // Arrange
        var request = new UpdateTableRequestDto
        {
            Capacity = 4,
            Location = "Patio"
        };

        _mockRepo.Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((RestaurantTable?)null);

        // Act
        var result = await _controller.UpdateTable(99, request);

        // Assert
        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFound.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task UpdateTable_InvalidId_Returns400BadRequest(int id)
    {
        var request = new UpdateTableRequestDto { Capacity = 4, Location = "Patio" };
        var result = await _controller.UpdateTable(id, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequest.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task UpdateTable_InvalidCapacity_Returns400BadRequest(int capacity)
    {
        var request = new UpdateTableRequestDto { Capacity = capacity, Location = "Patio" };
        var result = await _controller.UpdateTable(1, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequest.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task UpdateTable_MissingLocation_Returns400BadRequest(string? location)
    {
        var request = new UpdateTableRequestDto { Capacity = 4, Location = location! };
        var result = await _controller.UpdateTable(1, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequest.StatusCode);
    }

    [Fact]
    public void UpdateTable_HasAuthorizeAdminAttribute()
    {
        var method = typeof(TablesController).GetMethod(nameof(TablesController.UpdateTable));
        Assert.NotNull(method);
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(AppRoles.Admin, attr.Roles);
    }

    [Fact]
    public async Task DeleteTable_WhenExists_CallsSoftDelete_Returns204NoContent()
    {
        // Arrange
        var existing = new RestaurantTable { Id = 1, TableNumber = "T-01", IsActive = true };
        _mockRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _mockRepo.Setup(r => r.SoftDeleteTableAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(TableDeactivationResult.Success);

        // Act
        var result = await _controller.DeleteTable(1);

        // Assert
        var noContent = Assert.IsType<NoContentResult>(result);
        Assert.Equal(204, noContent.StatusCode);
    }

    [Fact]
    public async Task DeleteTable_WhenAlreadyInactive_Returns204NoContent()
    {
        // Arrange
        var existing = new RestaurantTable { Id = 2, TableNumber = "T-02", IsActive = false };
        _mockRepo.Setup(r => r.GetByIdAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _mockRepo.Setup(r => r.SoftDeleteTableAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(TableDeactivationResult.AlreadyInactive);

        // Act
        var result = await _controller.DeleteTable(2);

        // Assert
        var noContent = Assert.IsType<NoContentResult>(result);
        Assert.Equal(204, noContent.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteTable_InvalidId_Returns400BadRequest(int id)
    {
        var result = await _controller.DeleteTable(id);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequest.StatusCode);
    }

    [Fact]
    public async Task DeleteTable_WhenNotFound_Returns404NotFound()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((RestaurantTable?)null);

        // Act
        var result = await _controller.DeleteTable(99);

        // Assert
        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFound.StatusCode);
    }

    [Fact]
    public async Task UpdateTable_WhenTableIsOccupied_AndTargetStatusNotAvailable_Returns400BadRequest()
    {
        // Arrange
        var request = new UpdateTableRequestDto
        {
            TableNumber = "T-01",
            Capacity = 8,
            Location = "Window",
            Status = "Occupied"
        };

        var existing = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 4,
            Location = "Window",
            Status = "Occupied",
            IsActive = true
        };

        _mockRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        // Act
        var result = await _controller.UpdateTable(1, request);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequest.StatusCode);
    }

    [Fact]
    public async Task UpdateTable_WhenTableIsOccupied_AndTargetStatusAvailable_Returns200Ok()
    {
        // Arrange
        var request = new UpdateTableRequestDto
        {
            TableNumber = "T-01",
            Capacity = 6,
            Location = "Window",
            Status = "Available"
        };

        var existing = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 4,
            Location = "Window",
            Status = "Occupied",
            IsActive = true
        };

        var updated = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 6,
            Location = "Window",
            Status = "Available",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _mockRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _mockRepo.Setup(r => r.UpdateTableAsync(It.IsAny<RestaurantTable>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(updated);

        // Act
        var result = await _controller.UpdateTable(1, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
        var dto = Assert.IsType<TableResponseDto>(okResult.Value);
        Assert.Equal("Available", dto.Status);
    }

    [Fact]
    public async Task DeleteTable_WhenTableIsOccupied_Returns400BadRequest()
    {
        // Arrange
        var existing = new RestaurantTable
        {
            Id = 1,
            TableNumber = "T-01",
            Capacity = 4,
            Location = "Window",
            Status = "Occupied"
        };

        _mockRepo.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        // Act
        var result = await _controller.DeleteTable(1);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal(400, badRequest.StatusCode);
    }

    [Fact]
    public void DeleteTable_HasAuthorizeAdminAttribute()
    {
        var method = typeof(TablesController).GetMethod(nameof(TablesController.DeleteTable));
        Assert.NotNull(method);
        var attr = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(attr);
        Assert.Equal(AppRoles.Admin, attr.Roles);
    }

    [Fact]
    public void TablesEndpoints_DocumentAdminRoleAndResponses()
    {
        var methods = new[]
        {
            typeof(TablesController).GetMethod(nameof(TablesController.GetTables)),
            typeof(TablesController).GetMethod(nameof(TablesController.GetTableById)),
            typeof(TablesController).GetMethod(nameof(TablesController.CreateTable)),
            typeof(TablesController).GetMethod(nameof(TablesController.UpdateTable)),
            typeof(TablesController).GetMethod(nameof(TablesController.DeleteTable))
        };

        foreach (var m in methods)
        {
            Assert.NotNull(m);
            var auth = m.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(auth);
            Assert.Equal(AppRoles.Admin, auth.Roles);

            var produces = m.GetCustomAttributes<ProducesResponseTypeAttribute>().ToList();
            Assert.Contains(produces, p => p.StatusCode == 401);
            Assert.Contains(produces, p => p.StatusCode == 403);
        }
    }
}
