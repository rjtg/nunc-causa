package sh.nunc.causa.web.work

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.users.CurrentUserService
import sh.nunc.causa.web.api.WorkApi
import sh.nunc.causa.web.issues.toListItem
import sh.nunc.causa.web.model.MyWorkResponse
import sh.nunc.causa.web.model.PhaseStatus as ApiPhaseStatus
import sh.nunc.causa.web.model.PhaseWorkItem
import sh.nunc.causa.web.model.TaskStatus as ApiTaskStatus
import sh.nunc.causa.web.model.TaskWorkItem

@RestController
class WorkController(
    private val issueService: IssueService,
    private val currentUserService: CurrentUserService,
) : WorkApi {
    @PreAuthorize("@accessPolicy.canAccessWork()")
    override fun getMyWork(): ResponseEntity<MyWorkResponse> {
        val userId = currentUserService.currentUserId()
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val work = issueService.buildMyWork(userId)
        val response = MyWorkResponse(
            ownedIssues = work.ownedIssues.map { it.toListItem() },
            assignedPhases = work.assignedPhases.map { phase ->
                PhaseWorkItem(
                    issueId = phase.issueId,
                    phaseId = phase.phaseId,
                    phaseName = phase.phaseName,
                    status = ApiPhaseStatus.valueOf(phase.status),
                )
            },
            assignedTasks = work.assignedTasks.map { task ->
                TaskWorkItem(
                    issueId = task.issueId,
                    phaseId = task.phaseId,
                    taskId = task.taskId,
                    taskTitle = task.taskTitle,
                    status = ApiTaskStatus.valueOf(task.status),
                )
            },
        )
        return ResponseEntity.ok(response)
    }
}
