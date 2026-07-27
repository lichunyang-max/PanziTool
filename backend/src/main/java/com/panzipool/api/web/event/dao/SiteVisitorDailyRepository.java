package com.panzipool.api.web.event.dao;

import com.panzipool.api.web.event.entity.SiteVisitorDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 站点日统计 Repository（site_visitor_daily 表）。
 */
@Repository
public interface SiteVisitorDailyRepository extends JpaRepository<SiteVisitorDaily, Long> {

    Optional<SiteVisitorDaily> findByStatDate(LocalDate statDate);

    @Modifying
    @Query("UPDATE SiteVisitorDaily s SET s.pv = s.pv + 1 WHERE s.statDate = :statDate")
    int incrementPv(@Param("statDate") LocalDate statDate);
}