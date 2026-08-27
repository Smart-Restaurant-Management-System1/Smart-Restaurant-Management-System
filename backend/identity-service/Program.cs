using IdentityService.Data;
using IdentityService.Repositories;
using IdentityService.Services;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers
builder.Services.AddControllers();

// Add Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Smart Restaurant - Identity Service API",
        Version = "v1",
        Description = "Microservice managing user authentication, registration, roles, and profiles."
    });
});

// Configure CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Dependency Injection (Clean Architecture)
builder.Services.AddSingleton<DatabaseHelper>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<IAuthService, AuthService>();

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

app.UseCors("AllowFrontend");

// Prometheus metrics endpoint
app.UseMetricServer();
app.UseHttpMetrics();

app.UseRouting();

app.MapControllers();

app.Run();
