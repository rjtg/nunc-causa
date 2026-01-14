package sh.nunc.causa.web

import org.springframework.boot.autoconfigure.AutoConfigurationPackage
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication(scanBasePackages = ["sh.nunc.causa"])
@AutoConfigurationPackage(basePackages = ["sh.nunc.causa"])
@EnableScheduling
class CausaApplication

fun main(args: Array<String>) {
    runApplication<CausaApplication>(*args)
}
