package sh.nunc.causa.reporting

import dev.failsafe.Failsafe
import dev.failsafe.RetryPolicy
import java.time.Duration
import org.springframework.stereotype.Service
import sh.nunc.causa.issues.Issue

@Service
class ProjectionRebuildService(
    private val projectionUpdater: IssueProjectionUpdater,
    private val properties: ProjectionRebuildProperties,
) {
    private val retryPolicy = RetryPolicy.builder<Unit>()
        .handle(Exception::class.java)
        .withDelay(properties.delay)
        .withMaxRetries(properties.maxRetries)
        .build()

    fun rebuildIssue(issue: Issue) {
        Failsafe.with(retryPolicy).run {
            projectionUpdater.rebuild(issue)
        }
    }
}
