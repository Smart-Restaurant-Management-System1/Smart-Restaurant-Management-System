using System.Security.Cryptography;

namespace ReservationService.Services;

public sealed class BookingReferenceGenerator : IBookingReferenceGenerator
{
    // No ambiguous 0/O or 1/I characters; reference is support-friendly but not an authorization credential.
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    public string Generate()
    {
        Span<char> chars = stackalloc char[8];
        for (var i = 0; i < chars.Length; i++) chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        return $"SR-{new string(chars[..4])}-{new string(chars[4..])}";
    }
}
