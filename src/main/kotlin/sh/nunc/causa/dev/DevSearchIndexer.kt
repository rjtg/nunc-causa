package sh.nunc.causa.dev

import jakarta.persistence.EntityManager
import org.hibernate.search.mapper.orm.Search
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.DependsOn
import org.springframework.context.annotation.Profile
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import sh.nunc.causa.issues.IssueEntity

@Profile("dev")
@Component
@DependsOn("devDataSeeder")
@Order(Ordered.LOWEST_PRECEDENCE)
class DevSearchIndexer(
    private val entityManager: EntityManager,
) : ApplicationRunner {
    @Transactional
    override fun run(args: ApplicationArguments?) {
        Search.session(entityManager)
            .massIndexer(IssueEntity::class.java)
            .startAndWait()
    }
}
