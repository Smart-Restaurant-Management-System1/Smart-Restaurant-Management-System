
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Prometheus;
using ReservationService.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Configure JWT Authentication matching Identity Service contract
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrEmpty(jwtKey) ||
    jwtKey == "SET_USING_ENVIRONMENT_OR_USER_SECRETS")
{
    jwtKey = "SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!";
}

var jwtIssuer =
    builder.Configuration["Jwt:Issuer"] ?? "SmartRestaurant";

var jwtAudience =
    builder.Configuration["Jwt:Audience"] ?? "SmartRestaurantUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme =
        JwtBearerDefaults.AuthenticationScheme;

    options.DefaultChallengeScheme =
        JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,

        IssuerSigningKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)
            ),

        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,

        ValidateAudience = true,
        ValidAudience = jwtAudience,

        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,

        RoleClaimType =
            System.Security.Claims.ClaimTypes.Role,

        NameClaimType =
            System.Security.Claims.ClaimTypes.NameIdentifier
    };

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var validator = context.HttpContext.RequestServices.GetService<ReservationService.Services.IUserAccountStatusValidator>();
            if (validator != null)
            {
                var userIdClaim = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? context.Principal?.FindFirst("sub")?.Value;

                if (!int.TryParse(userIdClaim, out var userId) || !await validator.IsUserActiveAsync(userId, context.HttpContext.RequestAborted))
                {
                    context.Fail("User account is inactive or blocked.");
                }
            }
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";

            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                message = "Authentication required or token is invalid or expired."
            });
            await context.Response.WriteAsync(payload);
        },
        OnForbidden = async context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";

            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                message = "You do not have permission to access this resource."
            });
            await context.Response.WriteAsync(payload);
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        AppPolicies.RequireAdmin,
        policy => policy.RequireRole(AppRoles.Admin)
    );

    options.AddPolicy(
        AppPolicies.RequireCustomer,
        policy => policy.RequireRole(AppRoles.Customer)
    );

    options.AddPolicy(
        AppPolicies.RequireKitchenStaff,
        policy => policy.RequireRole(AppRoles.KitchenStaff)
    );

    options.AddPolicy(
        AppPolicies.RequireStaff,
        policy => policy.RequireRole(
            AppRoles.Admin,
            AppRoles.KitchenStaff
        )
    );
});

// Swagger with Bearer authorization support
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Smart Restaurant - Reservation Service API",
        Version = "v1",
        Description =
            "Microservice managing tables, availability, and reservations."
    });

    // Include XML documentation comments
    var xmlFile =
        $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";

    var xmlPath =
        Path.Combine(AppContext.BaseDirectory, xmlFile);

    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT Bearer token."
    });

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        }
    );
});

// Configure CORS
// Localhost/127.0.0.1 are allowed in Development.
// The deployed frontend origin is allowed through configuration.

var frontendOrigin =
    builder.Configuration["Cors:AllowedOrigin"]
    ?? "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (!Uri.TryCreate(
                    origin,
                    UriKind.Absolute,
                    out var uri))
            {
                return false;
            }

            // Allow localhost and 127.0.0.1 during development and testing
            if (uri.Host == "localhost" ||
                uri.Host == "127.0.0.1")
            {
                return true;
            }

            // Allow configured frontend origin
            return string.Equals(
                origin,
                frontendOrigin,
                StringComparison.OrdinalIgnoreCase
            );
        })
        .AllowAnyHeader()
        .AllowAnyMethod();
    });
});

// Dependency Injection

builder.Services.AddSingleton<
    ReservationService.Data.DatabaseHelper
>();

// User account status validator (SR-225 / SR-257)
builder.Services.AddScoped<
    ReservationService.Services.IUserAccountStatusValidator,
    ReservationService.Services.DatabaseUserAccountStatusValidator
>();

// Table repository
builder.Services.AddScoped<
    ReservationService.Repositories.ITableRepository,
    ReservationService.Repositories.TableRepository
>();

// Menu item repository
// Required by MenuItemsController
builder.Services.AddScoped<
    ReservationService.Repositories.IMenuItemRepository,
    ReservationService.Repositories.MenuItemRepository
>();

// Order cart repository
// Required by the customer order cart service and controller
builder.Services.AddScoped<
    ReservationService.Repositories.IOrderCartRepository,
    ReservationService.Repositories.OrderCartRepository
>();

// Feedback repository and service (SR-219 / SR-234)
builder.Services.AddScoped<
    ReservationService.Repositories.IFeedbackRepository,
    ReservationService.Repositories.FeedbackRepository
>();
builder.Services.AddScoped<
    ReservationService.Services.IFeedbackService,
    ReservationService.Services.FeedbackService
>();

// Payment configuration and services (SR-280 / SR-283 / SR-284)
builder.Services.Configure<
    ReservationService.Models.PayHereOptions
>(
    builder.Configuration.GetSection(
        ReservationService.Models.PayHereOptions.SectionName
    )
);
builder.Services.AddScoped<
    ReservationService.Repositories.IPaymentRepository,
    ReservationService.Repositories.PaymentRepository
>();
builder.Services.AddScoped<
    ReservationService.Services.IPaymentService,
    ReservationService.Services.PaymentService
>();

// Order expiry configuration and service
builder.Services.Configure<
    ReservationService.Models.OrderExpiryOptions
>(
    builder.Configuration.GetSection(
        ReservationService.Models.OrderExpiryOptions.SectionName
    )
);
builder.Services.AddScoped<
    ReservationService.Services.IOrderExpiryService,
    ReservationService.Services.OrderExpiryService
>();

