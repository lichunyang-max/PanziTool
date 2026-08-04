package com.panzipool.api.web.admin.dao;

import com.panzipool.api.web.admin.entity.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Long> {

    Optional<AdminUser> findByUsernameAndEnabledTrue(String username);

    Optional<AdminUser> findByUsername(String username);

    boolean existsByUsername(String username);
}
