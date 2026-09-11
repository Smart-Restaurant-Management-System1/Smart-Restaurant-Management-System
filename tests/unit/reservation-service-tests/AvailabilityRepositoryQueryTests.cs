using Xunit;

namespace ReservationServiceTests;

public sealed class AvailabilityRepositoryQueryTests
{
    [Fact]
    public void AvailabilityQuery_UsesDatabaseLevelCapacityActiveAndStrictOverlapFilters()
    {
        var assemblyLocation = typeof(ReservationService.Repositories.AvailabilityRepository).Assembly.Location;
        var projectDirectory = Path.GetFullPath(Path.Combine(Path.GetDirectoryName(assemblyLocation)!, "..", "..", "..", "..", "..", "..", "backend", "reservation-service"));
        var source = File.ReadAllText(Path.Combine(projectDirectory, "Repositories", "AvailabilityRepository.cs"));

        Assert.Contains("t.IsActive = @IsActive", source);
        Assert.Contains("t.Capacity >= @GuestCount", source);
        Assert.Contains("NOT EXISTS", source);
        Assert.Contains("r.Status IN (@PendingStatus, @ConfirmedStatus)", source);
        Assert.Contains("r.StartDateTime < @RequestedEnd", source);
        Assert.Contains("r.EndDateTime > @RequestedStart", source);
        Assert.Contains("ORDER BY t.Capacity ASC, t.TableNumber ASC", source);
    }
}
