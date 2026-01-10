package sh.nunc.causa.web.updates

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
class UpdatesController(
    private val updateStreamService: UpdateStreamService,
) {
    @GetMapping("/stream/updates")
    fun streamUpdates(): SseEmitter = updateStreamService.register()
}
