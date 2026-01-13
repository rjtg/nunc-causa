package sh.nunc.causa.web.updates

import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test

class UpdateStreamServiceTest {
    @Test
    fun `register returns emitter`() {
        val service = UpdateStreamService()

        val emitter = service.register()

        assertNotNull(emitter)
    }

    @Test
    fun `broadcast and keepalive do not fail without emitters`() {
        val service = UpdateStreamService()

        service.broadcast(UiUpdate(type = "ISSUE_UPDATED", issueId = "issue-1"))
        service.keepalive()
    }
}
