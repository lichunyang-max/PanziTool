package com.panzipool.api.repository;

import com.panzipool.api.entity.SiteVisitorDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 站点日统计 Repository（site_visitor_daily 表）。
 *
 * <p>提供站点每日 PV/UV 的持久化操作，支持按日期查询与原子递增 PV。</p>
 */
@Repository
public interface SiteVisitorDailyRepository extends JpaRepository<SiteVisitorDaily, Long> {

    /**
     * 按统计日期查询。
     *
     * @param statDate 统计日期
     * @return 站点日统计记录（可能为空）
     */
    Optional<SiteVisitorDaily> findByStatDate(LocalDate statDate);

    /**
     * 原子递增 PV（pv = pv + 1）。
     *
     * <p>使用 bulk UPDATE 保证并发安全，需在 @Transactional 上下文中调用。</p>
     *
     * @param statDate 统计日期
     * @return 受影响行数（0 表示当天记录不存在）
     */
    @Modifying
    @Query("UPDATE SiteVisitorDaily s SET s.pv = s.pv + 1 WHERE s.statDate = :statDate")
    int incrementPv(@Param("statDate") LocalDate statDate);
}
