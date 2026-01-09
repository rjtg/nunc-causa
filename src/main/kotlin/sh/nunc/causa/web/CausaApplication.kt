package sh.nunc.causa.web

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class CausaApplication

fun main(args: Array<String>) {
    runApplication<CausaApplication>(*args)
}
