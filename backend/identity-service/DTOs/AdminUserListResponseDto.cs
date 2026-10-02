namespace IdentityService.DTOs;

public class AdminUserListResponseDto
{
    public List<UserResponseDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public AdminUserMetricsDto Metrics { get; set; } = new();
}

