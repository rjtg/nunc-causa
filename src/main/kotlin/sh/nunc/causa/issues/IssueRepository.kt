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

    @Query(
        """
        select new sh.nunc.causa.issues.IssueFacetView(
            i.owner.id,
            count(distinct i.id)
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
        group by i.owner.id
        """
    )
    fun findOwnerFacets(
        @Param("query") query: String?,
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueFacetView>

    @Query(
        """
        select new sh.nunc.causa.issues.IssueFacetView(
            p.assignee.id,
            count(distinct i.id)
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
          and p.assignee.id is not null
        group by p.assignee.id
        """
    )
    fun findAssigneeFacets(
        @Param("query") query: String?,
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueFacetView>

    @Query(
        """
        select new sh.nunc.causa.issues.IssueFacetView(
            i.projectId,
            count(distinct i.id)
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
          and i.projectId is not null
        group by i.projectId
        """
    )
    fun findProjectFacets(
        @Param("query") query: String?,
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueFacetView>

    @Query(
        """
        select new sh.nunc.causa.issues.UserWorkloadView(
            i.owner.id,
            count(distinct i.id)
        )
        from IssueEntity i
        where (:projectId is null or i.projectId = :projectId)
          and i.owner.id in :userIds
          and i.status not in (:closedStatuses)
        group by i.owner.id
        """
    )
    fun findOwnerWorkload(
        @Param("userIds") userIds: Collection<String>,
        @Param("projectId") projectId: String?,
        @Param("closedStatuses") closedStatuses: Collection<String>,
    ): List<UserWorkloadView>

    @Query(
        """
        select new sh.nunc.causa.issues.UserWorkloadView(
            p.assignee.id,
            count(distinct p.id)
        )
        from IssueEntity i
        join i.phases p
        where (:projectId is null or i.projectId = :projectId)
          and p.assignee.id in :userIds
          and p.status not in (:closedStatuses)
        group by p.assignee.id
        """
    )
    fun findPhaseWorkload(
        @Param("userIds") userIds: Collection<String>,
        @Param("projectId") projectId: String?,
        @Param("closedStatuses") closedStatuses: Collection<String>,
    ): List<UserWorkloadView>

    @Query(
        """
        select new sh.nunc.causa.issues.UserWorkloadView(
            t.assignee.id,
            count(distinct t.id)
        )
        from IssueEntity i
        join i.phases p
        join p.tasks t
        where (:projectId is null or i.projectId = :projectId)
          and t.assignee.id in :userIds
          and t.status not in (:closedStatuses)
        group by t.assignee.id
        """
    )
    fun findTaskWorkload(
        @Param("userIds") userIds: Collection<String>,
        @Param("projectId") projectId: String?,
        @Param("closedStatuses") closedStatuses: Collection<String>,
    ): List<UserWorkloadView>

    @Query(
        """
        select new sh.nunc.causa.issues.IssueFacetView(
            i.status,
            count(distinct i.id)
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
        group by i.status
        """
    )
    fun findStatusFacets(
        @Param("query") query: String?,
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueFacetView>

    @Query(
        """
        select new sh.nunc.causa.issues.IssueFacetView(
            p.kind,
            count(distinct i.id)
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
          and p.kind is not null
        group by p.kind
        """
    )
    fun findPhaseKindFacets(
        @Param("query") query: String?,
        @Param("projectId") projectId: String?,
        @Param("ownerId") ownerId: String?,
        @Param("assigneeId") assigneeId: String?,
        @Param("memberId") memberId: String?,
        @Param("status") status: String?,
        @Param("phaseKind") phaseKind: String?,
    ): List<IssueFacetView>
}
