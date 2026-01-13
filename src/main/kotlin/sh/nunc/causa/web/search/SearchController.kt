package sh.nunc.causa.web.search

import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.RestController
import sh.nunc.causa.issues.IssueService
import sh.nunc.causa.tenancy.AccessPolicyService
import sh.nunc.causa.web.api.SearchApi
import sh.nunc.causa.web.issues.toListItem
import sh.nunc.causa.web.model.IssueListItem

@RestController
class SearchController(
    private val issueService: IssueService,
    private val accessPolicy: AccessPolicyService,
) : SearchApi {
    @PreAuthorize("@accessPolicy.canSearchIssues(#projectId)")
    override fun searchIssues(q: String, projectId: String?): ResponseEntity<List<IssueListItem>> {
        val currentUserId = accessPolicy.currentUserId()
        val results = if (currentUserId == null) {
            emptyList()
        } else {
            issueService.searchIssues(q, projectId)
        }
        return ResponseEntity.ok(results.map { it.toListItem() })
    }
}
