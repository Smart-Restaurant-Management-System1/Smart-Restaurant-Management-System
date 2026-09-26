namespace ReservationService.Exceptions;

/// <summary>
/// Raised when an uploaded image cannot be stored durably (Azure Blob Storage is not configured or the upload
/// failed) and the environment does not permit the local-disk fallback. The message is safe to return to clients.
/// </summary>
public sealed class ImageStorageUnavailableException : Exception
{
    public ImageStorageUnavailableException(string message)
        : base(message)
    {
    }
}
