package sh.nunc.causa.web

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class CausaApplication

fun main(args: Array<String>) {
    runApplication<CausaApplication>(*args)
}
