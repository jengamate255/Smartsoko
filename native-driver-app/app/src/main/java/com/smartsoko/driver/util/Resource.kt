package com.smartsoko.driver.util

sealed class Resource<out T> {
    data class Success<out T>(val data: T) : Resource<T>()
    data class Error(val message: String, val throwable: Throwable? = null) : Resource<Nothing>()
    data object Loading : Resource<Nothing>()

    companion object {
        fun <T> success(data: T): Resource.Success<T> = Resource.Success(data)
        fun <T> error(message: String, throwable: Throwable? = null): Resource.Error = Resource.Error(message, throwable)
    }
}
