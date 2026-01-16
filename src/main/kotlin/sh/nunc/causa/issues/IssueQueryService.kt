package sh.nunc.causa.issues

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class IssueQueryService(
    private val issueRepository: IssueRepository,
    private val searchService: IssueSearchService,
) {
    @Transactional(readOnly = true)
    fun listIssues(
        query: String?,
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: IssueStatus?,
        phaseKind: String?,
    ): List<IssueListView> {
        val results = searchService.searchIssues(
            IssueSearchFilters(
                query = query,
                ownerId = ownerId,
                assigneeId = assigneeId,
                memberId = memberId,
                projectId = projectId,
                status = status?.name,
                phaseKind = phaseKind,
            ),
        )
        return results.map { it.toListView() }
    }

    @Transactional(readOnly = true)
    fun getIssueFacets(
        query: String?,
        ownerId: String?,
        assigneeId: String?,
        memberId: String?,
        projectId: String?,
        status: IssueStatus?,
        phaseKind: String?,
    ): IssueFacetBundle {
        return searchService.facetIssues(
            IssueSearchFilters(
                query = query,
                ownerId = ownerId,
                assigneeId = assigneeId,
                memberId = memberId,
                projectId = projectId,
                status = status?.name,
                phaseKind = phaseKind,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun searchIssues(query: String, projectId: String?): List<IssueListView> {
        val results = searchService.searchIssues(
            IssueSearchFilters(query = query, projectId = projectId),
        )
        return results.map { it.toListView() }
    }

    @Transactional(readOnly = true)
    fun findSimilarIssues(query: String, limit: Int?): List<IssueListView> {
        return emptyList()
    }

    @Transactional(readOnly = true)
    fun buildMyWork(userId: String): MyWorkView {
        val issues = issueRepository.findFiltered(
            projectId = null,
            ownerId = userId,
            assigneeId = userId,
            memberId = userId,
            status = null,
            phaseKind = null,
        )
        val owned = issues.filter { it.owner.id == userId }.map { it.toListView() }
        val assignedPhases = issues.flatMap { issue ->
            issue.phases.filter { it.assignee.id == userId }.map { phase ->
                PhaseWorkView(
                    issueId = issue.id,
                    phaseId = phase.id,
                    phaseName = phase.name,
                    status = phase.status,
                )
            }
        }
        val assignedTasks = issues.flatMap { issue ->
            issue.phases.flatMap { phase ->
                phase.tasks.filter { it.assignee?.id == userId }.map { task ->
                    TaskWorkView(
                        issueId = issue.id,
                        phaseId = phase.id,
                        taskId = task.id,
                        taskTitle = task.title,
                        status = task.status,
                    )
                }
            }
        }
        return MyWorkView(owned, assignedPhases, assignedTasks)
    }

    private fun IssueEntity.toListView(): IssueListView {
        val statusCounts = phases
            .groupingBy { it.status }
            .eachCount()
            .mapValues { it.value.toLong() }
        val phaseProgress = phases.map { phase ->
            val taskStatusCounts = phase.tasks
                .groupingBy { it.status }
                .eachCount()
                .mapValues { it.value.toLong() }
            PhaseProgressView(
                phaseId = phase.id,
                phaseName = phase.name,
                assigneeId = phase.assignee.id,
                phaseKind = phase.kind,
                deadline = phase.deadline?.toString(),
                status = phase.status,
                taskStatusCounts = taskStatusCounts,
                taskTotal = phase.tasks.size.toLong(),
            )
        }
        return IssueListView(
            id = id,
            title = title,
            description = description,
            ownerId = owner.id,
            projectId = projectId,
            phaseCount = phases.size.toLong(),
            phaseStatusCounts = statusCounts,
            phaseProgress = phaseProgress,
            status = status,
            deadline = deadline?.toString(),
        )
    }
}
