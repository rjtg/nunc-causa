package sh.nunc.causa.web

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication(scanBasePackages = ["sh.nunc.causa"])
@EnableJpaRepositories(basePackages = ["sh.nunc.causa"])
@EntityScan(basePackages = ["sh.nunc.causa"])
@EnableScheduling
class CausaApplication

fun main(args: Array<String>) {
    runApplication<CausaApplication>(*args)
}
