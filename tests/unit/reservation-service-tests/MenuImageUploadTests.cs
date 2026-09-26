using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using ReservationService.Controllers;
using ReservationService.Exceptions;
using ReservationService.Models;
using ReservationService.Repositories;
using ReservationService.Services;
using Xunit;

namespace ReservationServiceTests;

// Regression tests for the Azure menu-image upload bug: with Blob configured the service must upload to Blob and return
// the full https blob URL; outside Development it must never claim success with an ephemeral local path.
// NOTE: these are unit tests with a fake Blob uploader. They do not contact Azure.

internal sealed class FakeBlobUploader : IBlobImageUploader
{
    public const string Account = "stcinnamonbistrodev1848";
    public List<(string ConnectionString, string Container, string BlobName, string ContentType, long Length)> Calls { get; } = new();
    public Exception? ThrowOnUpload { get; set; }

    public async Task<Uri> UploadAsync(string connectionString, string containerName, string blobName, string contentType, Stream content, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (ThrowOnUpload is not null) throw ThrowOnUpload;
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        Calls.Add((connectionString, containerName, blobName, contentType, buffer.Length));
        return new Uri($"https://{Account}.blob.core.windows.net/{containerName}/{blobName}");
    }
}

internal sealed class ListLogger<T> : ILogger<T>
{
    public List<string> Messages { get; } = new();
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
    public bool IsEnabled(LogLevel logLevel) => true;
    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        Messages.Add(formatter(state, exception));
        if (exception is not null) Messages.Add(exception.ToString());   // what a full-exception log would contain
    }
}

public sealed class ImageStorageServiceTests : IDisposable
{
    private const string Secret = "DefaultEndpointsProtocol=https;AccountName=stcinnamonbistrodev1848;AccountKey=SUPER-SECRET-KEY-VALUE==;EndpointSuffix=core.windows.net";
    private readonly string _webRoot = Path.Combine(Path.GetTempPath(), "img-test-" + Guid.NewGuid().ToString("N"));
    private readonly FakeBlobUploader _uploader = new();
    private readonly ListLogger<ImageStorageService> _logger = new();

    public ImageStorageServiceTests() => Directory.CreateDirectory(_webRoot);
    public void Dispose() { try { Directory.Delete(_webRoot, true); } catch { /* best effort */ } }

