package sh.nunc.causa.web

import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { csrf ->
                csrf.ignoringRequestMatchers(EndpointRequest.toAnyEndpoint())
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
                    .anyRequest().permitAll()
            }
            .httpBasic(Customizer.withDefaults())
        return http.build()
    }
}
