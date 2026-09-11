using IdentityService.DTOs;
using IdentityService.Models;
using IdentityService.Repositories;
using Microsoft.Extensions.Configuration;

namespace IdentityService.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<UserResponseDto> RegisterAsync(RegisterRequestDto request)
    {
        // 1. Determine and validate role & staff authorization code from configuration / env
        var roleToAssign = string.IsNullOrWhiteSpace(request.Role) ? "Customer" : request.Role.Trim();
        var isStaffRole = roleToAssign.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
                          roleToAssign.Equals("KitchenStaff", StringComparison.OrdinalIgnoreCase);

        if (isStaffRole)
        {
            var expectedStaffCode = _configuration["Staff:AuthorizationCode"] ?? "BISTRO2026";
            if (string.IsNullOrWhiteSpace(request.StaffAuthorizationCode) ||
                !request.StaffAuthorizationCode.Trim().Equals(expectedStaffCode.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Registration failed: Invalid staff authorization code for role {Role}", roleToAssign);
                throw new InvalidOperationException("Invalid staff authorization code. Please verify with restaurant management.");
            }
        }

        // 2. Check if email already registered
        var existingUser = await _userRepository.GetByEmailAsync(request.Email);
        if (existingUser != null)
        {
            _logger.LogWarning("Registration failed: Email {Email} already registered.", request.Email);
            throw new InvalidOperationException($"User with email '{request.Email}' already exists.");
        }

        // 3. Hash password securely using BCrypt
        var passwordHash = _passwordHasher.HashPassword(request.Password);

        // 4. Prepare User entity
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            PasswordHash = passwordHash,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 5. Save to database with assigned role
        var newUserId = await _userRepository.CreateUserWithRoleAsync(user, roleToAssign);

        _logger.LogInformation("Successfully registered user {Email} with ID {UserId} and Role {Role}", user.Email, newUserId, roleToAssign);

        // 6. Return user response DTO
        var createdUser = await _userRepository.GetByIdAsync(newUserId);
        return new UserResponseDto
        {
            UserId = createdUser!.UserId,
            FullName = createdUser.FullName,
            Email = createdUser.Email,
            PhoneNumber = createdUser.PhoneNumber,
            IsActive = createdUser.IsActive,
            Roles = createdUser.Roles,
            CreatedAt = createdUser.CreatedAt
        };
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        // 1. Fetch user by email
        var user = await _userRepository.GetByEmailAsync(request.Email.Trim());
        if (user == null || !user.IsActive)
        {
            _logger.LogWarning("Login failed: User {Email} not found or inactive.", request.Email);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        // 2. Verify password with BCrypt
        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            _logger.LogWarning("Login failed: Password mismatch for user {Email}.", request.Email);
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        // 3. Generate signed JWT token
        var (token, expiresAt) = _jwtTokenGenerator.GenerateToken(user, user.Roles);

        _logger.LogInformation("User {Email} logged in successfully.", user.Email);

        // 4. Return login response DTO
        return new LoginResponseDto
        {
            Token = token,
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Roles = user.Roles,
            ExpiresAt = expiresAt
        };
    }
}
