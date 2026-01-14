package sh.nunc.causa.dev

import io.github.serpro69.kfaker.Faker
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.issues.CreateIssueCommand
import sh.nunc.causa.issues.CreatePhaseCommand
import sh.nunc.causa.issues.IssueService
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
import sh.nunc.causa.users.UserEntity
import sh.nunc.causa.users.UserRepository
import java.util.UUID

@Profile("dev")
@Component
class DevDataSeeder(
    private val orgRepository: OrgRepository,
    private val teamRepository: TeamRepository,
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
    private val orgMembershipRepository: OrgMembershipRepository,
    private val teamMembershipRepository: TeamMembershipRepository,
    private val projectMembershipRepository: ProjectMembershipRepository,
    private val issueService: IssueService,
) : ApplicationRunner {

    @Transactional
    override fun run(args: ApplicationArguments?) {
        if (orgRepository.existsById(ORG_ID)) {
            return
        }
        val faker = Faker()

        val org = orgRepository.save(OrgEntity(id = ORG_ID, name = "Causa Labs"))
        val platformTeam = teamRepository.save(
            TeamEntity(id = TEAM_PLATFORM_ID, orgId = org.id, parentTeamId = null, name = "Platform"),
        )
        val reliabilityTeam = teamRepository.save(
            TeamEntity(id = TEAM_RELIABILITY_ID, orgId = org.id, parentTeamId = null, name = "Reliability"),
        )

        val alphaProject = projectRepository.save(
            ProjectEntity(
                id = PROJECT_ALPHA_ID,
                key = "ALPHA",
                orgId = org.id,
                teamId = platformTeam.id,
                name = "Alpha",
            ),
        )
        val beaconProject = projectRepository.save(
            ProjectEntity(
                id = PROJECT_BEACON_ID,
                key = "BEACON",
                orgId = org.id,
                teamId = reliabilityTeam.id,
                name = "Beacon",
            ),
        )

        val baseUsers = listOf(
            UserEntity(id = "dev", displayName = "Dev User", email = "dev@causa.local"),
            UserEntity(id = "ada", displayName = "Ada Lovelace", email = "ada@causa.local"),
            UserEntity(id = "grace", displayName = "Grace Hopper", email = "grace@causa.local"),
            UserEntity(id = "katherine", displayName = "Katherine Johnson", email = "katherine@causa.local"),
        )
        val extraUsers = (1..6).map { index ->
            UserEntity(
                id = "user-$index",
                displayName = faker.name.name(),
                email = faker.internet.email(),
            )
        }
        val users = userRepository.saveAll(baseUsers + extraUsers)

        users.forEach { user ->
            orgMembershipRepository.save(
                OrgMembershipEntity(id = UUID.randomUUID().toString(), orgId = org.id, userId = user.id),
            )
        }

        users.forEachIndexed { index, user ->
            val teamId = if (index % 2 == 0) platformTeam.id else reliabilityTeam.id
            teamMembershipRepository.save(
                TeamMembershipEntity(id = UUID.randomUUID().toString(), teamId = teamId, userId = user.id),
            )
        }

        users.forEach { user ->
            projectMembershipRepository.save(
                ProjectMembershipEntity(id = UUID.randomUUID().toString(), projectId = alphaProject.id, userId = user.id),
            )
            if (user.id != "katherine") {
                projectMembershipRepository.save(
                    ProjectMembershipEntity(
                        id = UUID.randomUUID().toString(),
                        projectId = beaconProject.id,
                        userId = user.id,
                    ),
                )
            }
        }

        repeat(12) {
            val owner = users.random()
            val project = if (it % 2 == 0) alphaProject else beaconProject
            val phases = defaultPhases(users)
            val issue = issueService.createIssue(
                CreateIssueCommand(
                    title = sampleTitle(faker, 4),
                    description = sampleDescription(faker),
                    ownerId = owner.id,
                    projectId = project.id,
                    phases = phases,
                ),
            )
            phases.forEach { phase ->
                if (faker.random.nextBoolean()) {
                    issueService.addTask(
                        issueId = issue.id,
                        phaseId = issue.phases.first { it.name == phase.name }.id,
                        title = sampleTitle(faker, 3),
                        assigneeId = phase.assigneeId,
                    )
                }
            }
        }
    }

    private fun sampleTitle(faker: Faker, wordCount: Int): String {
        val words = faker.lorem.words()
            .split(" ")
            .filter { it.isNotBlank() }
            .take(wordCount)
        val base = if (words.isNotEmpty()) words.joinToString(" ") else faker.company.name()
        return base.replaceFirstChar { ch -> ch.uppercase() }
    }

    private fun sampleDescription(faker: Faker): String {
        val words = faker.lorem.words()
            .split(" ")
            .filter { it.isNotBlank() }
            .take(12)
        return words.joinToString(" ").ifBlank { "No description provided." }
    }

    private fun defaultPhases(users: List<UserEntity>): List<CreatePhaseCommand> {
        val kinds = listOf(
            "INVESTIGATION",
            "PROPOSE_SOLUTION",
            "DEVELOPMENT",
            "ACCEPTANCE_TEST",
            "ROLLOUT",
        )
        return kinds.map { kind ->
            CreatePhaseCommand(
                name = kind.replace('_', ' ').lowercase().replaceFirstChar { it.uppercase() },
                assigneeId = users.random().id,
                kind = kind,
            )
        }
    }

    companion object {
        private const val ORG_ID = "org-dev"
        private const val TEAM_PLATFORM_ID = "team-platform"
        private const val TEAM_RELIABILITY_ID = "team-reliability"
        private const val PROJECT_ALPHA_ID = "project-alpha"
        private const val PROJECT_BEACON_ID = "project-beacon"
    }
}
