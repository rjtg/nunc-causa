package sh.nunc.causa.web.updates

import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import sh.nunc.causa.issues.IssueUpdatedEvent

class UiUpdatePublisherTest {
    @Test
    fun `publishes issue update to stream`() {
        val streamService = mockk<UpdateStreamService>(relaxed = true)
        val publisher = UiUpdatePublisher(streamService)

        publisher.onIssueUpdated(IssueUpdatedEvent("issue-1"))

        verify {
            streamService.broadcast(
                UiUpdate(
                    type = "ISSUE_UPDATED",
                    issueId = "issue-1",
                ),
            )
        }
    }
}
