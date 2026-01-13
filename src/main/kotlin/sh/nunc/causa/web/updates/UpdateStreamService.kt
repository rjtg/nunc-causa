package sh.nunc.causa.web.updates

import java.io.IOException
import java.util.concurrent.CopyOnWriteArrayList
import org.springframework.stereotype.Service
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.tenancy.ProjectMembershipRepository

@Service
class UpdateStreamService(
    private val issueRepository: IssueRepository,
    private val projectMembershipRepository: ProjectMembershipRepository,
) {
    private val emitters = CopyOnWriteArrayList<UserEmitter>()
    private val heartbeatEvent = SseEmitter.event().comment("keepalive")

    fun register(userId: String): SseEmitter {
        val emitter = SseEmitter(0L)
        val wrapper = UserEmitter(userId, emitter)
        emitters.add(wrapper)
        emitter.onCompletion { emitters.remove(wrapper) }
        emitter.onTimeout { emitters.remove(wrapper) }
        emitter.onError { emitters.remove(wrapper) }
        return emitter
    }

    fun broadcast(update: UiUpdate) {
        val issue = issueRepository.findById(update.issueId).orElse(null) ?: return
        val projectId = issue.projectId ?: return
        val event = SseEmitter.event()
            .name(update.type)
            .data(update)
        emitters.forEach { wrapper ->
            try {
                if (projectMembershipRepository.existsByUserIdAndProjectId(wrapper.userId, projectId)) {
                    wrapper.emitter.send(event)
                }
            } catch (ex: IOException) {
                emitters.remove(wrapper)
            }
        }
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "\${causa.updates.keepalive-ms:15000}")
    fun keepalive() {
        emitters.forEach { wrapper ->
            try {
                wrapper.emitter.send(heartbeatEvent)
            } catch (ex: IOException) {
                emitters.remove(wrapper)
            }
        }
    }

    private data class UserEmitter(
        val userId: String,
        val emitter: SseEmitter,
    )
}
