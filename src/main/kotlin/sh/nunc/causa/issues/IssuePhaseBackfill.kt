package sh.nunc.causa.issues

import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component

@Component
class IssuePhaseBackfill(
    private val issueService: IssueService,
) : ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        issueService.backfillMissingPhases()
    }
}
