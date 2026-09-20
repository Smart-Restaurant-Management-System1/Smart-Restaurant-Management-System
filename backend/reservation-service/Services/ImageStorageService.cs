using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ReservationService.Services;

/// <summary>
/// Hybrid image storage service: saves to Azure Blob Storage when configured,
/// or falls back to local webroot storage during local development.
/// </summary>
public class ImageStorageService : IImageStorageService
{
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ImageStorageService> _logger;

    public ImageStorageService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<ImageStorageService> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task<string> SaveImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension))
        {
            extension = ".jpg";
        }

        var uniqueFileName = $"dish_{Guid.NewGuid():N}{extension}";

        var azureConnectionString =
            _configuration["Storage:AzureBlobConnectionString"] ??
            _configuration["Azure:StorageConnectionString"] ??
            _configuration["AZURE_STORAGE_CONNECTION_STRING"];

        // 1. If Azure Blob Storage is configured, upload to Azure Blob Storage
        if (!string.IsNullOrWhiteSpace(azureConnectionString))
        {
            try
            {
                var containerName =
                    _configuration["Storage:BlobContainerName"] ?? "menu-images";

                var blobServiceClient = new BlobServiceClient(azureConnectionString);
                var containerClient = blobServiceClient.GetBlobContainerClient(containerName);

                await containerClient.CreateIfNotExistsAsync(
                    PublicAccessType.Blob,
                    cancellationToken: cancellationToken);

                var blobClient = containerClient.GetBlobClient(uniqueFileName);

                var blobOptions = new BlobUploadOptions
                {
                    HttpHeaders = new BlobHttpHeaders
                    {
                        ContentType = file.ContentType
                    }
                };

                await using var fileStream = file.OpenReadStream();
                await blobClient.UploadAsync(fileStream, blobOptions, cancellationToken);

                _logger.LogInformation(
                    "Image uploaded to Azure Blob Storage successfully: {BlobUri}",
                    blobClient.Uri);

                return blobClient.Uri.AbsoluteUri;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Failed to upload image to Azure Blob Storage. Falling back to local storage.");
            }
        }

        // 2. Local fallback storage (for development / offline runs)
        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        var uploadsDir = Path.Combine(webRoot, "uploads", "menu-images");
        Directory.CreateDirectory(uploadsDir);

        var localFilePath = Path.Combine(uploadsDir, uniqueFileName);

        await using (var fileStream = new FileStream(localFilePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream, cancellationToken);
        }

        _logger.LogInformation(
            "Image saved to local storage successfully: {Path}",
            localFilePath);

        return $"/uploads/menu-images/{uniqueFileName}";
    }
}

