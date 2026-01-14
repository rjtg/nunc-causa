package sh.nunc.causa.web.auth

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "causa.auth")
class AuthProperties {
    var basicEnabled: Boolean = false
    var oauthProviders: List<OAuthProvider> = emptyList()
}

data class OAuthProvider(
    var id: String = "",
    var label: String = "",
    var authorizeUrl: String = "",
)

data class AuthMethodsResponse(
    val methods: List<AuthMethod>,
)

data class AuthMethod(
    val type: String,
    val label: String,
    val authorizeUrl: String?,
)
