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
if (string.IsNullOrEmpty(jwtKey) || jwtKey == "SET_USING_ENVIRONMENT_OR_USER_SECRETS")
{
    jwtKey = "SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!";
}
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SmartRestaurant";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SmartRestaurantUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AppPolicies.RequireAdmin, policy => policy.RequireRole(AppRoles.Admin));
    options.AddPolicy(AppPolicies.RequireCustomer, policy => policy.RequireRole(AppRoles.Customer));
    options.AddPolicy(AppPolicies.RequireKitchenStaff, policy => policy.RequireRole(AppRoles.KitchenStaff));
    options.AddPolicy(AppPolicies.RequireStaff, policy => policy.RequireRole(AppRoles.Admin, AppRoles.KitchenStaff));
});

// Swagger with Bearer authorization support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Smart Restaurant - Reservation Service API",
        Version = "v1",
        Description = "Microservice managing tables, availability, and reservations."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT Bearer token."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
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
    });
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                  {
                      return uri.Host == "localhost" || uri.Host == "127.0.0.1";
                  }
                  return false;
              })
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Dependency Injection
builder.Services.AddSingleton<ReservationService.Data.DatabaseHelper>();
builder.Services.AddScoped<ReservationService.Repositories.ITableRepository, ReservationService.Repositories.TableRepository>();
builder.Services.Configure<AvailabilityRulesOptions>(builder.Configuration.GetSection(AvailabilityRulesOptions.SectionName));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ReservationService.Repositories.IAvailabilityRepository, ReservationService.Repositories.AvailabilityRepository>();
builder.Services.AddScoped<ReservationService.Services.IAvailabilitySearchService, ReservationService.Services.AvailabilitySearchService>();
builder.Services.AddScoped<ReservationService.Services.IAvailabilitySearchValidator, ReservationService.Services.AvailabilitySearchValidator>();
builder.Services.AddSingleton<ReservationService.Services.IBookingReferenceGenerator, ReservationService.Services.BookingReferenceGenerator>();
builder.Services.AddScoped<ReservationService.Repositories.IReservationRepository, ReservationService.Repositories.ReservationRepository>();
builder.Services.AddScoped<ReservationService.Services.IReservationCreationService, ReservationService.Services.ReservationCreationService>();
builder.Services.AddScoped<ReservationService.Services.IReservationHistoryService, ReservationService.Services.ReservationHistoryService>();
builder.Services.AddScoped<ReservationService.Services.IReservationLifecycleService, ReservationService.Services.ReservationLifecycleService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Reservation Service V1");
    });
}

app.UseMetricServer();
app.UseHttpMetrics();

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
