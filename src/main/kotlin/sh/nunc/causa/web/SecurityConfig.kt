package sh.nunc.causa.web

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
                csrf.ignoringRequestMatchers("/actuator/**")
            }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                    .requestMatchers("/actuator/issue-projections/**").hasAuthority("PROJECTION_MANAGE")
                    .anyRequest().permitAll()
            }
            .httpBasic(Customizer.withDefaults())
        return http.build()
    }
}
