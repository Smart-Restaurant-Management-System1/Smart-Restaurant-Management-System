namespace ReservationService.Exceptions;

public class DuplicateTableNumberException : Exception
{
    public string TableNumber { get; }

    public DuplicateTableNumberException(string tableNumber)
        : base($"Table number '{tableNumber}' already exists.")
    {
        TableNumber = tableNumber;
    }
}
