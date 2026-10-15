namespace ReservationService.DTOs;

public sealed record NotificationResponseDto(
    int Id,
    string EventType,
    string Title,
    string Message,
    string? ReferenceType,
    int? ReferenceId,
    string? ReferenceCode,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt
);

public sealed record NotificationListResponseDto(
    IReadOnlyList<NotificationResponseDto> Notifications,
    int TotalCount,
    int UnreadCount,
    int Page,
    int PageSize,
    int TotalPages
);