// Availability configuration
builder.Services.Configure<AvailabilityRulesOptions>(
    builder.Configuration.GetSection(
        AvailabilityRulesOptions.SectionName
    )
);

builder.Services.AddSingleton(TimeProvider.System);

builder.Services.AddScoped<
    ReservationService.Services.ReservationMaintenancePolicy
>();

// Availability repository
builder.Services.AddScoped<
    ReservationService.Repositories.IAvailabilityRepository,
    ReservationService.Repositories.AvailabilityRepository
>();

// Availability search services
builder.Services.AddScoped<
    ReservationService.Services.IAvailabilitySearchService,
    ReservationService.Services.AvailabilitySearchService
>();

builder.Services.AddScoped<
    ReservationService.Services.IAvailabilitySearchValidator,
    ReservationService.Services.AvailabilitySearchValidator
>();

// Booking reference generator
builder.Services.AddSingleton<
    ReservationService.Services.IBookingReferenceGenerator,
    ReservationService.Services.BookingReferenceGenerator
>();

// SR-115:
// Outbox repository is stateless.
// DatabaseHelper is singleton and connections/transactions are created per call.
// Therefore, the outbox repository is registered as singleton so that the
// singleton OutboxPublisherService can consume it safely.

// Outbox repository
builder.Services.AddSingleton<
    ReservationService.Repositories.IOutboxRepository,
    ReservationService.Repositories.OutboxRepository
>();

// Reservation repository
builder.Services.AddScoped<
    ReservationService.Repositories.IReservationRepository,
    ReservationService.Repositories.ReservationRepository
>();

// Reservation services
builder.Services.AddScoped<
    ReservationService.Services.IReservationCreationService,
    ReservationService.Services.ReservationCreationService
>();

builder.Services.AddScoped<
    ReservationService.Services.IReservationRescheduleService,
    ReservationService.Services.ReservationRescheduleService
>();

builder.Services.AddScoped<
    ReservationService.Services.IReservationReportService,
    ReservationService.Services.ReservationReportService
>();

builder.Services.AddScoped<
    ReservationService.Services.IReservationHistoryService,
    ReservationService.Services.ReservationHistoryService
>();

builder.Services.AddScoped<
    ReservationService.Services.IReservationLifecycleService,
    ReservationService.Services.ReservationLifecycleService
>();

builder.Services.AddScoped<
    ReservationService.Services.IAdminReservationService,
    ReservationService.Services.AdminReservationService
>();

// Order cart service
// Handles cart validation and customer cart operations
builder.Services.AddScoped<
    ReservationService.Services.IOrderCartService,
    ReservationService.Services.OrderCartService
>();

// SR-112: Kafka configuration
builder.Services.Configure<
    ReservationService.Models.KafkaOptions
>(
    builder.Configuration.GetSection(
        ReservationService.Models.KafkaOptions.SectionName
    )
);

// Kafka publisher registration
//
// When Kafka publishing is enabled:
//     Use the real Confluent Kafka publisher.
//
// When Kafka publishing is disabled:
//     Use the disabled publisher so that a Kafka producer is not created.
//
// This allows the API to run locally without Docker or Kafka.

var kafkaPublisherEnabled =
    builder.Configuration.GetValue<bool>(
        $"{ReservationService.Models.KafkaOptions.SectionName}:PublisherEnabled"
    );

if (kafkaPublisherEnabled)
{
    builder.Services.AddSingleton<
        ReservationService.Services.IReservationEventPublisher,
        ReservationService.Services.ConfluentKafkaPublisher
    >();
}
else
{
    builder.Services.AddSingleton<
        ReservationService.Services.IReservationEventPublisher,
        ReservationService.Services.DisabledReservationEventPublisher
    >();
}

// Image storage service (Azure Blob Storage; local disk fallback for Development only)
builder.Services.AddSingleton<
    ReservationService.Services.IBlobImageUploader,
    ReservationService.Services.AzureBlobImageUploader
>();
builder.Services.AddScoped<
    ReservationService.Services.IImageStorageService,
    ReservationService.Services.ImageStorageService
>();

// Outbox background service
builder.Services.AddHostedService<
    ReservationService.Services.OutboxPublisherService
>();

// Order expiry background service (auto-cancels unpaid orders older than threshold)
builder.Services.AddHostedService<
    ReservationService.Services.OrderExpiryBackgroundService
>();

var app = builder.Build();

// Global exception handling: ensure internal paths, stack traces, and database details are never leaked to clients
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        if (exceptionFeature?.Error != null)
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(exceptionFeature.Error, "Unhandled exception processing {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            message = "An unexpected error occurred. Please try again later."
        });
        await context.Response.WriteAsync(payload);
    });
});

// Make a missing Blob configuration visible at startup (never logs the value).
if (!app.Environment.IsDevelopment()
    && !ReservationService.Services.ImageStorageService.IsBlobConfigured(app.Configuration))
{
    app.Logger.LogWarning(
        "Azure Blob Storage is not configured (AZURE_STORAGE_CONNECTION_STRING is missing or empty). " +
        "Menu image uploads will return HTTP 503 until it is configured and the app is restarted.");
}

// Ensure local static uploads directory exists
var webRoot = app.Environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
var uploadsDir = Path.Combine(webRoot, "uploads", "menu-images");
if (!Directory.Exists(uploadsDir))
{
    Directory.CreateDirectory(uploadsDir);
}

// Serve static files for uploaded dish images
app.UseStaticFiles();

// Configure HTTP request pipeline

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "Reservation Service V1"
        );
    });
}

// Prometheus metrics
app.UseMetricServer();
app.UseHttpMetrics();

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();