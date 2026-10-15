using Moq;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

public sealed class ReservationLifecycleAndHistoryTests
{
    [Theory]
    [InlineData(ReservationStatus.Pending, ReservationStatus.Confirmed)]
    [InlineData(ReservationStatus.Pending, ReservationStatus.Cancelled)]
    [InlineData(ReservationStatus.Confirmed, ReservationStatus.Cancelled)]
    [InlineData(ReservationStatus.Confirmed, ReservationStatus.Completed)]
    public void LifecyclePolicy_AllowsDocumentedTransitions(string current, string target) =>
        Assert.True(ReservationStatusTransitionPolicy.IsAllowed(current, target));

    [Theory]
    [InlineData(ReservationStatus.Pending, ReservationStatus.Completed)]
    [InlineData(ReservationStatus.Cancelled, ReservationStatus.Pending)]
    [InlineData(ReservationStatus.Completed, ReservationStatus.Confirmed)]
    [InlineData(ReservationStatus.Confirmed, ReservationStatus.Pending)]
    public void LifecyclePolicy_RejectsInvalidOrTerminalTransitions(string current, string target) =>
        Assert.False(ReservationStatusTransitionPolicy.IsAllowed(current, target));

    [Fact]
    public async Task LifecycleService_DoesNotUpdateWhenTransitionIsRejected()
    {
        var repository = new Mock<IReservationRepository>();
        repository.Setup(r => r.GetStatusAsync(12, 44, It.IsAny<CancellationToken>())).ReturnsAsync(ReservationStatus.Completed);
        var service = new ReservationLifecycleService(repository.Object);

        var result = await service.ChangeStatusAsync(12, 44, ReservationStatus.Cancelled);

        Assert.Equal(ReservationStatusUpdateOutcome.Conflict, result);
        repository.Verify(r => r.UpdateStatusAsync(It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public void RepositoryHistoryQuery_UsesCustomerFilterStableOrderAndPagination()
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "backend"))) root = root.Parent;
        Assert.NotNull(root);
        var source = File.ReadAllText(Path.Combine(root!.FullName, "backend", "reservation-service", "Repositories", "ReservationRepository.cs"));
        Assert.Contains("WHERE r.CustomerId = @CustomerId", source);
        Assert.Contains("ORDER BY r.StartDateTime DESC, r.Id DESC", source);
        Assert.Contains("LIMIT @PageSize OFFSET @Offset", source);
        Assert.Contains("@CustomerId", source);
    }
}
