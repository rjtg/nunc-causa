package sh.nunc.causa.users

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service

@Service
class CurrentUserService {
    fun currentUserId(): String? {
        val authentication = SecurityContextHolder.getContext().authentication
        val name = authentication?.name
        return if (name == null || name == "anonymousUser") null else name
    }
}
