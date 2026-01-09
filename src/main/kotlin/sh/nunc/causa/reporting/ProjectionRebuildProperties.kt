package sh.nunc.causa.reporting

import java.time.Duration
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("causa.projections.rebuild")
data class ProjectionRebuildProperties(
    val maxRetries: Int = 2,
    val delay: Duration = Duration.ofMillis(200),
)
