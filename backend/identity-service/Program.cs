using System.Text;
using IdentityService.Data;
using IdentityService.Repositories;
using IdentityService.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers
builder.Services.AddControllers();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!";
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
    options.AddPolicy(IdentityService.Models.AppPolicies.RequireAdmin, policy => policy.RequireRole(IdentityService.Models.AppRoles.Admin));
    options.AddPolicy(IdentityService.Models.AppPolicies.RequireCustomer, policy => policy.RequireRole(IdentityService.Models.AppRoles.Customer));
    options.AddPolicy(IdentityService.Models.AppPolicies.RequireKitchenStaff, policy => policy.RequireRole(IdentityService.Models.AppRoles.KitchenStaff));
    options.AddPolicy(IdentityService.Models.AppPolicies.RequireStaff, policy => policy.RequireRole(IdentityService.Models.AppRoles.Admin, IdentityService.Models.AppRoles.KitchenStaff));
});

// Add Swagger / OpenAPI with JWT Support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Smart Restaurant - Identity Service API",
        Version = "v1",
        Description = "Microservice managing user authentication, registration, roles, and profiles."
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

// Configure CORS for Frontend
// Same-origin requests via the frontend's Nginx reverse proxy never trigger CORS at all;
// this policy exists as defense-in-depth for direct API consumers (Swagger, mobile clients,
// local tooling) and is not the primary mechanism that makes the deployed frontend work.
var frontendOrigin = builder.Configuration["Cors:AllowedOrigin"]
    ?? "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
              {
                  if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                  {
                      return false;
                  }

                  // Localhost/127.0.0.1 are permitted only in Development, on any scheme/port.
                  if (builder.Environment.IsDevelopment() && (uri.Host == "localhost" || uri.Host == "127.0.0.1"))
                  {
                      return true;
                  }

                  return string.Equals(origin, frontendOrigin, StringComparison.OrdinalIgnoreCase);
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Dependency Injection (Clean Architecture)
builder.Services.AddSingleton<DatabaseHelper>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Identity Service V1");
    });
}

// Prometheus metrics endpoint
app.UseMetricServer();
app.UseHttpMetrics();

app.UseRouting();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
