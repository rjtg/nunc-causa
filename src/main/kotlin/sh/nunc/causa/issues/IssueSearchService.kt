package sh.nunc.causa.issues

import jakarta.persistence.EntityManager
import org.hibernate.search.engine.search.aggregation.AggregationKey
import org.hibernate.search.engine.search.predicate.dsl.SearchPredicateFactory
import org.hibernate.search.mapper.orm.Search
import org.springframework.stereotype.Service

data class IssueSearchFilters(
    val query: String? = null,
    val ownerId: String? = null,
    val assigneeId: String? = null,
    val memberId: String? = null,
    val projectId: String? = null,
    val status: String? = null,
    val phaseKind: String? = null,
)

@Service
class IssueSearchService(
    private val entityManager: EntityManager,
) {
    fun searchIssues(filters: IssueSearchFilters, limit: Int = 200): List<IssueEntity> {
        val searchSession = Search.session(entityManager)
        @Suppress("UNCHECKED_CAST")
        return searchSession.search(IssueEntity::class.java)
            .where { f -> buildPredicate(f, filters, null) }
            .fetchHits(limit) as List<IssueEntity>
    }

    fun facetIssues(filters: IssueSearchFilters): IssueFacetBundle {
        return IssueFacetBundle(
            owners = facetForField("ownerId", filters, FacetField.OWNER),
            assignees = facetForField("phases.assigneeId", filters, FacetField.ASSIGNEE),
            projects = facetForField("projectId", filters, FacetField.PROJECT),
            statuses = facetForField("status", filters, FacetField.STATUS),
            phaseKinds = facetForField("phases.kind", filters, FacetField.PHASE_KIND),
        )
    }

    private fun facetForField(
        field: String,
        filters: IssueSearchFilters,
        excluded: FacetField,
    ): List<IssueFacetView> {
        val searchSession = Search.session(entityManager)
        val aggregationKey = AggregationKey.of<Map<String, Long>>("facet")
        val result = searchSession.search(IssueEntity::class.java)
            .where { f -> buildPredicate(f, filters, excluded) }
            .aggregation(aggregationKey) { f -> f.terms().field(field, String::class.java) }
            .fetch(0)
        val aggregation = result.aggregation(aggregationKey)
        return aggregation.entries
            .sortedByDescending { it.value }
            .map { IssueFacetView(id = it.key, count = it.value) }
    }

    private fun buildPredicate(
        f: SearchPredicateFactory,
        filters: IssueSearchFilters,
        excluded: FacetField?,
    ) = f.bool().also { bool ->
        var hasClause = false
        val query = filters.query?.trim()
        if (!query.isNullOrBlank() && excluded != FacetField.QUERY) {
            bool.must(
                f.bool()
                    .should(f.match().field("id").matching(query))
                    .should(
                        f.simpleQueryString()
                            .fields("title", "description", "id")
                            .matching(query),
                    )
                    .minimumShouldMatchNumber(1),
            )
            hasClause = true
        }
        if (!filters.projectId.isNullOrBlank() && excluded != FacetField.PROJECT) {
            bool.must(f.match().field("projectId").matching(filters.projectId))
            hasClause = true
        }
        if (!filters.ownerId.isNullOrBlank() && excluded != FacetField.OWNER) {
            bool.must(f.match().field("ownerId").matching(filters.ownerId))
            hasClause = true
        }
        if (!filters.assigneeId.isNullOrBlank() && excluded != FacetField.ASSIGNEE) {
            bool.must(f.match().field("phases.assigneeId").matching(filters.assigneeId))
            hasClause = true
        }
        if (!filters.phaseKind.isNullOrBlank() && excluded != FacetField.PHASE_KIND) {
            bool.must(f.match().field("phases.kind").matching(filters.phaseKind))
            hasClause = true
        }
        if (!filters.status.isNullOrBlank() && excluded != FacetField.STATUS) {
            bool.must(f.match().field("status").matching(filters.status))
            hasClause = true
        }
        if (!filters.memberId.isNullOrBlank() && excluded != FacetField.MEMBER) {
            bool.must(
                f.bool()
                    .should(f.match().field("ownerId").matching(filters.memberId))
                    .should(f.match().field("phases.assigneeId").matching(filters.memberId))
                    .should(f.match().field("phases.tasks.assigneeId").matching(filters.memberId))
                    .minimumShouldMatchNumber(1),
            )
            hasClause = true
        }
        if (!hasClause) {
            bool.must(f.matchAll())
        }
    }

    private enum class FacetField {
        QUERY,
        OWNER,
        ASSIGNEE,
        MEMBER,
        PROJECT,
        STATUS,
        PHASE_KIND,
    }
}
