package sh.nunc.causa.projects

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.issues.IssueRepository
import sh.nunc.causa.tenancy.OrgMembershipRepository
import sh.nunc.causa.tenancy.ProjectEntity
import sh.nunc.causa.tenancy.ProjectRepository
import sh.nunc.causa.users.CurrentUserService

@Service
class ProjectQueryService(
    private val projectRepository: ProjectRepository,
    private val issueRepository: IssueRepository,
    private val currentUserService: CurrentUserService,
    private val orgMembershipRepository: OrgMembershipRepository,
) {
    @Transactional(readOnly = true)
    fun listProjects(
        orgId: String?,
        query: String?,
        ownerId: String?,
        teamId: String?,
    ): List<ProjectSummary> {
        val orgIds = resolveOrgIds(orgId)
        if (orgIds.isEmpty()) {
            return emptyList()
        }
        return projectRepository.findAllByOrgIdIn(orgIds)
            .filter { project -> matchesFilters(project, query, ownerId, teamId) }
            .sortedBy { it.name.lowercase() }
            .map { project -> buildSummary(project) }
    }

    @Transactional(readOnly = true)
    fun getProjectFacets(
        orgId: String?,
        query: String?,
        ownerId: String?,
        teamId: String?,
    ): ProjectFacetResponse {
        val orgIds = resolveOrgIds(orgId)
        if (orgIds.isEmpty()) {
            return ProjectFacetResponse(emptyList(), emptyList())
        }
        val filtered = projectRepository.findAllByOrgIdIn(orgIds)
            .filter { project -> matchesFilters(project, query, ownerId, teamId) }
        val owners = filtered.asSequence()
            .mapNotNull { it.ownerId }
            .groupingBy { it }
            .eachCount()
            .map { (id, count) -> ProjectFacetOption(id, count.toLong()) }
            .sortedByDescending { it.count }
        val teams = filtered.asSequence()
            .map { it.teamId }
            .groupingBy { it }
            .eachCount()
            .map { (id, count) -> ProjectFacetOption(id, count.toLong()) }
            .sortedByDescending { it.count }
        return ProjectFacetResponse(owners, teams)
    }

    @Transactional(readOnly = true)
    fun getProjectSummary(projectId: String): ProjectSummary {
        val project = projectRepository.findById(projectId)
            .orElseThrow { NoSuchElementException("Project $projectId not found") }
        return buildSummary(project)
    }

    private fun matchesFilters(
        project: ProjectEntity,
        query: String?,
        ownerId: String?,
        teamId: String?,
    ): Boolean {
        if (!ownerId.isNullOrBlank() && project.ownerId != ownerId) {
            return false
        }
        if (!teamId.isNullOrBlank() && project.teamId != teamId) {
            return false
        }
        val trimmedQuery = query?.trim()
        if (!trimmedQuery.isNullOrBlank()) {
            val normalized = trimmedQuery.lowercase()
            val nameMatches = project.name.lowercase().contains(normalized)
            val keyMatches = project.key.lowercase().contains(normalized)
            if (!nameMatches && !keyMatches) {
                return false
            }
        }
        return true
    }

    private fun buildSummary(project: ProjectEntity): ProjectSummary {
        val issues = issueRepository.findFiltered(
            projectId = project.id,
            ownerId = null,
            assigneeId = null,
            memberId = null,
            status = null,
            phaseKind = null,
        )
        val issueStatusCounts = issues.groupingBy { it.status }
            .eachCount()
            .mapValues { it.value.toLong() }
        val phaseStatusCounts = issues.flatMap { it.phases }
            .groupingBy { it.status }
            .eachCount()
            .mapValues { it.value.toLong() }
        val phaseStatusByIssueStatus = issues.groupBy { it.status }
            .mapValues { (_, groupedIssues) ->
                groupedIssues.flatMap { it.phases }
                    .groupingBy { it.status }
                    .eachCount()
                    .mapValues { it.value.toLong() }
            }
        return ProjectSummary(
            id = project.id,
            key = project.key,
            name = project.name,
            orgId = project.orgId,
            teamId = project.teamId,
            ownerId = project.ownerId,
            issueStatusCounts = issueStatusCounts,
            phaseStatusCounts = phaseStatusCounts,
            phaseStatusByIssueStatus = phaseStatusByIssueStatus,
        )
    }

    private fun resolveOrgIds(orgId: String?): List<String> {
        val userId = currentUserService.currentUserId() ?: return emptyList()
        val memberOrgIds = orgMembershipRepository.findAllByUserId(userId)
            .map { it.orgId }
            .distinct()
        if (!orgId.isNullOrBlank()) {
            return if (memberOrgIds.contains(orgId)) listOf(orgId) else emptyList()
        }
        return memberOrgIds
    }
}
