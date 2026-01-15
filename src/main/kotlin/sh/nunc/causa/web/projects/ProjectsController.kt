package sh.nunc.causa.web.projects

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.tenancy.OrgMembershipRepository
import sh.nunc.causa.tenancy.ProjectRepository
import sh.nunc.causa.users.CurrentUserService

@RestController
class ProjectsController(
    private val projectRepository: ProjectRepository,
    private val currentUserService: CurrentUserService,
    private val orgMembershipRepository: OrgMembershipRepository,
) {
    @PreAuthorize("@accessPolicy.canListIssues(null)")
    @GetMapping("/projects")
    fun listProjects(@RequestParam(required = false) orgId: String?): ResponseEntity<List<ProjectSummary>> {
        val orgIds = resolveOrgIds(orgId)
        val projects = if (orgIds.isEmpty()) {
            emptyList()
        } else {
            projectRepository.findAllByOrgIdIn(orgIds)
        }
        return ResponseEntity.ok(
            projects
                .sortedBy { it.name.lowercase() }
                .map { project ->
                    ProjectSummary(
                        id = project.id,
                        key = project.key,
                        name = project.name,
                        orgId = project.orgId,
                        teamId = project.teamId,
                    )
                },
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

data class ProjectSummary(
    val id: String,
    val key: String,
    val name: String,
    val orgId: String,
    val teamId: String,
)
