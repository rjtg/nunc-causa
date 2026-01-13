package sh.nunc.causa.web.updates

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import sh.nunc.causa.users.CurrentUserService

class UpdatesControllerTest {
    @Test
    fun `streams updates from service`() {
        val service = mockk<UpdateStreamService>()
        val emitter = SseEmitter(0L)
        every { service.register("user-1") } returns emitter
        val currentUserService = mockk<CurrentUserService>()
        every { currentUserService.currentUserId() } returns "user-1"

        val controller = UpdatesController(service, currentUserService)
        val result = controller.streamUpdates()

        assertEquals(emitter, result)
        verify { service.register("user-1") }
    }
}