    private ImageStorageService Create(string environment, Dictionary<string, string?>? config = null)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(config ?? new()).Build();
        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.EnvironmentName).Returns(environment);
        env.SetupGet(e => e.WebRootPath).Returns(_webRoot);
        return new ImageStorageService(configuration, env.Object, _logger, _uploader);
    }

    private static IFormFile File(string name = "photo.jpg", string contentType = "image/jpeg", int size = 16) =>
        new FormFile(new MemoryStream(Encoding.ASCII.GetBytes(new string('x', size))), 0, size, "file", name)
        { Headers = new HeaderDictionary(), ContentType = contentType };

    private string[] LocalFiles() =>
        Directory.Exists(Path.Combine(_webRoot, "uploads")) ? Directory.GetFiles(Path.Combine(_webRoot, "uploads"), "*", SearchOption.AllDirectories) : Array.Empty<string>();

    private static Dictionary<string, string?> Configured(string key = "AZURE_STORAGE_CONNECTION_STRING") =>
        new() { [key] = Secret, ["Storage:BlobContainerName"] = "menu-images" };

    [Fact]
    public async Task Configured_UsesBlobStorage_AndReturnsFullHttpsBlobUrl()
    {
        var url = await Create("Production", Configured()).SaveImageAsync(File());

        Assert.Matches(@"^https://stcinnamonbistrodev1848\.blob\.core\.windows\.net/menu-images/dish_[0-9a-f]{32}\.jpg$", url);
        var call = Assert.Single(_uploader.Calls);
        Assert.Equal("menu-images", call.Container);
        Assert.Equal("image/jpeg", call.ContentType);
        Assert.Equal(16, call.Length);
        Assert.Empty(LocalFiles());               // nothing written to the container's disk
    }

    [Theory]
    [InlineData("AZURE_STORAGE_CONNECTION_STRING")]
    [InlineData("Storage:AzureBlobConnectionString")]
    [InlineData("Azure:StorageConnectionString")]
    public async Task EveryRecognisedConfigurationKey_SelectsBlobStorage(string key)
    {
        var url = await Create("Production", Configured(key)).SaveImageAsync(File());
        Assert.StartsWith("https://", url);
        Assert.Single(_uploader.Calls);
    }

    [Fact]
    public async Task EmptyHigherPriorityKey_DoesNotShadowTheEnvironmentVariable()
    {
        // Regression: "??" treats an empty string as a value, which used to hide the real setting.
        var config = Configured();
        config["Storage:AzureBlobConnectionString"] = "";
        config["Azure:StorageConnectionString"] = "   ";
        var url = await Create("Production", config).SaveImageAsync(File());
        Assert.StartsWith("https://", url);
        Assert.Single(_uploader.Calls);
    }

    [Fact]
    public async Task ContainerName_DefaultsToMenuImages_WhenNotConfigured()
    {
        await Create("Production", new() { ["AZURE_STORAGE_CONNECTION_STRING"] = Secret }).SaveImageAsync(File());
        Assert.Equal("menu-images", Assert.Single(_uploader.Calls).Container);
    }

    [Theory]
    [InlineData("a.png", "image/png")]
    [InlineData("a.webp", "image/webp")]
    [InlineData("a.JPEG", "image/jpeg")]
    public async Task StoredContentType_IsDerivedFromTheExtension_NotTheClient(string name, string expected)
    {
        var url = await Create("Production", Configured()).SaveImageAsync(File(name, contentType: "application/whatever"));
        Assert.Equal(expected, Assert.Single(_uploader.Calls).ContentType);
        Assert.EndsWith(Path.GetExtension(name).ToLowerInvariant(), url);
    }

    [Fact]
    public async Task Production_MissingConfiguration_DoesNotSilentlyUseLocalStorage()
    {
        var ex = await Assert.ThrowsAsync<ImageStorageUnavailableException>(() => Create("Production").SaveImageAsync(File()));

        Assert.Empty(LocalFiles());
        Assert.Empty(_uploader.Calls);
        Assert.Equal("Image storage is not configured.", ex.Message);
        Assert.Contains(_logger.Messages, m => m.Contains("not configured"));
    }

    [Theory]
    [InlineData("")]        // the state observed in the running Azure container: variable present but EMPTY
    [InlineData("   ")]
    [InlineData("\t\r\n")]
    public async Task Production_EmptyOrBlankConnectionString_IsTreatedAsMissing_AndReturns503_NotALocalPath(string blank)
    {
        var config = new Dictionary<string, string?>
        {
            ["AZURE_STORAGE_CONNECTION_STRING"] = blank,
            ["Storage__BlobContainerName"] = "",
            ["Storage:BlobContainerName"] = ""
        };

        var ex = await Assert.ThrowsAsync<ImageStorageUnavailableException>(() => Create("Production", config).SaveImageAsync(File()));

        Assert.Equal("Image storage is not configured.", ex.Message);
        Assert.Empty(LocalFiles());
        Assert.Empty(_uploader.Calls);
    }

    [Fact]
    public async Task Production_BlobUploadFails_ThrowsControlledError_AndNeverFallsBackToLocalDisk()
    {
        _uploader.ThrowOnUpload = new InvalidOperationException("boom " + Secret);   // hostile message that contains the secret

        var ex = await Assert.ThrowsAsync<ImageStorageUnavailableException>(() => Create("Production", Configured()).SaveImageAsync(File()));

        Assert.Empty(LocalFiles());
        Assert.DoesNotContain("SUPER-SECRET", ex.Message);
        Assert.Contains(_logger.Messages, m => m.Contains("InvalidOperationException") && m.Contains("disabled outside Development"));
    }

    [Fact]
    public async Task Development_MissingConfiguration_MayUseLocalFallback()
    {
        var url = await Create("Development").SaveImageAsync(File());

        Assert.Matches(@"^/uploads/menu-images/dish_[0-9a-f]{32}\.jpg$", url);
        Assert.Single(LocalFiles());
        Assert.Empty(_uploader.Calls);
    }

    [Fact]
    public async Task Development_BlobUploadFails_FallsBackToLocalStorage()
    {
        _uploader.ThrowOnUpload = new InvalidOperationException("boom");
        var url = await Create("Development", Configured()).SaveImageAsync(File());

        Assert.StartsWith("/uploads/menu-images/", url);
        Assert.Single(LocalFiles());
    }

    [Fact]
    public async Task Logs_NeverContainTheConnectionString_OnSuccessOrFailure()
    {
        await Create("Production", Configured()).SaveImageAsync(File());
        _uploader.ThrowOnUpload = new InvalidOperationException("failure with " + Secret);
        await Assert.ThrowsAsync<ImageStorageUnavailableException>(() => Create("Production", Configured()).SaveImageAsync(File()));

        Assert.NotEmpty(_logger.Messages);
        Assert.All(_logger.Messages, m => { Assert.DoesNotContain("SUPER-SECRET", m); Assert.DoesNotContain("AccountKey", m); });
    }

    [Fact]
    public async Task Cancellation_IsNotConvertedIntoAStorageUnavailableError()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Create("Production", Configured()).SaveImageAsync(File(), cts.Token));
    }

    [Fact]
    public void IsBlobConfigured_ReportsPresenceOnly()
    {
        IConfiguration Build(Dictionary<string, string?> d) => new ConfigurationBuilder().AddInMemoryCollection(d).Build();
        Assert.True(ImageStorageService.IsBlobConfigured(Build(Configured())));
        Assert.False(ImageStorageService.IsBlobConfigured(Build(new())));
        Assert.False(ImageStorageService.IsBlobConfigured(Build(new() { ["AZURE_STORAGE_CONNECTION_STRING"] = " " })));
    }
}

