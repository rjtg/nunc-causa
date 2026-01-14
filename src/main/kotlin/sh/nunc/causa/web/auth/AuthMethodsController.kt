package sh.nunc.causa.web.auth

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class AuthMethodsController(
    private val authMethodsService: AuthMethodsService,
) {
    @GetMapping("/auth/methods")
    fun getAuthMethods(): AuthMethodsResponse {
        return authMethodsService.getMethods()
    }
}
