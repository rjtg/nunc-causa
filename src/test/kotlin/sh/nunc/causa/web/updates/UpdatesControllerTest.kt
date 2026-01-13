package sh.nunc.causa.web.updates

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

class UpdatesControllerTest {
    @Test
    fun `streams updates from service`() {
        val service = mockk<UpdateStreamService>()
        val emitter = SseEmitter(0L)
        every { service.register() } returns emitter

        val controller = UpdatesController(service)
        val result = controller.streamUpdates()

        assertEquals(emitter, result)
        verify { service.register() }
    }
}
