namespace IdentityService.Models;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";
    public const string KitchenStaff = "KitchenStaff";
}

public static class AppPolicies
{
    public const string RequireAdmin = "RequireAdmin";
    public const string RequireCustomer = "RequireCustomer";
    public const string RequireKitchenStaff = "RequireKitchenStaff";
    public const string RequireStaff = "RequireStaff"; // Admin or KitchenStaff
}
