package sh.nunc.causa.web

import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.RequestMapping

@Controller
class LegacyApiForwardController {
    @RequestMapping("/api/**")
    fun forward(request: HttpServletRequest): String {
        val target = request.requestURI.removePrefix("/api")
        return "forward:$target"
    }
}
