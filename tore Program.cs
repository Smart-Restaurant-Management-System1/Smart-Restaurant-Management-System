[1mdiff --git a/backend/reservation-service/Program.cs b/backend/reservation-service/Program.cs[m
[1mindex b08f411..1221c7b 100644[m
[1m--- a/backend/reservation-service/Program.cs[m
[1m+++ b/backend/reservation-service/Program.cs[m
[36m@@ -1,175 +1,27 @@[m
[31m-using System.Text;[m
[31m-using Microsoft.AspNetCore.Authentication.JwtBearer;[m
[31m-using Microsoft.IdentityModel.Tokens;[m
[31m-using Microsoft.OpenApi.Models;[m
[31m-using Prometheus;[m
[31m-using ReservationService.Models;[m
[32m+[m[32m// Kafka publisher registration[m
[32m+[m[32m// The real Kafka publisher is created only when publishing is enabled.[m
 [m
[31m-var builder = WebApplication.CreateBuilder(args);[m
[32m+[m[32mvar kafkaPublisherEnabled =[m
[32m+[m[32m    builder.Configuration.GetValue<bool>([m
[32m+[m[32m        $"{KafkaOptions.SectionName}:PublisherEnabled"[m
[32m+[m[32m    );[m
 [m
[31m-builder.Services.AddControllers();[m
[31m-[m
[31m-// Configure JWT Authentication matching Identity Service contract[m
[31m-var jwtKey = builder.Configuration["Jwt:Key"];[m
[31m-if (string.IsNullOrEmpty(jwtKey) || jwtKey == "SET_USING_ENVIRONMENT_OR_USER_SECRETS")[m
[32m+[m[32mif (kafkaPublisherEnabled)[m
 {[m
[31m-    jwtKey = "SmartRestaurant_Super_Secret_Key_For_Jwt_Token_Validation_2026!";[m
[32m+[m[32m    builder.Services.AddSingleton<[m
[32m+[m[32m        ReservationService.Services.IReservationEventPublisher,[m
[32m+[m[32m        ReservationService.Services.ConfluentKafkaPublisher[m
[32m+[m[32m    >();[m
 }[m
[31m-var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SmartRestaurant";[m
[31m-var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SmartRestaurantUsers";[m
[31m-[m
[31m-builder.Services.AddAuthentication(options =>[m
[31m-{[m
[31m-    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;[m
[31m-    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;[m
[31m-})[m
[31m-.AddJwtBearer(options =>[m
[31m-{[m
[31m-    options.RequireHttpsMetadata = false;[m
[31m-    options.SaveToken = true;[m
[31m-    options.TokenValidationParameters = new TokenValidationParameters[m
[31m-    {[m
[31m-        ValidateIssuerSigningKey = true,[m
[31m-        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),[m
[31m-        ValidateIssuer = true,[m
[31m-        ValidIssuer = jwtIssuer,[m
[31m-        ValidateAudience = true,[m
[31m-        ValidAudience = jwtAudience,[m
[31m-        ValidateLifetime = true,[m
[31m-        ClockSkew = TimeSpan.Zero,[m
[31m-        RoleClaimType = System.Security.Claims.ClaimTypes.Role,[m
[31m-        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier[m
[31m-    };[m
[31m-});[m
[31m-[m
[31m-builder.Services.AddAuthorization(options =>[m
[31m-{[m
[31m-    options.AddPolicy(AppPolicies.RequireAdmin, policy => policy.RequireRole(AppRoles.Admin));[m
[31m-    options.AddPolicy(AppPolicies.RequireCustomer, policy => policy.RequireRole(AppRoles.Customer));[m
[31m-    options.AddPolicy(AppPolicies.RequireKitchenStaff, policy => policy.RequireRole(AppRoles.KitchenStaff));[m
[31m-    options.AddPolicy(AppPolicies.RequireStaff, policy => policy.RequireRole(AppRoles.Admin, AppRoles.KitchenStaff));[m
[31m-});[m
[31m-[m
[31m-// Swagger with Bearer authorization support[m
[31m-builder.Services.AddEndpointsApiExplorer();[m
[31m-builder.Services.AddSwaggerGen(options =>[m
[31m-{[m
[31m-    options.SwaggerDoc("v1", new OpenApiInfo[m
[31m-    {[m
[31m-        Title = "Smart Restaurant - Reservation Service API",[m
[31m-        Version = "v1",[m
[31m-        Description = "Microservice managing tables, availability, and reservations."[m
[31m-    });[m
[31m-[m
[31m-    // Include XML doc comments from the compiled assembly so that <summary> annotations[m
[31m-    // appear in the Swagger UI and generated OpenAPI spec.[m
[31m-    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";[m
[31m-    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);[m
[31m-    if (File.Exists(xmlPath)) options.IncludeXmlComments(xmlPath);[m
[31m-[m
[31m-    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme[m
[31m-    {[m
[31m-        Name = "Authorization",[m
[31m-        Type = SecuritySchemeType.Http,[m
[31m-        Scheme = "Bearer",[m
[31m-        BearerFormat = "JWT",[m
[31m-        In = ParameterLocation.Header,[m
[31m-        Description = "Enter JWT Bearer token."[m
[31m-    });[m
[31m-[m
[31m-    options.AddSecurityRequirement(new OpenApiSecurityRequirement[m
[31m-    {[m
[31m-        {[m
[31m-            new OpenApiSecurityScheme[m
[31m-            {[m
[31m-                Reference = new OpenApiReference[m
[31m-                {[m
[31m-                    Type = ReferenceType.SecurityScheme,[m
[31m-                    Id = "Bearer"[m
[31m-                }[m
[31m-            },[m
[31m-            Array.Empty<string>()[m
[31m-        }[m
[31m-    });[m
[31m-});[m
[31m-[m
[31m-// Configure CORS[m
[31m-// Same-origin requests via the frontend's Nginx reverse proxy never trigger CORS at all;[m
[31m-// this policy exists as defense-in-depth for direct API consumers (Swagger, mobile clients,[m
[31m-// local tooling) and is not the primary mechanism that makes the deployed frontend work.[m
[31m-var frontendOrigin = builder.Configuration["Cors:AllowedOrigin"][m
[31m-    ?? "https://frontend-web.purpledesert-2900c071.eastasia.azurecontainerapps.io";[m
[31m-[m
[31m-builder.Services.AddCors(options =>[m
[31m-{[m
[31m-    options.AddPolicy("AllowFrontend", policy =>[m
[31m-    {[m
[31m-        policy.SetIsOriginAllowed(origin =>[m
[31m-              {[m
[31m-                  if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))[m
[31m-                  {[m
[31m-                      return false;[m
[31m-                  }[m
[31m-[m
[31m-                  // Localhost/127.0.0.1 are permitted only in Development, on any scheme/port.[m
[31m-                  if (builder.Environment.IsDevelopment() && (uri.Host == "localhost" || uri.Host == "127.0.0.1"))[m
[31m-                  {[m
[31m-                      return true;[m
[31m-                  }[m
[31m-[m
[31m-                  return string.Equals(origin, frontendOrigin, StringComparison.OrdinalIgnoreCase);[m
[31m-              })[m
[31m-              .AllowAnyHeader()[m
[31m-              .AllowAnyMethod();[m
[31m-    });[m
[31m-});[m
[31m-[m
[31m-// Dependency Injection[m
[31m-builder.Services.AddSingleton<ReservationService.Data.DatabaseHelper>();[m
[31m-builder.Services.AddScoped<ReservationService.Repositories.ITableRepository, ReservationService.Repositories.TableRepository>();[m
[31m-builder.Services.Configure<AvailabilityRulesOptions>(builder.Configuration.GetSection(AvailabilityRulesOptions.SectionName));[m
[31m-builder.Services.AddSingleton(TimeProvider.System);[m
[31m-builder.Services.AddScoped<ReservationService.Services.ReservationMaintenancePolicy>();[m
[31m-builder.Services.AddScoped<ReservationService.Repositories.IAvailabilityRepository, ReservationService.Repositories.AvailabilityRepository>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IAvailabilitySearchService, ReservationService.Services.AvailabilitySearchService>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IAvailabilitySearchValidator, ReservationService.Services.AvailabilitySearchValidator>();[m
[31m-builder.Services.AddSingleton<ReservationService.Services.IBookingReferenceGenerator, ReservationService.Services.BookingReferenceGenerator>();[m
[31m-// SR-115: Outbox repository is stateless (DatabaseHelper singleton + per-call connections/transactions),[m
[31m-// and must be singleton so the singleton OutboxPublisherService (a hosted service) can consume it directly.[m
[31m-builder.Services.AddSingleton<ReservationService.Repositories.IOutboxRepository, ReservationService.Repositories.OutboxRepository>();[m
[31m-builder.Services.AddScoped<ReservationService.Repositories.IReservationRepository, ReservationService.Repositories.ReservationRepository>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IReservationCreationService, ReservationService.Services.ReservationCreationService>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IReservationRescheduleService, ReservationService.Services.ReservationRescheduleService>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IReservationReportService, ReservationService.Services.ReservationReportService>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IReservationHistoryService, ReservationService.Services.ReservationHistoryService>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IReservationLifecycleService, ReservationService.Services.ReservationLifecycleService>();[m
[31m-builder.Services.AddScoped<ReservationService.Services.IAdminReservationService, ReservationService.Services.AdminReservationService>();[m
[31m-// SR-112: Kafka publisher — singleton producer reused across requests; hosted service polls the outbox.[m
[31m-builder.Services.Configure<ReservationService.Models.KafkaOptions>(builder.Configuration.GetSection(ReservationService.Models.KafkaOptions.SectionName));[m
[31m-builder.Services.AddSingleton<ReservationService.Services.IReservationEventPublisher, ReservationService.Services.ConfluentKafkaPublisher>();[m
[31m-builder.Services.AddHostedService<ReservationService.Services.OutboxPublisherService>();[m
[31m-[m
[31m-var app = builder.Build();[m
[31m-[m
[31m-if (app.Environment.IsDevelopment())[m
[32m+[m[32melse[m
 {[m
[31m-    app.UseSwagger();[m
[31m-    app.UseSwaggerUI(c =>[m
[31m-    {[m
[31m-        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Reservation Service V1");[m
[31m-    });[m
[32m+[m[32m    builder.Services.AddSingleton<[m
[32m+[m[32m        ReservationService.Services.IReservationEventPublisher,[m
[32m+[m[32m        ReservationService.Services.DisabledReservationEventPublisher[m
[32m+[m[32m    >();[m
 }[m
 [m
[31m-app.UseMetricServer();[m
[31m-app.UseHttpMetrics();[m
[31m-[m
[31m-app.UseRouting();[m
[31m-[m
[31m-app.UseCors("AllowFrontend");[m
[31m-[m
[31m-app.UseAuthentication();[m
[31m-app.UseAuthorization();[m
[31m-[m
[31m-app.MapControllers();[m
[31m-[m
[31m-app.Run();[m
[32m+[m[32m// Outbox background service[m
[32m+[m[32mbuilder.Services.AddHostedService<[m
[32m+[m[32m    ReservationService.Services.OutboxPublisherService[m
[32m+[m[32m>();[m
\ No newline at end of file[m
