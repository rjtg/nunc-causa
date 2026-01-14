package sh.nunc.causa.web.projects

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.tenancy.ProjectRepository

@RestController
class ProjectsController(
    private val projectRepository: ProjectRepository,
) {
    @PreAuthorize("@accessPolicy.canListIssues(null)")
    @GetMapping("/projects")
    fun listProjects(@RequestParam(required = false) orgId: String?): ResponseEntity<List<ProjectSummary>> {
        val projects = if (orgId.isNullOrBlank()) {
            projectRepository.findAll()
        } else {
            projectRepository.findAll().filter { it.orgId == orgId }
        }
        return ResponseEntity.ok(
            projects.map { project ->
                ProjectSummary(
                    id = project.id,
                    name = project.name,
                    orgId = project.orgId,
                    teamId = project.teamId,
                )
            },
        )
    }
}

data class ProjectSummary(
    val id: String,
    val name: String,
    val orgId: String,
    val teamId: String,
)
