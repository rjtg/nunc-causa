package sh.nunc.causa.issues

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface IssueRepository : JpaRepository<IssueEntity, String> {
    @Query(
        """
        select distinct i from IssueEntity i
        left join i.phases p
        left join p.tasks t
        where (:projectId is null or i.projectId = :projectId)
          and (:ownerId is null or i.owner.id = :ownerId)
          and (:assigneeId is null or p.assignee.id = :assigneeId)
          and (:memberId is null or i.owner.id = :memberId or p.assignee.id = :memberId or t.assignee.id = :memberId)
          and (:status is null or i.status = :status)
          and (:phaseKind is null or p.kind = :phaseKind)
        """
    )
    fun findFiltered(
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueEntity>

    @Query(
        """
        select new sh.nunc.causa.issues.IssueListView(
            i.id,
            i.title,
            i.description,
            i.owner.id,
            i.projectId,
            count(distinct p.id),
            i.status
        )
        from IssueEntity i
        left join i.phases p
        left join p.tasks t
        where (:projectId is null or i.projectId = :projectId)
          and (:query is null or lower(i.title) like lower(concat('%', :query, '%')) or lower(i.description) like lower(concat('%', :query, '%')))
          and (:ownerId is null or i.owner.id = :ownerId)
          and (:assigneeId is null or p.assignee.id = :assigneeId)
          and (:memberId is null or i.owner.id = :memberId or p.assignee.id = :memberId or t.assignee.id = :memberId)
          and (:status is null or i.status = :status)
          and (:phaseKind is null or p.kind = :phaseKind)
        group by i.id, i.title, i.description, i.owner.id, i.projectId, i.status
        """
    )
    fun findListView(
        @Param("query") query: String?,
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueListView>

    @Query(
        """
        select distinct i from IssueEntity i
        left join fetch i.phases p
        where i.id = :issueId
        """
    )
    fun findDetailById(@Param("issueId") issueId: String): IssueEntity?

    @Query(
        """
        select new sh.nunc.causa.issues.IssueListView(
            i.id,
            i.title,
            i.description,
            i.owner.id,
            i.projectId,
            count(distinct p.id),
            i.status
        )
        from IssueEntity i
        left join i.phases p
        where (:projectId is null or i.projectId = :projectId)
          and (
            lower(i.title) like lower(concat('%', :query, '%'))
            or lower(i.description) like lower(concat('%', :query, '%'))
          )
        group by i.id, i.title, i.description, i.owner.id, i.projectId, i.status
        """
    )
    fun searchListView(
        @Param("query") query: String,
        @Param("projectId") projectId: String?,
    ): List<IssueListView>
}
