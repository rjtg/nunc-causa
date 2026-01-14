package sh.nunc.causa.users

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface UserRepository : JpaRepository<UserEntity, String> {
    @Query(
        """
        select u from UserEntity u
        where lower(u.displayName) like lower(concat('%', :query, '%'))
           or lower(u.id) like lower(concat('%', :query, '%'))
        """
    )
    fun searchByQuery(@Param("query") query: String): List<UserEntity>
}
