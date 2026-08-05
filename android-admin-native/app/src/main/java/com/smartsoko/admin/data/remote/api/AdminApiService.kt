package com.smartsoko.admin.data.remote.api

import com.smartsoko.admin.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AdminApiService {
    // Auth
    @POST("auth/login")
    suspend fun login(@Body credentials: Map<String, String>): Response<LoginResponse>

    // Notifications
    @GET("admin/notifications")
    suspend fun getNotifications(): Response<List<NotificationDto>>

    @POST("admin/notifications")
    suspend fun createNotification(@Body notification: Map<String, Any>): Response<NotificationDto>

    @POST("admin/notifications/broadcast")
    suspend fun broadcastNotification(@Body payload: Map<String, Any>): Response<Map<String, Any>>

    // RBAC
    @GET("admin/rbac/roles")
    suspend fun getRoles(): Response<List<RoleDto>>

    @POST("admin/rbac/roles")
    suspend fun createRole(@Body role: Map<String, Any>): Response<RoleDto>

    @GET("admin/rbac/assignments")
    suspend fun getAssignments(): Response<List<UserRoleAssignmentDto>>

    @POST("admin/rbac/assign")
    suspend fun assignRole(@Body assignment: Map<String, String>): Response<Map<String, Any>>

    // Payouts
    @GET("admin/payouts")
    suspend fun getPayouts(): Response<List<PayoutDto>>

    @POST("admin/payouts/process")
    suspend fun processPayout(@Body payload: Map<String, Any>): Response<Map<String, Any>>

    // Refunds
    @GET("admin/refunds")
    suspend fun getRefunds(): Response<List<RefundDto>>

    @POST("admin/refunds/{id}/approve")
    suspend fun approveRefund(@Path("id") id: String): Response<Map<String, Any>>

    // Disputes
    @GET("admin/disputes")
    suspend fun getDisputes(): Response<List<DisputeDto>>

    @POST("admin/disputes/{id}/resolve")
    suspend fun resolveDispute(@Path("id") id: String, @Body resolution: Map<String, Any>): Response<Map<String, Any>>

    // Webhooks
    @GET("admin/webhooks")
    suspend fun getWebhooks(): Response<List<WebhookDto>>

    @POST("admin/webhooks")
    suspend fun createWebhook(@Body webhook: Map<String, Any>): Response<WebhookDto>

    @DELETE("admin/webhooks/{id}")
    suspend fun deleteWebhook(@Path("id") id: String): Response<Map<String, Any>>

    // API Keys
    @GET("admin/api-keys")
    suspend fun getApiKeys(): Response<List<ApiKeyDto>>

    @POST("admin/api-keys/generate")
    suspend fun generateApiKey(@Body payload: Map<String, Any>): Response<ApiKeyDto>

    @POST("admin/api-keys/{id}/revoke")
    suspend fun revokeApiKey(@Path("id") id: String): Response<Map<String, Any>>

    // Audit Logs
    @GET("admin/audit-logs")
    suspend fun getAuditLogs(): Response<List<AuditLogDto>>

    // Settings
    @GET("admin/settings")
    suspend fun getSettings(): Response<List<SettingDto>>

    @PUT("admin/settings/{key}")
    suspend fun updateSetting(@Path("key") key: String, @Body value: Map<String, Any>): Response<SettingDto>
}
