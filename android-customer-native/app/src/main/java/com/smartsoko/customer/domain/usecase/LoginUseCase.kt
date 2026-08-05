package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.model.User
import com.smartsoko.customer.domain.repository.AuthRepository
import javax.inject.Inject

class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(email: String, password: String): Result<User> {
        return authRepository.login(email, password)
    }
}
