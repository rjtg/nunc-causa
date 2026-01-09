package sh.nunc.causa.reporting

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(ProjectionRebuildProperties::class)
class ProjectionRebuildConfig
