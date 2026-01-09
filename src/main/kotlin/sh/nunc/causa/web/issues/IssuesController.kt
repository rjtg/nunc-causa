package sh.nunc.causa.web.issues

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.CreatePhaseCommand
import sh.nunc.causa.issues.IssueCommandHandler
import sh.nunc.causa.issues.IssueId
import sh.nunc.causa.issues.IssueReadService
import sh.nunc.causa.issues.IssueUpdateHandler
import sh.nunc.causa.web.api.IssuesApi
import sh.nunc.causa.web.model.AddPhaseRequest
import sh.nunc.causa.web.model.AddTaskRequest
import sh.nunc.causa.web.model.AssignAssigneeRequest
import sh.nunc.causa.web.model.AssignOwnerRequest
import sh.nunc.causa.web.model.CreateIssueRequest
import sh.nunc.causa.web.model.IssueResponse
import sh.nunc.causa.web.model.IssueSummary

@RestController
class IssuesController(
    private val issueCommandHandler: IssueCommandHandler,
    private val issueUpdateHandler: IssueUpdateHandler,
    private val issueReadService: IssueReadService,
) : IssuesApi {

    override fun createIssue(createIssueRequest: CreateIssueRequest): ResponseEntity<IssueResponse> {
        val issueId = issueCommandHandler.createIssue(
            CreateIssueCommand(
                title = createIssueRequest.title,
                owner = createIssueRequest.owner,
                projectId = createIssueRequest.projectId,
                phases = createIssueRequest.phases.map {
                    CreatePhaseCommand(
                        name = it.name,
                        assignee = it.assignee,
                    )
                },
            ),
        )

        val issue = issueReadService.getIssue(issueId)
        return ResponseEntity.status(HttpStatus.CREATED).body(issue.toResponse())
    }

    override fun getIssue(issueId: String): ResponseEntity<IssueResponse> {
        return ResponseEntity.ok(loadIssue(issueId).toResponse())
    }

    override fun listIssues(
        owner: String?,
        assignee: String?,
        member: String?,
        projectId: String?,
    ): ResponseEntity<List<IssueSummary>> {
        val issues = issueReadService.listIssues(owner, assignee, member, projectId)
        return ResponseEntity.ok(issues.map { it.toSummary() })
    }

    override fun assignIssueOwner(
        issueId: String,
        assignOwnerRequest: AssignOwnerRequest,
    ): ResponseEntity<IssueResponse> {
        withNotFound { issueUpdateHandler.assignOwner(IssueId(issueId), assignOwnerRequest.owner) }
        return ResponseEntity.ok(loadIssue(issueId).toResponse())
    }

    override fun addPhase(
        issueId: String,
        addPhaseRequest: AddPhaseRequest,
    ): ResponseEntity<IssueResponse> {
        withNotFound {
            issueUpdateHandler.addPhase(
                IssueId(issueId),
                addPhaseRequest.name,
                addPhaseRequest.assignee,
            )
        }
        return ResponseEntity.ok(loadIssue(issueId).toResponse())
    }

    override fun assignPhaseAssignee(
        issueId: String,
        phaseId: String,
        assignAssigneeRequest: AssignAssigneeRequest,
    ): ResponseEntity<IssueResponse> {
        withNotFound {
            issueUpdateHandler.assignPhaseAssignee(
                IssueId(issueId),
                phaseId,
                assignAssigneeRequest.assignee,
            )
        }
        return ResponseEntity.ok(loadIssue(issueId).toResponse())
    }

    override fun addTask(
        issueId: String,
        phaseId: String,
        addTaskRequest: AddTaskRequest,
    ): ResponseEntity<IssueResponse> {
        withNotFound {
            issueUpdateHandler.addTask(
                IssueId(issueId),
                phaseId,
                addTaskRequest.title,
                addTaskRequest.assignee,
            )
        }
        return ResponseEntity.ok(loadIssue(issueId).toResponse())
    }

    private fun loadIssue(issueId: String) = withNotFound {
        issueReadService.getIssue(IssueId(issueId))
    }

    private fun <T> withNotFound(block: () -> T): T {
        return try {
            block()
        } catch (ex: NoSuchElementException) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, ex.message, ex)
        }
    }
}
