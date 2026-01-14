package sh.nunc.causa.web.auth

import org.springframework.core.env.Environment
import org.springframework.stereotype.Service

@Service
class AuthMethodsService(
    private val authProperties: AuthProperties,
    private val environment: Environment,
) {
    fun getMethods(): AuthMethodsResponse {
        val methods = mutableListOf<AuthMethod>()
        if (environment.activeProfiles.contains("dev")) {
            methods.add(
                AuthMethod(
                    type = "basic",
                    label = "Username + Password",
                    authorizeUrl = null,
                ),
            )
        }
        authProperties.oauthProviders.forEach { provider ->
            methods.add(
                AuthMethod(
                    type = provider.id,
                    label = provider.label,
                    authorizeUrl = provider.authorizeUrl,
                ),
            )
        }
        return AuthMethodsResponse(methods = methods)
    }
}
