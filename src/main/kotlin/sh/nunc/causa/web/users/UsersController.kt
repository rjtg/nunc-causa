package sh.nunc.causa.web.users

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.users.UserRepository

@RestController
class UsersController(
    private val userRepository: UserRepository,
) {
    @PreAuthorize("@accessPolicy.canListIssues(null)")
    @GetMapping("/users")
    fun listUsers(@RequestParam(required = false) q: String?): ResponseEntity<List<UserSummary>> {
        val users = if (q.isNullOrBlank()) {
            userRepository.findAll()
        } else {
            userRepository.searchByQuery(q)
        }
        return ResponseEntity.ok(
            users.map { user ->
                UserSummary(
                    id = user.id,
                    displayName = user.displayName,
                    email = user.email,
                )
            },
        )
    }
}

data class UserSummary(
    val id: String,
    val displayName: String,
    val email: String?,
)
