package sh.nunc.causa.projects

data class ProjectSummary(
    val id: String,
    val key: String,
    val name: String,
    val orgId: String,
    val teamId: String,
    val ownerId: String?,
    val issueStatusCounts: Map<String, Long>,
    val phaseStatusCounts: Map<String, Long>,
    val phaseStatusByIssueStatus: Map<String, Map<String, Long>>,
)

data class ProjectFacetOption(
    val id: String,
    val count: Long,
)

data class ProjectFacetResponse(
    val owners: List<ProjectFacetOption>,
    val teams: List<ProjectFacetOption>,
)