public sealed class MenuItemsUploadControllerTests
{
    private const string BlobUrl = "https://stcinnamonbistrodev1848.blob.core.windows.net/menu-images/dish_0123456789abcdef0123456789abcdef.jpg";
    private readonly Mock<IMenuItemRepository> _repo = new();
    private readonly Mock<IImageStorageService> _storage = new();

    private MenuItemsController Controller() => new(_repo.Object, _storage.Object);

    private static IFormFile File(string name = "photo.jpg", string contentType = "image/jpeg", long size = 16) =>
        new FormFile(new MemoryStream(new byte[Math.Min(size, 64)]), 0, size, "file", name)
        { Headers = new HeaderDictionary(), ContentType = contentType };

    private static MenuItemRequest Request(string? imageReference) => new()
    {
        ItemName = "Kottu", Description = "Test", Price = 1200m, Category = "Main Course",
        DietaryInfo = "None", ImageReference = imageReference, IsAvailable = true
    };

    [Fact]
    public async Task Upload_Success_Returns200_WithTheFullBlobUrl()
    {
        _storage.Setup(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>())).ReturnsAsync(BlobUrl);

        var ok = Assert.IsType<OkObjectResult>(await Controller().UploadImage(File()));

        var body = ok.Value!;
        Assert.Equal(BlobUrl, body.GetType().GetProperty("imageUrl")!.GetValue(body));
        Assert.Equal("dish_0123456789abcdef0123456789abcdef.jpg", body.GetType().GetProperty("fileName")!.GetValue(body));
    }

    [Fact]
    public async Task Upload_StorageUnavailable_Returns503_WithAStableErrorCode_NotAFakeSuccess()
    {
        _storage.Setup(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ImageStorageUnavailableException("Image storage is not configured."));

        var result = Assert.IsType<ObjectResult>(await Controller().UploadImage(File()));

        Assert.Equal(503, result.StatusCode);
        Assert.Equal("IMAGE_STORAGE_UNAVAILABLE", result.Value!.GetType().GetProperty("code")!.GetValue(result.Value));
    }

    [Fact]
    public async Task Upload_UnexpectedFailure_Returns500_WithoutDetails()
    {
        _storage.Setup(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("secret detail"));

        var result = Assert.IsType<ObjectResult>(await Controller().UploadImage(File()));

        Assert.Equal(500, result.StatusCode);
        Assert.DoesNotContain("secret detail", result.Value!.ToString());
    }

    [Theory]
    [InlineData("photo.jpg", "image/jpeg")]
    [InlineData("photo.jpeg", "image/jpeg")]
    [InlineData("photo.PNG", "image/png")]
    [InlineData("photo.webp", "image/webp")]
    public async Task Upload_AllowedTypes_AreAccepted(string name, string type)
    {
        _storage.Setup(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>())).ReturnsAsync(BlobUrl);
        Assert.IsType<OkObjectResult>(await Controller().UploadImage(File(name, type)));
    }

    [Theory]
    [InlineData("photo.gif", "image/gif")]
    [InlineData("photo.svg", "image/svg+xml")]
    [InlineData("photo.exe", "application/octet-stream")]
    [InlineData("photo.jpg", "application/x-msdownload")]
    public async Task Upload_DisallowedTypes_Return400_AndNothingIsStored(string name, string type)
    {
        Assert.IsType<BadRequestObjectResult>(await Controller().UploadImage(File(name, type)));
        _storage.Verify(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Upload_MissingOrEmptyFile_Returns400()
    {
        Assert.IsType<BadRequestObjectResult>(await Controller().UploadImage(null));
        Assert.IsType<BadRequestObjectResult>(await Controller().UploadImage(File(size: 0)));
    }

    [Fact]
    public async Task Upload_SizeLimit_IsEnforced_AtExactly5MB()
    {
        _storage.Setup(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>())).ReturnsAsync(BlobUrl);
        Assert.IsType<OkObjectResult>(await Controller().UploadImage(File(size: 5 * 1024 * 1024)));
        Assert.IsType<BadRequestObjectResult>(await Controller().UploadImage(File(size: 5 * 1024 * 1024 + 1)));
    }

    [Fact]
    public async Task Upload_MaliciousFileName_IsNeverPassedOn_TheServiceGeneratesTheBlobName()
    {
        _storage.Setup(s => s.SaveImageAsync(It.IsAny<IFormFile>(), It.IsAny<CancellationToken>())).ReturnsAsync(BlobUrl);
        var result = Assert.IsType<OkObjectResult>(await Controller().UploadImage(File("..\\..\\evil.jpg")));
        var url = (string)result.Value!.GetType().GetProperty("imageUrl")!.GetValue(result.Value)!;
        Assert.DoesNotContain("evil", url);
    }

    [Fact]
    public async Task Create_PersistsTheBlobUrl_Exactly()
    {
        MenuItem? saved = null;
        _repo.Setup(r => r.CreateAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>())).Callback<MenuItem, CancellationToken>((m, _) => saved = m).ReturnsAsync(7);

        Assert.IsType<CreatedAtActionResult>(await Controller().Create(Request(BlobUrl)));

        Assert.Equal(BlobUrl, saved!.ImageReference);
    }

    [Fact]
    public async Task Create_PasteUrl_StillWorks_AndIsPersistedUnchanged()
    {
        MenuItem? saved = null;
        _repo.Setup(r => r.CreateAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>())).Callback<MenuItem, CancellationToken>((m, _) => saved = m).ReturnsAsync(8);
        const string pasted = "https://images.example.com/photos/kottu.jpg";

        Assert.IsType<CreatedAtActionResult>(await Controller().Create(Request(pasted)));

        Assert.Equal(pasted, saved!.ImageReference);
    }

    [Fact]
    public async Task Create_LegacyLocalUploadReference_IsAccepted_AndNotRewritten()
    {
        // Existing rows such as /uploads/menu-images/x.jpg stay identifiable (for manual re-upload or a reviewed migration).
        MenuItem? saved = null;
        _repo.Setup(r => r.CreateAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>())).Callback<MenuItem, CancellationToken>((m, _) => saved = m).ReturnsAsync(9);
        const string legacy = "/uploads/menu-images/dish_old.jpg";

        Assert.IsType<CreatedAtActionResult>(await Controller().Create(Request(legacy)));

        Assert.Equal(legacy, saved!.ImageReference);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("not a url")]
    [InlineData("/uploads/../etc/passwd")]
    public async Task Create_MalformedImageReference_Returns400_AndNothingIsSaved(string bad)
    {
        Assert.IsType<BadRequestObjectResult>(await Controller().Create(Request(bad)));
        _repo.Verify(r => r.CreateAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Create_WithNoImage_StillWorks()
    {
        _repo.Setup(r => r.CreateAsync(It.IsAny<MenuItem>(), It.IsAny<CancellationToken>())).ReturnsAsync(10);
        Assert.IsType<CreatedAtActionResult>(await Controller().Create(Request(null)));
    }

    [Fact]
    public async Task Create_InvalidCategory_Returns400()
    {
        var request = Request(null);
        request.Category = "Nonsense";
        Assert.IsType<BadRequestObjectResult>(await Controller().Create(request));
    }

    [Fact]
    public async Task Update_PersistsTheBlobUrl_Exactly()
    {
        MenuItem? saved = null;
        _repo.Setup(r => r.UpdateAsync(3, It.IsAny<MenuItem>(), It.IsAny<CancellationToken>())).Callback<int, MenuItem, CancellationToken>((_, m, _) => saved = m).ReturnsAsync(true);
        _repo.Setup(r => r.GetByIdAsync(3, It.IsAny<CancellationToken>())).ReturnsAsync(new MenuItem { MenuItemId = 3, ItemName = "Kottu", Category = "Main Course", DietaryInfo = "None" });

        var result = await Controller().Update(3, Request(BlobUrl));

        Assert.IsNotType<BadRequestObjectResult>(result);
        Assert.Equal(BlobUrl, saved!.ImageReference);
    }

    [Fact]
    public async Task GetAll_PassesThroughTheRepository()
    {
        _repo.Setup(r => r.GetAllAsync(null, null, null, null, It.IsAny<CancellationToken>())).ReturnsAsync(new List<MenuItem> { new() { MenuItemId = 1, ImageReference = BlobUrl } });
        var ok = Assert.IsType<OkObjectResult>(await Controller().GetAll());
        Assert.Equal(BlobUrl, Assert.Single(Assert.IsType<List<MenuItem>>(ok.Value)).ImageReference);
    }

    [Fact]
    public void Upload_RequiresTheAdminRole()
    {
        var attribute = typeof(MenuItemsController).GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true)
            .Cast<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Single();
        Assert.Equal("Admin", attribute.Roles);
    }
}
