package sh.nunc.causa.web

import org.springframework.boot.actuate.autoconfigure.security.servlet.EndpointRequest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.factory.PasswordEncoderFactories
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableMethodSecurity
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { csrf -> csrf.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
                    .requestMatchers("/auth/methods").permitAll()
                    .anyRequest().authenticated()
            }
            .httpBasic(Customizer.withDefaults())
        return http.build()
    }

    @Bean
    @Profile("dev")
    fun devUserDetailsService(): UserDetailsService {
        val users = listOf("dev", "ada", "grace", "katherine").map { username ->
            User.withUsername(username)
                .password("{noop}dev")
                .roles("ADMIN")
                .build()
        }
        return InMemoryUserDetailsManager(users)
    }

    @Bean
    @Profile("!dev")
    fun userDetailsService(): UserDetailsService {
        val user = User.withUsername("dev")
            .password("{noop}dev")
            .roles("ADMIN")
            .build()
        return InMemoryUserDetailsManager(user)
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder()
}
