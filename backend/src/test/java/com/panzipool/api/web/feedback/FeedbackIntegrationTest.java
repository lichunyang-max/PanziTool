package com.panzipool.api.web.feedback;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 意见反馈集成测试（Task 36.5）。
 *
 * <p>使用真实 HTTP 调用验证反馈提交校验、IP 限流与公开列表分页/过滤。
 * 使用 {@code @DirtiesContext(AFTER_EACH_TEST_METHOD)} 隔离内存限流状态，
 * 确保每个测试方法以全新的 FeedbackService（含限流计数器）与干净的 H2 库运行。</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FeedbackIntegrationTest {

    @LocalServerPort
    private int port;

    private final TestRestTemplate restTemplate = createTestRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 创建 TestRestTemplate，使用 JDK 内置 HttpClient 替代默认的 HttpURLConnection。
     *
     * <p>JDK 的 {@code HttpURLConnection} 在收到 4xx 响应时会尝试重试 POST 请求，
     * 但若请求体以流式模式发送则无法重试，抛出 {@code HttpRetryException}。
     * 使用 {@code JdkClientHttpRequestFactory}（基于 Java 11+ {@code java.net.http.HttpClient}）
     * 可完全规避此问题（与 AdminIntegrationTest 保持一致）。</p>
     */
    private static TestRestTemplate createTestRestTemplate() {
        TestRestTemplate trt = new TestRestTemplate();
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();
        trt.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory(httpClient));
        return trt;
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    /**
     * 构造 JSON 请求实体（Content-Type: application/json）。
     */
    private HttpEntity<String> jsonEntity(Object body) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
    }

    // =========================================================================
    // 1. 提交反馈：有效输入 → 成功
    // =========================================================================

    @Test
    @Sql(scripts = "/db/reset_feedback_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
            config = @SqlConfig(encoding = "UTF-8"))
    void createFeedback_validInput_returnsSuccess() throws Exception {
        HttpEntity<String> entity = jsonEntity(Map.of(
                "content", "这是一条有效的反馈留言",
                "nickname", "测试用户",
                "contact", "test@test.com"));

        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/feedback"), entity, String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode root = objectMapper.readTree(resp.getBody());
        assertThat(root.get("code").asInt()).isZero();

        JsonNode data = root.get("data");
        assertThat(data.get("id").asLong()).isPositive();
        assertThat(data.get("content").asText()).isEqualTo("这是一条有效的反馈留言");
        assertThat(data.get("nickname").asText()).isEqualTo("测试用户");
    }

    // =========================================================================
    // 2. 提交反馈：内容为空 → 400
    // =========================================================================

    @Test
    void createFeedback_emptyContent_returns400() throws Exception {
        HttpEntity<String> entity = jsonEntity(Map.of("content", "", "nickname", "用户"));

        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/feedback"), entity, String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
    }

    // =========================================================================
    // 3. 提交反馈：内容超长（>1000）→ 400
    // =========================================================================

    @Test
    void createFeedback_overlongContent_returns400() throws Exception {
        String overlong = "a".repeat(1001);
        HttpEntity<String> entity = jsonEntity(Map.of("content", overlong, "nickname", "用户"));

        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/feedback"), entity, String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
    }

    // =========================================================================
    // 4. 提交反馈：同 IP 限流（3 次/分钟）→ 第 4 次返回 429
    // =========================================================================

    @Test
    void createFeedback_rateLimitExceeded_returns429() throws Exception {
        // 前 3 次提交均应成功（200）
        for (int i = 1; i <= 3; i++) {
            HttpEntity<String> entity = jsonEntity(Map.of("content", "测试留言内容第" + i + "条"));
            ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/feedback"), entity, String.class);
            assertThat(resp.getStatusCode().value())
                    .as("第 %d 次提交应返回 200", i)
                    .isEqualTo(200);
        }

        // 第 4 次提交应触发限流 → 429
        HttpEntity<String> entity = jsonEntity(Map.of("content", "测试留言内容第4条"));
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/feedback"), entity, String.class);
        assertThat(resp.getStatusCode().value()).isEqualTo(429);
    }

    // =========================================================================
    // 5. 公开列表：分页与排序
    // =========================================================================

    @Test
    @Sql(scripts = "/db/reset_feedback_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
            config = @SqlConfig(encoding = "UTF-8"))
    void listPublicFeedback_returnsVisiblePaginated() throws Exception {
        // page=0&size=10 → 仅返回 2 条 visible（id=1、id=2）
        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/feedback?page=0&size=10"), HttpMethod.GET,
                new HttpEntity<>(null), String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");
        assertThat(data.get("content").size()).isEqualTo(2);
        assertThat(data.get("totalElements").asInt()).isEqualTo(2);

        // 按 createdAt DESC：id=2（2026-01-02 11:00）应排在首位
        JsonNode first = data.get("content").get(0);
        assertThat(first.get("content").asText()).isEqualTo("测试留言2");
        assertThat(first.get("nickname").asText()).isEqualTo("用户B");

        // page=0&size=1 → 1 条，totalElements=2，totalPages=2
        ResponseEntity<String> pagedResp = restTemplate.exchange(
                url("/api/v1/feedback?page=0&size=1"), HttpMethod.GET,
                new HttpEntity<>(null), String.class);
        JsonNode pagedData = objectMapper.readTree(pagedResp.getBody()).get("data");
        assertThat(pagedData.get("content").size()).isEqualTo(1);
        assertThat(pagedData.get("totalElements").asInt()).isEqualTo(2);
        assertThat(pagedData.get("totalPages").asInt()).isEqualTo(2);
    }

    // =========================================================================
    // 6. 公开列表：排除 hidden/deleted
    // =========================================================================

    @Test
    @Sql(scripts = "/db/reset_feedback_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
            config = @SqlConfig(encoding = "UTF-8"))
    void listPublicFeedback_excludesHiddenAndDeleted() throws Exception {
        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/feedback?page=0&size=10"), HttpMethod.GET,
                new HttpEntity<>(null), String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");

        // 仅 2 条 visible（不含 hidden 的 id=3）
        assertThat(data.get("content").size()).isEqualTo(2);
        assertThat(data.get("totalElements").asInt()).isEqualTo(2);

        // 不应包含隐藏留言内容
        boolean hasHidden = false;
        for (JsonNode item : data.get("content")) {
            if ("隐藏的留言".equals(item.get("content").asText())) {
                hasHidden = true;
                break;
            }
        }
        assertThat(hasHidden).as("不应返回 hidden 状态的留言").isFalse();
    }
}
