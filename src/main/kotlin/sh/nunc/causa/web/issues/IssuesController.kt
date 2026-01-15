package sh.nunc.causa.web.issues

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import jakarta.validation.Valid
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.CreatePhaseCommand
import sh.nunc.causa.issues.IssueCommentService
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.issues.IssueStatus
import sh.nunc.causa.issues.PhaseStatus
import sh.nunc.causa.issues.TaskStatus
import sh.nunc.causa.reporting.IssueHistoryService
import sh.nunc.causa.web.api.IssuesApi
import sh.nunc.causa.tenancy.AccessPolicyService
import sh.nunc.causa.web.model.AddCommentRequest
import sh.nunc.causa.web.model.AddPhaseRequest
import sh.nunc.causa.web.model.AddTaskRequest
import sh.nunc.causa.web.model.AssignAssigneeRequest
import sh.nunc.causa.web.model.AssignOwnerRequest
import sh.nunc.causa.web.model.CommentReadRequest
import sh.nunc.causa.web.model.CommentReadResponse
import sh.nunc.causa.web.model.CommentResponse
import sh.nunc.causa.web.model.CreateIssueRequest
import sh.nunc.causa.web.model.IssueCommentsResponse
import sh.nunc.causa.web.model.IssueDetail
import sh.nunc.causa.web.model.IssueFacetResponse
import sh.nunc.causa.web.model.IssueHistoryResponse
import sh.nunc.causa.web.model.IssueListItem
import sh.nunc.causa.web.model.UpdateIssueRequest
import sh.nunc.causa.web.model.UpdatePhaseRequest
import sh.nunc.causa.web.model.UpdateTaskRequest

