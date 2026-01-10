package sh.nunc.causa.web.updates

import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import sh.nunc.causa.issues.IssueUpdatedEvent

@Component
class UiUpdatePublisher(
    private val updateStreamService: UpdateStreamService,
) {
    @EventListener
    fun onIssueUpdated(event: IssueUpdatedEvent) {
        updateStreamService.broadcast(
            UiUpdate(
                type = "ISSUE_UPDATED",
                issueId = event.issueId,
            ),
        )
    }
}
