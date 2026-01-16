package sh.nunc.causa.issues

import org.springframework.stereotype.Service
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.users.CurrentUserService

@Service
class IssueActivityRecorder(
    private val historyService: IssueHistoryService,
    private val currentUserService: CurrentUserService,
) {
    fun record(issueId: String, type: String, summary: String) {
        historyService.recordActivity(
            issueId = issueId,
            type = type,
            summary = summary,
            actorId = currentUserService.currentUserId(),
        )
    }
}
