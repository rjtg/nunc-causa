package sh.nunc.causa.users

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "users")
class UserEntity(
    @Id
    @Column(name = "user_id", nullable = false)
    var id: String,

    @Column(name = "display_name", nullable = false)
    var displayName: String,

    @Column(name = "email")
    var email: String? = null,
)
