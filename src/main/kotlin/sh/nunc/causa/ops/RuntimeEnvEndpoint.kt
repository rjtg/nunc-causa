package sh.nunc.causa.ops

import org.springframework.boot.actuate.endpoint.annotation.Endpoint
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation
import org.springframework.core.env.Environment
import org.springframework.stereotype.Component

@Component
@Endpoint(id = "runtime-env")
class RuntimeEnvEndpoint(
    private val environment: Environment,
) {
    @ReadOperation
    fun info(): RuntimeEnvResponse {
        val profiles = environment.activeProfiles.toSet()
        val label = when {
            profiles.contains("dev") -> "dev"
            profiles.contains("test") -> "test"
            profiles.contains("prod") -> "prod"
            else -> "unknown"
        }
        return RuntimeEnvResponse(
            label = label,
            profiles = profiles.sorted(),
        )
    }
}

data class RuntimeEnvResponse(
    val label: String,
    val profiles: List<String>,
)
