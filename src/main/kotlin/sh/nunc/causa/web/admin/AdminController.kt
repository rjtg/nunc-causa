package sh.nunc.causa.web.admin

import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.tenancy.OrgEntity
import sh.nunc.causa.tenancy.OrgMembershipEntity
import sh.nunc.causa.tenancy.OrgMembershipRepository
import sh.nunc.causa.tenancy.OrgRepository
import sh.nunc.causa.tenancy.ProjectEntity
import sh.nunc.causa.tenancy.ProjectMembershipEntity
import sh.nunc.causa.tenancy.ProjectMembershipRepository
import sh.nunc.causa.tenancy.ProjectRepository
import sh.nunc.causa.tenancy.TeamEntity
import sh.nunc.causa.tenancy.TeamMembershipEntity
import sh.nunc.causa.tenancy.TeamMembershipRepository
import sh.nunc.causa.tenancy.TeamRepository

@RestController
class AdminController(
    private val orgRepository: OrgRepository,
    private val teamRepository: TeamRepository,
    private val projectRepository: ProjectRepository,
    private val orgMembershipRepository: OrgMembershipRepository,
    private val teamMembershipRepository: TeamMembershipRepository,
    private val projectMembershipRepository: ProjectMembershipRepository,
) {
    @PreAuthorize("@accessPolicy.isAuthenticated()")
    @PostMapping("/admin/orgs")
    fun createOrg(@RequestBody request: CreateOrgRequest): ResponseEntity<OrgEntity> {
        val org = OrgEntity(
            id = UUID.randomUUID().toString(),
            name = request.name,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(orgRepository.save(org))
    }

    @PreAuthorize("@accessPolicy.isAuthenticated()")
    @PostMapping("/admin/teams")
    fun createTeam(@RequestBody request: CreateTeamRequest): ResponseEntity<TeamEntity> {
        val team = TeamEntity(
            id = UUID.randomUUID().toString(),
            orgId = request.orgId,
            parentTeamId = request.parentTeamId,
            name = request.name,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(teamRepository.save(team))
    }

    @PreAuthorize("@accessPolicy.isAuthenticated()")
    @PostMapping("/admin/projects")
    fun createProject(@RequestBody request: CreateProjectRequest): ResponseEntity<ProjectEntity> {
        val project = ProjectEntity(
            id = UUID.randomUUID().toString(),
            orgId = request.orgId,
            teamId = request.teamId,
            name = request.name,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(projectRepository.save(project))
    }

    @PreAuthorize("@accessPolicy.isAuthenticated()")
    @PostMapping("/admin/memberships/org")
    fun addOrgMembership(@RequestBody request: CreateOrgMembershipRequest): ResponseEntity<OrgMembershipEntity> {
        val membership = OrgMembershipEntity(
            id = UUID.randomUUID().toString(),
            orgId = request.orgId,
            userId = request.userId,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(orgMembershipRepository.save(membership))
    }

    @PreAuthorize("@accessPolicy.isAuthenticated()")
    @PostMapping("/admin/memberships/team")
    fun addTeamMembership(@RequestBody request: CreateTeamMembershipRequest): ResponseEntity<TeamMembershipEntity> {
        val membership = TeamMembershipEntity(
            id = UUID.randomUUID().toString(),
            teamId = request.teamId,
            userId = request.userId,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(teamMembershipRepository.save(membership))
    }

    @PreAuthorize("@accessPolicy.isAuthenticated()")
    @PostMapping("/admin/memberships/project")
    fun addProjectMembership(@RequestBody request: CreateProjectMembershipRequest): ResponseEntity<ProjectMembershipEntity> {
        val membership = ProjectMembershipEntity(
            id = UUID.randomUUID().toString(),
            projectId = request.projectId,
            userId = request.userId,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(projectMembershipRepository.save(membership))
    }
}

data class CreateOrgRequest(
    val name: String,
)

data class CreateTeamRequest(
    val orgId: String,
    val parentTeamId: String?,
    val name: String,
)

data class CreateProjectRequest(
    val orgId: String,
    val teamId: String,
    val name: String,
)

data class CreateOrgMembershipRequest(
    val orgId: String,
    val userId: String,
)

data class CreateTeamMembershipRequest(
    val teamId: String,
    val userId: String,
)

data class CreateProjectMembershipRequest(
    val projectId: String,
    val userId: String,
)
