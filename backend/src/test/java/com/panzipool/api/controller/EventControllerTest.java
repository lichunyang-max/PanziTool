package com.panzipool.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.panzipool.api.entity.Tool;
import com.panzipool.api.repository.SiteVisitorDailyRepository;
import com.panzipool.api.repository.ToolEventLogRepository;
import com.panzipool.api.repository.ToolRepository;
import com.panzipool.api.service.RateLimitService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 匿名统计事件上报 API 集成测试（Task 4）。
 *
 * <p>通过真实 HTTP 调用（含 context-path /api/v1）验证：</p>
 * <ul>
 *   <li>合法事件上报成功（SubTask 4.1）</li>
 *   <li>非法 event_type 被拒绝（SubTask 4.1）</li>
 *   <li>anon_id 缺失/格式错误被拒绝（SubTask 4.1）</li>
 *   <li>不存在的 tool_slug 被拒绝（SubTask 4.2）</li>
 *   <li>频率限制生效（SubTask 4.4）</li>
 *   <li>use_count 同步更新（SubTask 4.2）</li>
 *   <li>page_view 事件更新 site_visitor_daily.pv（SubTask 4.2）</li>
 * </ul>
 *
 * <p>使用默认 profile（H2 内存库 + Flyway），测试工具数据在 @BeforeEach 创建、
 * @AfterEach 清理，不影响 ToolControllerTest / ToolControllerLikeTest。</p>
 *
 * <p>频率限制测试通过 {@code properties} 覆盖为 3 次/分钟，仅发送 4 个请求即可验证。</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "panzipool.ratelimit.anon-id-per-minute=3",
                "panzipool.ratelimit.ip-per-minute=3"
        })
class EventControllerTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ToolRepository toolRepository;

    @Autowired
    private ToolEventLogRepository toolEventLogRepository;

    @Autowired
    private SiteVisitorDailyRepository siteVisitorDailyRepository;

    @Autowired
    private RateLimitService rateLimitService;

    private final TestRestTemplate restTemplate = new TestRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 测试专用工具 slug，不与 V6 种子数据冲突 */
    private static final String TEST_SLUG = "test-event-tool";
    private static final String VALID_ANON_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String ANOTHER_ANON_ID = "660e8400-e29b-41d4-a716-446655440001";

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @BeforeEach
    void setUp() {
        // 重置限流计数器，避免跨测试类状态泄漏
        rateLimitService.reset();
        // 清理可能残留的测试事件日志和站点统计
        toolEventLogRepository.deleteAllInBatch();
        siteVisitorDailyRepository.deleteAllInBatch();
        // 删除可能残留的测试工具
        toolRepository.findBySlug(TEST_SLUG).ifPresent(t -> toolRepository.deleteById(t.getId()));
        // 创建全新的测试工具，use_count=0
        Tool tool = new Tool();
        tool.setSlug(TEST_SLUG);
        tool.setName("测试事件工具");
        tool.setCategory("developer");
        tool.setKeywords("test,event");
        tool.setDescription("事件上报测试专用工具");
        tool.setEnabled(true);
        tool.setUseCount(0L);
        tool.setLikeCount(0L);
        toolRepository.save(tool);
    }

    @AfterEach
    void tearDown() {
        toolEventLogRepository.deleteAllInBatch();
        siteVisitorDailyRepository.deleteAllInBatch();
        toolRepository.findBySlug(TEST_SLUG).ifPresent(t -> toolRepository.deleteById(t.getId()));
    }

    /**
     * 发送事件上报请求的辅助方法。
     */
    private ResponseEntity<String> postEvent(String toolSlug, String anonId, String eventType) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> bodyMap = new java.util.LinkedHashMap<>();
        if (toolSlug != null) {
            bodyMap.put("tool_slug", toolSlug);
        }
        bodyMap.put("anon_id", anonId);
        bodyMap.put("event_type", eventType);
        String body = objectMapper.writeValueAsString(bodyMap);
        return restTemplate.exchange(
                url("/api/v1/events"),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);
    }

    // =========================================================================
    // SubTask 4.1 / 4.2: 合法事件上报成功
    // =========================================================================

    @Test
    void validToolUseEvent_returns200() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, VALID_ANON_ID, "tool_use");

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        // 成功响应不应包含 message
        assertThat(body.has("message")).isFalse();
    }

    @Test
    void validCopyEvent_returns200() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, VALID_ANON_ID, "copy");

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
    }

    @Test
    void validDownloadEvent_returns200() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, VALID_ANON_ID, "download");

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
    }

    @Test
    void validPageViewEvent_returns200() throws Exception {
        // page_view 可以不携带 tool_slug
        ResponseEntity<String> resp = postEvent(null, VALID_ANON_ID, "page_view");

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
    }

    // =========================================================================
    // SubTask 4.1: 非法 event_type 被拒绝（400）
    // =========================================================================

    @Test
    void invalidEventType_returns400() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, VALID_ANON_ID, "invalid_type");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).contains("event_type");
        // 失败响应不应包含 data
        assertThat(body.has("data")).isFalse();
    }

    @Test
    void blankEventType_returns400() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, VALID_ANON_ID, "");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).contains("event_type");
    }

    // =========================================================================
    // SubTask 4.1: anon_id 缺失/格式错误被拒绝（400）
    // =========================================================================

    @Test
    void invalidAnonIdFormat_returns400() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, "not-a-uuid", "tool_use");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).contains("anon_id");
    }

    @Test
    void blankAnonId_returns400() throws Exception {
        ResponseEntity<String> resp = postEvent(TEST_SLUG, "", "tool_use");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).contains("anon_id");
    }

    @Test
    void missingAnonId_returns400() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 请求体不含 anon_id
        String body = objectMapper.writeValueAsString(
                Map.of("tool_slug", TEST_SLUG, "event_type", "tool_use"));
        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/events"),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode responseBody = objectMapper.readTree(resp.getBody());
        assertThat(responseBody.get("code").asInt()).isEqualTo(400);
    }

    // =========================================================================
    // SubTask 4.2: 不存在的 tool_slug 被拒绝
    // =========================================================================

    @Test
    void nonExistentToolSlug_returns400() throws Exception {
        ResponseEntity<String> resp = postEvent("nonexistent-tool", VALID_ANON_ID, "tool_use");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).isEqualTo("工具不存在");
        assertThat(body.has("data")).isFalse();
    }

    // =========================================================================
    // SubTask 4.4: 频率限制生效
    // =========================================================================

    @Test
    void rateLimit_anonId_exceeded_returns429() throws Exception {
        // 发送 3 个请求（达到限制），使用唯一的 anon_id 避免与其他测试冲突
        String testAnonId = "770e8400-e29b-41d4-a716-446655440002";
        for (int i = 0; i < 3; i++) {
            ResponseEntity<String> resp = postEvent(TEST_SLUG, testAnonId, "tool_use");
            assertThat(resp.getStatusCode().value())
                    .as("第 %d 个请求应成功", i + 1)
                    .isEqualTo(200);
        }

        // 第 4 个请求应触发频率限制
        ResponseEntity<String> resp = postEvent(TEST_SLUG, testAnonId, "tool_use");
        assertThat(resp.getStatusCode().value()).isEqualTo(429);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(429);
        assertThat(body.get("message").asText()).isEqualTo("请求过于频繁，请稍后再试");
        assertThat(body.has("data")).isFalse();
    }

    @Test
    void rateLimit_ip_exceeded_returns429() throws Exception {
        // 同一 IP 发送 3 个请求（达到限制），使用不同的 anon_id 确保 anon_id 不触发限制
        String ipTestAnonId1 = "880e8400-e29b-41d4-a716-446655440003";
        String ipTestAnonId2 = "990e8400-e29b-41d4-a716-446655440004";
        String ipTestAnonId3 = "aa0e8400-e29b-41d4-a716-446655440005";
        String ipTestAnonId4 = "bb0e8400-e29b-41d4-a716-446655440006";

        // 每个请求使用不同的 anon_id，所有请求来自同一 IP
        postEvent(TEST_SLUG, ipTestAnonId1, "tool_use");
        postEvent(TEST_SLUG, ipTestAnonId2, "tool_use");
        postEvent(TEST_SLUG, ipTestAnonId3, "tool_use");

        // 第 4 个请求应触发 IP 频率限制
        ResponseEntity<String> resp = postEvent(TEST_SLUG, ipTestAnonId4, "tool_use");
        assertThat(resp.getStatusCode().value()).isEqualTo(429);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(429);
        assertThat(body.get("message").asText()).isEqualTo("请求过于频繁，请稍后再试");
    }

    // =========================================================================
    // SubTask 4.2: use_count 同步更新
    // =========================================================================

    @Test
    void toolUseEvent_incrementsUseCount() throws Exception {
        // 获取初始 use_count
        Tool before = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        long initialCount = before.getUseCount();

        // 上报 tool_use 事件
        postEvent(TEST_SLUG, VALID_ANON_ID, "tool_use");

        // 验证 use_count +1
        Tool after = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(after.getUseCount()).isEqualTo(initialCount + 1);
    }

    @Test
    void multipleToolUseEvents_incrementCorrectly() throws Exception {
        Tool before = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        long initialCount = before.getUseCount();

        // 两个不同匿名用户各触发一次
        postEvent(TEST_SLUG, VALID_ANON_ID, "tool_use");
        postEvent(TEST_SLUG, ANOTHER_ANON_ID, "tool_use");

        Tool after = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(after.getUseCount()).isEqualTo(initialCount + 2);
    }

    @Test
    void pageViewEvent_doesNotIncrementUseCount() throws Exception {
        Tool before = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        long initialCount = before.getUseCount();

        // page_view 不增加 use_count
        postEvent(TEST_SLUG, VALID_ANON_ID, "page_view");

        Tool after = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(after.getUseCount()).isEqualTo(initialCount);
    }

    @Test
    void copyAndDownloadEvents_incrementUseCount() throws Exception {
        Tool before = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        long initialCount = before.getUseCount();

        postEvent(TEST_SLUG, VALID_ANON_ID, "copy");
        postEvent(TEST_SLUG, ANOTHER_ANON_ID, "download");

        Tool after = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(after.getUseCount()).isEqualTo(initialCount + 2);
    }

    // =========================================================================
    // SubTask 4.2: page_view 更新 site_visitor_daily.pv
    // =========================================================================

    @Test
    void pageViewEvent_createsSiteVisitorDaily() throws Exception {
        postEvent(null, VALID_ANON_ID, "page_view");

        // 验证 site_visitor_daily 有当日记录，pv >= 1
        var today = java.time.LocalDate.now();
        var daily = siteVisitorDailyRepository.findByStatDate(today);
        assertThat(daily).isPresent();
        assertThat(daily.get().getPv()).isGreaterThanOrEqualTo(1L);
    }

    @Test
    void pageViewEvent_incrementsExistingPv() throws Exception {
        // 第一次 page_view 创建记录
        postEvent(null, VALID_ANON_ID, "page_view");
        var today = java.time.LocalDate.now();
        long pvBefore = siteVisitorDailyRepository.findByStatDate(today).orElseThrow().getPv();

        // 第二次 page_view 递增
        postEvent(null, ANOTHER_ANON_ID, "page_view");
        long pvAfter = siteVisitorDailyRepository.findByStatDate(today).orElseThrow().getPv();

        assertThat(pvAfter).isEqualTo(pvBefore + 1);
    }

    // =========================================================================
    // 额外验证：tool_event_logs 写入正确
    // =========================================================================

    @Test
    void eventLoggedToDatabase() throws Exception {
        postEvent(TEST_SLUG, VALID_ANON_ID, "tool_use");

        // 验证 tool_event_logs 有一条记录
        var logs = toolEventLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getAnonId()).isEqualTo(VALID_ANON_ID);
        assertThat(logs.get(0).getEventType()).isEqualTo("tool_use");

        Tool tool = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(logs.get(0).getToolId()).isEqualTo(tool.getId());
    }

    @Test
    void pageViewEvent_loggedWithNullToolId() throws Exception {
        postEvent(null, VALID_ANON_ID, "page_view");

        var logs = toolEventLogRepository.findAll();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getToolId()).isNull();
        assertThat(logs.get(0).getEventType()).isEqualTo("page_view");
    }
}