@RestController
class IssuesController(
    private val issueService: IssueService,
    private val accessPolicy: AccessPolicyService,
    private val issueCommentService: IssueCommentService,
    private val issueHistoryService: IssueHistoryService,
    private val issueActionService: IssueActionService,
) : IssuesApi {

    @PreAuthorize("@accessPolicy.canCreateIssue(#createIssueRequest.projectId)")
    override fun createIssue(@Valid @RequestBody createIssueRequest: CreateIssueRequest): ResponseEntity<IssueDetail> {
        val issue = issueService.createIssue(
            CreateIssueCommand(
                title = createIssueRequest.title,
                description = createIssueRequest.description,
                ownerId = createIssueRequest.ownerId,
                projectId = createIssueRequest.projectId,
                deadline = createIssueRequest.deadline,
                phases = createIssueRequest.phases.map {
                    CreatePhaseCommand(
                        name = it.name,
                        assigneeId = it.assigneeId,
                        kind = it.kind?.name,
                        deadline = it.deadline,
                    )
                },
            ),
        )

        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun getIssue(issueId: String): ResponseEntity<IssueDetail> {
        val detail = withNotFound { issueService.getIssueDetail(issueId) }
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canListIssues(#projectId)")
    override fun listIssues(
        ownerId: String?,
        query: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: sh.nunc.causa.web.model.IssueStatus?,
        phaseKind: sh.nunc.causa.web.model.PhaseKind?,
    ): ResponseEntity<List<IssueListItem>> {
        val currentUserId = accessPolicy.currentUserId()
        val effectiveMemberId = memberId ?: currentUserId
        val issues = issueService.listIssues(
            query,
            ownerId,
            assigneeId,
            effectiveMemberId,
            projectId,
            status?.let { IssueStatus.valueOf(it.name) },
            phaseKind?.name,
        )
        return ResponseEntity.ok(issues.map { it.toListItem() })
    }

    @PreAuthorize("@accessPolicy.canListIssues(null)")
    override fun findSimilarIssues(query: String, limit: Int?): ResponseEntity<List<IssueListItem>> {
        val results = issueService.findSimilarIssues(query, limit)
        return ResponseEntity.ok(results.map { it.toListItem() })
    }

    @PreAuthorize("@accessPolicy.canListIssues(#projectId)")
    override fun getIssueFacets(
        query: String?,
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: sh.nunc.causa.web.model.IssueStatus?,
        phaseKind: sh.nunc.causa.web.model.PhaseKind?,
    ): ResponseEntity<IssueFacetResponse> {
        val currentUserId = accessPolicy.currentUserId()
        val effectiveMemberId = memberId ?: currentUserId
        val facets = issueService.getIssueFacets(
            query,
            ownerId,
            assigneeId,
            effectiveMemberId,
            projectId,
            status?.let { IssueStatus.valueOf(it.name) },
            phaseKind?.name,
        )
        return ResponseEntity.ok(facets.toFacetResponse())
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun updateIssue(
        issueId: String,
        @Valid @RequestBody updateIssueRequest: UpdateIssueRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.updateIssue(
                issueId,
                updateIssueRequest.title,
                updateIssueRequest.ownerId,
                updateIssueRequest.projectId,
                updateIssueRequest.description,
                updateIssueRequest.deadline,
            )
        }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun assignIssueOwner(
        issueId: String,
        @Valid @RequestBody assignOwnerRequest: AssignOwnerRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.assignOwner(issueId, assignOwnerRequest.ownerId) }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun addPhase(
        issueId: String,
        @Valid @RequestBody addPhaseRequest: AddPhaseRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.addPhase(
                issueId,
                addPhaseRequest.name,
                addPhaseRequest.assigneeId,
                addPhaseRequest.kind?.name,
                addPhaseRequest.deadline,
            )
        }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun assignPhaseAssignee(
        issueId: String,
        phaseId: String,
        @Valid @RequestBody assignAssigneeRequest: AssignAssigneeRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.assignPhaseAssignee(
                issueId,
                phaseId,
                assignAssigneeRequest.assigneeId,
            )
        }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun addTask(
        issueId: String,
        phaseId: String,
        @Valid @RequestBody addTaskRequest: AddTaskRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withNotFound {
            issueService.addTask(
                issueId,
                phaseId,
                addTaskRequest.title,
                addTaskRequest.assigneeId,
                addTaskRequest.startDate,
                addTaskRequest.dueDate,
                addTaskRequest.dependencies?.map {
                    sh.nunc.causa.issues.TaskDependencyView(
                        type = it.type.name,
                        targetId = it.targetId,
                    )
                },
            )
        }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun updatePhase(
        issueId: String,
        phaseId: String,
        @Valid @RequestBody updatePhaseRequest: UpdatePhaseRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withConflict {
            withNotFound {
                issueService.updatePhase(
                    issueId,
                    phaseId,
                    updatePhaseRequest.name,
                    updatePhaseRequest.assigneeId,
                    updatePhaseRequest.status?.let { PhaseStatus.valueOf(it.name) },
                    updatePhaseRequest.completionComment,
                    updatePhaseRequest.completionArtifactUrl?.toString(),
                    updatePhaseRequest.kind?.name,
                    updatePhaseRequest.deadline,
                )
            }
        }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun updateTask(
        issueId: String,
        phaseId: String,
        taskId: String,
        @Valid @RequestBody updateTaskRequest: UpdateTaskRequest,
    ): ResponseEntity<IssueDetail> {
        val issue = withConflict {
            withNotFound {
                issueService.updateTask(
                    issueId,
                    phaseId,
                    taskId,
                    updateTaskRequest.title,
                    updateTaskRequest.assigneeId,
                    updateTaskRequest.status?.let { TaskStatus.valueOf(it.name) },
                    updateTaskRequest.startDate,
                    updateTaskRequest.dueDate,
                    updateTaskRequest.dependencies?.map {
                        sh.nunc.causa.issues.TaskDependencyView(
                            type = it.type.name,
                            targetId = it.targetId,
                        )
                    },
                )
            }
        }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun closeIssue(issueId: String): ResponseEntity<IssueDetail> {
        val issue = withConflict { withNotFound { issueService.closeIssue(issueId) } }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun abandonIssue(issueId: String): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.abandonIssue(issueId) }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun failPhase(issueId: String, phaseId: String): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.failPhase(issueId, phaseId) }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canModifyIssue(#issueId)")
    override fun reopenPhase(issueId: String, phaseId: String): ResponseEntity<IssueDetail> {
        val issue = withNotFound { issueService.reopenPhase(issueId, phaseId) }
        val detail = issueService.getIssueDetail(issue.id)
        return ResponseEntity.ok(detail.toDetail(issueActionService))
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun getIssueHistory(issueId: String): ResponseEntity<IssueHistoryResponse> {
        return ResponseEntity.ok(issueHistoryService.getHistory(issueId))
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun listIssueComments(issueId: String): ResponseEntity<IssueCommentsResponse> {
        val thread = issueCommentService.listComments(issueId)
        return ResponseEntity.ok(
            IssueCommentsResponse(
                comments = thread.comments,
                unreadCount = thread.unreadCount,
                lastReadAt = thread.lastReadAt,
                latestCommentAt = thread.latestCommentAt,
                firstUnreadCommentId = thread.firstUnreadCommentId,
            ),
        )
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun addIssueComment(
        issueId: String,
        @Valid @RequestBody addCommentRequest: AddCommentRequest,
    ): ResponseEntity<CommentResponse> {
        val comment = issueCommentService.addComment(issueId, addCommentRequest)
        return ResponseEntity.status(HttpStatus.CREATED).body(comment)
    }

    @PreAuthorize("@accessPolicy.canViewIssue(#issueId)")
    override fun markIssueCommentsRead(
        issueId: String,
        @Valid @RequestBody commentReadRequest: CommentReadRequest?,
    ): ResponseEntity<CommentReadResponse> {
        val read = issueCommentService.markRead(issueId, commentReadRequest?.lastReadCommentId)
        return ResponseEntity.ok(
            CommentReadResponse(
                lastReadAt = read.lastReadAt,
                unreadCount = read.unreadCount,
                latestCommentAt = read.latestCommentAt,
            ),
        )
    }

    private fun loadIssue(issueId: String) = withNotFound {
        issueService.getIssue(issueId)
    }

    private fun <T> withNotFound(block: () -> T): T {
        return try {
            block()
        } catch (ex: NoSuchElementException) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, ex.message, ex)
        }
    }

    private fun <T> withConflict(block: () -> T): T {
        return try {
            block()
        } catch (ex: IllegalStateException) {
            throw ResponseStatusException(HttpStatus.CONFLICT, ex.message, ex)
        }
    }
}
