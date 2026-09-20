using Microsoft.AspNetCore.Http;

namespace ReservationService.Services;

/// <summary>
/// Service abstraction for persisting uploaded images (local disk or Azure Blob Storage).
/// </summary>
public interface IImageStorageService
{
    /// <summary>
    /// Saves an uploaded image and returns its publicly accessible or relative URL.
    /// </summary>
    /// <param name="file">The uploaded image file.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The resolved URL or path to the stored image.</returns>
    Task<string> SaveImageAsync(
        IFormFile file,
        CancellationToken cancellationToken = default);
}

