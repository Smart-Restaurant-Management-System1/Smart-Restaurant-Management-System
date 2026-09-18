
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class MenuItemsController : ControllerBase
{
    private readonly IMenuItemRepository _menuItemRepository;

    private static readonly string[] ValidCategories =
    {
        "Appetizer",
        "Main Course",
        "Dessert",
        "Beverage",
        "Side Dish"
    };

    private static readonly string[] ValidDietaryInfo =
    {
        "None",
        "Vegetarian",
        "Vegan",
        "Halal",
        "Gluten-Free"
    };

    public MenuItemsController(IMenuItemRepository menuItemRepository)
    {
        _menuItemRepository = menuItemRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isAvailable = null,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(category) &&
            !ValidCategories.Contains(
                category.Trim(),
                StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Invalid category." });
        }

        var menuItems = await _menuItemRepository.GetAllAsync(
            search,
            category,
            isAvailable,
            cancellationToken);

        return Ok(menuItems);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(
        int id,
        CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Menu item ID must be greater than zero."
            });
        }

        var menuItem = await _menuItemRepository.GetByIdAsync(
            id,
            cancellationToken);

        if (menuItem == null)
        {
            return NotFound(new
            {
                message = "Menu item not found."
            });
        }

        return Ok(menuItem);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] MenuItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateRequest(request);

        if (validationError != null)
        {
            return BadRequest(new
            {
                message = validationError
            });
        }

        var menuItem = new MenuItem
        {
            ItemName = request.ItemName.Trim(),
            Description = request.Description?.Trim(),
            Price = request.Price,
            Category = request.Category.Trim(),
            DietaryInfo = request.DietaryInfo.Trim(),
            ImageReference = request.ImageReference?.Trim(),
            IsAvailable = request.IsAvailable,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var menuItemId = await _menuItemRepository.CreateAsync(
            menuItem,
            cancellationToken);

        menuItem.MenuItemId = menuItemId;

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = menuItemId
            },
            menuItem);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] MenuItemRequest request,
        CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Menu item ID must be greater than zero."
            });
        }

        var validationError = ValidateRequest(request);

        if (validationError != null)
        {
            return BadRequest(new
            {
                message = validationError
            });
        }

        var existingMenuItem = await _menuItemRepository.GetByIdAsync(
            id,
            cancellationToken);

        if (existingMenuItem == null)
        {
            return NotFound(new
            {
                message = "Menu item not found."
            });
        }

        var menuItem = new MenuItem
        {
            MenuItemId = id,
            ItemName = request.ItemName.Trim(),
            Description = request.Description?.Trim(),
            Price = request.Price,
            Category = request.Category.Trim(),
            DietaryInfo = request.DietaryInfo.Trim(),
            ImageReference = request.ImageReference?.Trim(),
            IsAvailable = request.IsAvailable,
            CreatedAt = existingMenuItem.CreatedAt,
            UpdatedAt = DateTime.UtcNow
        };

        var updated = await _menuItemRepository.UpdateAsync(
            id,
            menuItem,
            cancellationToken);

        if (!updated)
        {
            return NotFound(new
            {
                message = "Menu item not found."
            });
        }

        return Ok(menuItem);
    }

    [HttpPatch("{id:int}/availability")]
    public async Task<IActionResult> UpdateAvailability(
        int id,
        [FromBody] AvailabilityRequest request,
        CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Menu item ID must be greater than zero."
            });
        }

        var existingMenuItem = await _menuItemRepository.GetByIdAsync(
            id,
            cancellationToken);

        if (existingMenuItem == null)
        {
            return NotFound(new
            {
                message = "Menu item not found."
            });
        }

        var updated = await _menuItemRepository.UpdateAvailabilityAsync(
            id,
            request.IsAvailable,
            cancellationToken);

        if (!updated)
        {
            return NotFound(new
            {
                message = "Menu item not found."
            });
        }

        return Ok(new
        {
            message = "Menu item availability updated successfully.",
            menuItemId = id,
            isAvailable = request.IsAvailable
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(
        int id,
        CancellationToken cancellationToken = default)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                message = "Menu item ID must be greater than zero."
            });
        }

        var existingMenuItem = await _menuItemRepository.GetByIdAsync(
            id,
            cancellationToken);

        if (existingMenuItem == null)
        {
            return NotFound(new
            {
                message = "Menu item not found."
            });
        }

        var deleted = await _menuItemRepository.DeleteAsync(
            id,
            cancellationToken);

        if (!deleted)
        {
            return NotFound(new
            {
                message = "Menu item could not be deleted."
            });
        }

        return Ok(new
        {
            message = "Menu item deleted successfully.",
            menuItemId = id
        });
    }

    private static string? ValidateRequest(MenuItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ItemName))
        {
            return "Item name is required.";
        }

        if (request.ItemName.Trim().Length > 150)
        {
            return "Item name cannot exceed 150 characters.";
        }

        if (request.Description?.Length > 1000)
        {
            return "Description cannot exceed 1000 characters.";
        }

        if (request.Price <= 0)
        {
            return "Price must be greater than zero.";
        }

        if (decimal.Round(request.Price, 2) != request.Price)
        {
            return "Price cannot contain more than two decimal places.";
        }

        if (string.IsNullOrWhiteSpace(request.Category) ||
            !ValidCategories.Contains(
                request.Category.Trim(),
                StringComparer.OrdinalIgnoreCase))
        {
            return "Invalid category.";
        }

        if (string.IsNullOrWhiteSpace(request.DietaryInfo) ||
            !ValidDietaryInfo.Contains(
                request.DietaryInfo.Trim(),
                StringComparer.OrdinalIgnoreCase))
        {
            return "Invalid dietary information.";
        }

        if (request.ImageReference?.Length > 500)
        {
            return "Image reference cannot exceed 500 characters.";
        }

        return null;
    }
}

public class MenuItemRequest
{
    public string ItemName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string Category { get; set; } = string.Empty;

    public string DietaryInfo { get; set; } = string.Empty;

    public string? ImageReference { get; set; }

    public bool IsAvailable { get; set; } = true;
}

public class AvailabilityRequest
{
    public bool IsAvailable { get; set; }
}