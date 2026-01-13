package sh.nunc.causa.web.issues

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.CreatePhaseCommand
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.web.api.IssuesApi
import sh.nunc.causa.web.model.AddCommentRequest
import sh.nunc.causa.web.model.AddPhaseRequest
import sh.nunc.causa.web.model.AddTaskRequest
import sh.nunc.causa.web.model.AssignAssigneeRequest
import sh.nunc.causa.web.model.AssignOwnerRequest
import sh.nunc.causa.web.model.CommentResponse
import sh.nunc.causa.web.model.CreateIssueRequest
import sh.nunc.causa.web.model.IssueDetail
import sh.nunc.causa.web.model.IssueHistoryResponse
import sh.nunc.causa.web.model.IssueListItem
import sh.nunc.causa.web.model.UpdateIssueRequest
import sh.nunc.causa.web.model.UpdatePhaseRequest
import sh.nunc.causa.web.model.UpdateTaskRequest
import java.time.OffsetDateTime
import java.util.UUID

@RestController
class IssuesController(
    private val issueService: IssueService,
) : IssuesApi {

    @PreAuthorize("@accessPolicy.canCreateIssue(#createIssueRequest.projectId)")
    override fun createIssue(createIssueRequest: CreateIssueRequest): ResponseEntity<IssueDetail> {
        val issue = issueService.createIssue(
            CreateIssueCommand(
                title = createIssueRequest.title,
                ownerId = createIssueRequest.ownerId,
                projectId = createIssueRequest.projectId,
                phases = createIssueRequest.phases.map {
                    CreatePhaseCommand(
                        name = it.name,
                        assigneeId = it.assigneeId,
                        kind = it.kind?.name,
                    )
                },
            ),
        )

        return ResponseEntity.status(HttpStatus.CREATED).body(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun getIssue(issueId: String): ResponseEntity<IssueDetail> {
        return ResponseEntity.ok(loadIssue(issueId).toDetail())
    }

    @PreAuthorize("@accessPolicy.canListIssues(#projectId)")
    override fun listIssues(
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: sh.nunc.causa.web.model.IssueStatus?,
        phaseKind: sh.nunc.causa.web.model.PhaseKind?,
    ): ResponseEntity<List<IssueListItem>> {
        val issues = issueService.listIssues(
            ownerId,
            assigneeId,
            memberId,
            projectId,
            status?.let { IssueStatus.valueOf(it.name) },
            phaseKind?.name,
        )
        return ResponseEntity.ok(issues.map { it.toListItem() })
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun updateIssue(
        issueId: String,
        updateIssueRequest: UpdateIssueRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.updateIssue(
                issueId,
                updateIssueRequest.title,
                updateIssueRequest.ownerId,
                updateIssueRequest.projectId,
            )
        }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun assignIssueOwner(
        issueId: String,
        assignOwnerRequest: AssignOwnerRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.assignOwner(issueId, assignOwnerRequest.ownerId) }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun addPhase(
        issueId: String,
        addPhaseRequest: AddPhaseRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.addPhase(
                issueId,
                addPhaseRequest.name,
                addPhaseRequest.assigneeId,
                addPhaseRequest.kind?.name,
            )
        }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun assignPhaseAssignee(
        issueId: String,
        phaseId: String,
        assignAssigneeRequest: AssignAssigneeRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.assignPhaseAssignee(
                issueId,
                phaseId,
                assignAssigneeRequest.assigneeId,
            )
        }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun addTask(
        issueId: String,
        phaseId: String,
        addTaskRequest: AddTaskRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.addTask(
                issueId,
                phaseId,
                addTaskRequest.title,
                addTaskRequest.assigneeId,
            )
        }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun updatePhase(
        issueId: String,
        phaseId: String,
        updatePhaseRequest: UpdatePhaseRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.updatePhase(
                issueId,
                phaseId,
                updatePhaseRequest.name,
                updatePhaseRequest.assigneeId,
                updatePhaseRequest.status?.let { PhaseStatus.valueOf(it.name) },
                updatePhaseRequest.kind?.name,
            )
        }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun updateTask(
        issueId: String,
        phaseId: String,
        taskId: String,
        updateTaskRequest: UpdateTaskRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.updateTask(
                issueId,
                phaseId,
                taskId,
                updateTaskRequest.title,
                updateTaskRequest.assigneeId,
                updateTaskRequest.status?.let { TaskStatus.valueOf(it.name) },
            )
        }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun closeIssue(issueId: String): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.closeIssue(issueId) }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun failPhase(issueId: String, phaseId: String): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.failPhase(issueId, phaseId) }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun reopenPhase(issueId: String, phaseId: String): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.reopenPhase(issueId, phaseId) }
        return ResponseEntity.ok(issue.toDetail())
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun getIssueHistory(issueId: String): ResponseEntity<IssueHistoryResponse> {
        val history = IssueHistoryResponse(activity = emptyList(), audit = emptyList())
        return ResponseEntity.ok(history)
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun listIssueComments(issueId: String): ResponseEntity<List<CommentResponse>> {
        val comments = commentsForIssue(issueId)
        return ResponseEntity.ok(comments)
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun addIssueComment(
        issueId: String,
        addCommentRequest: AddCommentRequest,
    ): ResponseEntity<CommentResponse> {
        val comment = CommentResponse(
            id = UUID.randomUUID().toString(),
            issueId = issueId,
            authorId = "system",
            body = addCommentRequest.body,
            createdAt = OffsetDateTime.now(),
        )
        issueComments.getOrPut(issueId) { mutableListOf() }.add(comment)
        return ResponseEntity.status(HttpStatus.CREATED).body(comment)
    }

    private fun loadIssue(issueId: String) = withNotFound {
        issueService.getIssue(issueId)
    }

    private fun commentsForIssue(issueId: String): List<CommentResponse> {
        return issueComments[issueId].orEmpty()
    }

    companion object {
        private val issueComments: MutableMap<String, MutableList<CommentResponse>> = mutableMapOf()
    }

    private fun <T> withNotFound(block: () -> T): T {
        return try {
            block()
        } catch (ex: NoSuchElementException) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, ex.message, ex)
        }
    }
}
