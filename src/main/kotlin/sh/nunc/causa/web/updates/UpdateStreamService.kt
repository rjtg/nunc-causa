package sh.nunc.causa.web.updates

import java.io.IOException
import java.util.concurrent.CopyOnWriteArrayList
import org.springframework.stereotype.Service
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@Service
class UpdateStreamService {
    private val emitters = CopyOnWriteArrayList<SseEmitter>()
    private val heartbeatEvent = SseEmitter.event().comment("keepalive")

    fun register(): SseEmitter {
        val emitter = SseEmitter(0L)
        emitters.add(emitter)
        emitter.onCompletion { emitters.remove(emitter) }
        emitter.onTimeout { emitters.remove(emitter) }
        emitter.onError { emitters.remove(emitter) }
        return emitter
    }

    fun broadcast(update: UiUpdate) {
        val event = SseEmitter.event()
            .name(update.type)
            .data(update)
        emitters.forEach { emitter ->
            try {
                emitter.send(event)
            } catch (ex: IOException) {
                emitters.remove(emitter)
            }
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "\${causa.updates.keepalive-ms:15000}")
    fun keepalive() {
        emitters.forEach { emitter ->
            try {
                emitter.send(heartbeatEvent)
            } catch (ex: IOException) {
                emitters.remove(emitter)
            }
        }
    }
}
