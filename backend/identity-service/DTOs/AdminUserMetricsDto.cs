namespace IdentityService.DTOs;

public class AdminUserMetricsDto
{
    public int TotalUsers { get; set; }
    public int TotalCustomers { get; set; }
    public int TotalStaff { get; set; }
    public int TotalActive { get; set; }
    public int TotalBlocked { get; set; }
    public int TotalInactive { get; set; }
}

