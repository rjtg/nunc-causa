package sh.nunc.causa.web.updates

import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import sh.nunc.causa.users.CurrentUserService

@RestController
class UpdatesController(
    private val updateStreamService: UpdateStreamService,
    private val currentUserService: CurrentUserService,
) {
    @GetMapping("/stream/updates")
    @PreAuthorize("@accessPolicy.isAuthenticated()")
    fun streamUpdates(): SseEmitter {
        val userId = currentUserService.currentUserId()
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated")
        return updateStreamService.register(userId)
    }
}
