using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace ReservationService.Services;

/// <summary>
/// Thin seam over Azure Blob Storage so the storage-selection logic can be unit tested without Azure.
/// </summary>
public interface IBlobImageUploader
{
    /// <summary>Uploads the content and returns the blob's full URI.</summary>
    Task<Uri> UploadAsync(
        string connectionString,
        string containerName,
        string blobName,
        string contentType,
        Stream content,
        CancellationToken cancellationToken);
}

/// <summary>Azure Blob Storage implementation of <see cref="IBlobImageUploader"/>.</summary>
public sealed class AzureBlobImageUploader : IBlobImageUploader
{
    public async Task<Uri> UploadAsync(
        string connectionString,
        string containerName,
        string blobName,
        string contentType,
        Stream content,
        CancellationToken cancellationToken)
    {
        var containerClient = new BlobServiceClient(connectionString).GetBlobContainerClient(containerName);

        // Keeps the SR-213 behaviour: create the container with anonymous read access to blobs if it is missing.
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken);

        var blobClient = containerClient.GetBlobClient(blobName);
        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType }
        };

        await blobClient.UploadAsync(content, options, cancellationToken);
        return blobClient.Uri;
    }
}
