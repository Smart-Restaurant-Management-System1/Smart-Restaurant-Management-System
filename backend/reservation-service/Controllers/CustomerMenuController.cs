using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservationService.Models;
using ReservationService.Repositories;

namespace ReservationService.Controllers;

[ApiController]
[Route("api/customer-menu")]
[Authorize(Roles = AppRoles.Customer)]
public class CustomerMenuController : ControllerBase
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

    public CustomerMenuController(IMenuItemRepository menuItemRepository)
    {
        _menuItemRepository = menuItemRepository;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomerMenu(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? dietaryInfo = null,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(category) &&
            !ValidCategories.Contains(
                category.Trim(),
                StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Invalid category." });
        }

        if (!string.IsNullOrWhiteSpace(dietaryInfo) &&
            !ValidDietaryInfo.Contains(
                dietaryInfo.Trim(),
                StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "Invalid dietary preference."
            });
        }

        var menuItems = await _menuItemRepository.GetAllAsync(
            search,
            category,
            dietaryInfo,
            true,
            cancellationToken);

        return Ok(menuItems);
    }
}
