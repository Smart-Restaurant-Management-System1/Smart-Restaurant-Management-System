using Azure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ReservationService.Exceptions;

namespace ReservationService.Services;

/// <summary>
/// Stores menu images. Azure Blob Storage is used whenever a connection string is configured.
/// The local-disk fallback exists for Development only: outside Development a missing configuration or a failed
/// upload raises <see cref="ImageStorageUnavailableException"/> instead of returning an ephemeral local path
/// (container disks are not durable and are not served by the frontend proxy).
/// </summary>
public class ImageStorageService : IImageStorageService
{
    public const string DefaultContainerName = "menu-images";

    // Checked in order; an empty or whitespace value is treated as "not set" so it cannot shadow a later key.
    private static readonly string[] ConnectionStringKeys =
    {
        "Storage:AzureBlobConnectionString",
        "Azure:StorageConnectionString",
        "AZURE_STORAGE_CONNECTION_STRING"
    };

    private static readonly Dictionary<string, string> ContentTypesByExtension = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp"
    };

    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<ImageStorageService> _logger;
    private readonly IBlobImageUploader _blobUploader;

    public ImageStorageService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<ImageStorageService> logger,
        IBlobImageUploader blobUploader)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
        _blobUploader = blobUploader;
    }

    /// <summary>True when any recognised connection-string key holds a non-blank value. Never returns the value.</summary>
    public static bool IsBlobConfigured(IConfiguration configuration) =>
        ConnectionStringKeys.Any(key => !string.IsNullOrWhiteSpace(configuration[key]));

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
        var contentType = ContentTypesByExtension.TryGetValue(extension, out var mapped)
            ? mapped
            : "application/octet-stream";
        var allowLocalFallback = _environment.IsDevelopment();

        var connectionString = ConnectionStringKeys
            .Select(key => _configuration[key])
            .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))
            ?.Trim();

        if (connectionString is not null)
        {
            var containerName = _configuration["Storage:BlobContainerName"];
            if (string.IsNullOrWhiteSpace(containerName))
            {
                containerName = DefaultContainerName;
            }

            containerName = containerName.Trim();

            try
            {
                await using var stream = file.OpenReadStream();
                var blobUri = await _blobUploader.UploadAsync(
                    connectionString,
                    containerName,
                    uniqueFileName,
                    contentType,
                    stream,
                    cancellationToken);

                _logger.LogInformation(
                    "Image uploaded to Azure Blob Storage: container {Container}, blob {BlobName}",
                    containerName,
                    uniqueFileName);

                return blobUri.AbsoluteUri;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Safe diagnostic only: exception type, HTTP status and Azure error code. The exception message and
                // stack trace are deliberately not logged (they can echo request details); the connection string is
                // never logged.
                var azure = ex as RequestFailedException;
                _logger.LogError(
                    "Azure Blob upload failed: {ExceptionType}, status {Status}, error code {ErrorCode}, container {Container}. {Fallback}",
                    ex.GetType().Name,
                    azure?.Status,
                    azure?.ErrorCode,
                    containerName,
                    allowLocalFallback
                        ? "Development: falling back to local storage."
                        : "Local disk fallback is disabled outside Development.");

                if (!allowLocalFallback)
                {
                    throw new ImageStorageUnavailableException(
                        "Image storage is temporarily unavailable. Please try again later.");
                }
            }
        }
        else if (!allowLocalFallback)
        {
            _logger.LogError(
                "Image upload rejected: Azure Blob Storage is not configured (none of {Keys} has a value). " +
                "Local disk fallback is disabled outside Development.",
                string.Join(", ", ConnectionStringKeys));

            throw new ImageStorageUnavailableException("Image storage is not configured.");
        }

        // Development-only local fallback (local runs without Azure Blob Storage).
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
            "Image saved to local storage (Development only): {Path}",
            localFilePath);

        return $"/uploads/menu-images/{uniqueFileName}";
    }
}
