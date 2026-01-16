package sh.nunc.causa.search

import org.springframework.boot.actuate.endpoint.annotation.Endpoint
import org.springframework.boot.actuate.endpoint.annotation.WriteOperation
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Component

@Component
@Endpoint(id = "search-index")
class SearchIndexEndpoint(
    private val searchIndexService: SearchIndexService,
) {
    @WriteOperation
    @PreAuthorize("@accessPolicy.canManageSearchIndex()")
    fun reindex(): ReindexResponse {
        searchIndexService.reindexIssues()
        return ReindexResponse(status = "ok")
    }
}

data class ReindexResponse(
    val status: String,
)
