package sh.nunc.causa.search

import jakarta.persistence.EntityManager
import org.hibernate.search.mapper.orm.Search
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.issues.IssueEntity

@Service
class SearchIndexService(
    private val entityManager: EntityManager,
) {
    @Transactional
    fun reindexIssues() {
        Search.session(entityManager)
            .massIndexer(IssueEntity::class.java)
            .startAndWait()
    }
}
