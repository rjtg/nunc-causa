package sh.nunc.causa.web.projects

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.projects.ProjectFacetResponse
import sh.nunc.causa.projects.ProjectQueryService
import sh.nunc.causa.projects.ProjectSummary
import sh.nunc.causa.tenancy.ProjectRepository
import sh.nunc.causa.users.UserRepository

@RestController
class ProjectsController(
    private val projectQueryService: ProjectQueryService,
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
) {
    @PreAuthorize("@accessPolicy.canListIssues(null)")
    @GetMapping("/projects")
    fun listProjects(
        @RequestParam(required = false) orgId: String?,
        @RequestParam(required = false, name = "q") query: String?,
        @RequestParam(required = false) ownerId: String?,
        @RequestParam(required = false) teamId: String?,
    ): ResponseEntity<List<ProjectSummary>> {
        return ResponseEntity.ok(
            projectQueryService.listProjects(
                orgId = orgId,
                query = query,
                ownerId = ownerId,
                teamId = teamId,
            ),
        )
    }

    @PreAuthorize("@accessPolicy.canListIssues(null)")
    @GetMapping("/projects/facets")
    fun getProjectFacets(
        @RequestParam(required = false) orgId: String?,
        @RequestParam(required = false, name = "q") query: String?,
        @RequestParam(required = false) ownerId: String?,
        @RequestParam(required = false) teamId: String?,
    ): ResponseEntity<ProjectFacetResponse> {
        return ResponseEntity.ok(
            projectQueryService.getProjectFacets(
                orgId = orgId,
                query = query,
                ownerId = ownerId,
                teamId = teamId,
            ),
        )
    }

    @PreAuthorize("@accessPolicy.canModifyProject(#projectId)")
    @PatchMapping("/projects/{projectId}/owner")
    fun assignProjectOwner(
        @PathVariable projectId: String,
        @RequestBody request: AssignProjectOwnerRequest,
    ): ResponseEntity<ProjectSummary> {
        val project = projectRepository.findById(projectId)
            .orElseThrow { NoSuchElementException("Project $projectId not found") }
        val ownerId = request.ownerId
        if (ownerId != null && !userRepository.existsById(ownerId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build()
        }
        project.ownerId = ownerId
        projectRepository.save(project)
        return ResponseEntity.ok(projectQueryService.getProjectSummary(projectId))
    }
}

data class AssignProjectOwnerRequest(
    val ownerId: String?,
)
