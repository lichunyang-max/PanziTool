package com.panzipool.api.web.admin;

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
 * 管理后台集成测试（Task 37.14）。
 *
 * <p>使用真实 HTTP 调用验证管理员认证、拦截器鉴权、留言管理 CRUD 与登录限流。
 * 管理员账号由 {@code DataInitializer} 自动创建（admin / 123456）。
 * 使用 {@code @DirtiesContext(AFTER_EACH_TEST_METHOD)} 隔离登录限流状态。</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AdminIntegrationTest {

    @LocalServerPort
    private int port;

    private final TestRestTemplate restTemplate = createTestRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 创建 TestRestTemplate，使用 JDK 内置 HttpClient 替代默认的 HttpURLConnection。
     *
     * <p>JDK 的 {@code HttpURLConnection} 在收到 401 响应时会尝试重试 POST 请求，
     * 但若请求体以流式模式发送则无法重试，抛出 {@code HttpRetryException}。
     * 使用 {@code JdkClientHttpRequestFactory}（基于 Java 11+ {@code java.net.http.HttpClient}）
     * 可完全规避此问题。</p>
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
     * 使用正确凭据登录，返回会话令牌。
     */
    private String loginAsAdmin() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = objectMapper.writeValueAsString(Map.of("username", "admin", "password", "123456"));
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/admin/login"), entity, String.class);
        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");
        return data.get("token").asText();
    }

    /**
     * 构造携带 Bearer 令牌的请求头。
     */
    private HttpHeaders authHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        return headers;
    }

    // =========================================================================
    // 1. 登录：正确凭据
    // =========================================================================

    @Test
    void login_correctCredentials_returnsToken() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = objectMapper.writeValueAsString(Map.of("username", "admin", "password", "123456"));
        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/admin/login"), entity, String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode root = objectMapper.readTree(resp.getBody());
        assertThat(root.get("code").asInt()).isZero();

        JsonNode data = root.get("data");
        assertThat(data.get("token").asText()).isNotBlank();
        assertThat(data.get("username").asText()).isEqualTo("admin");
        assertThat(data.has("expireAt")).isTrue();

        // Set-Cookie 头应包含 admin_token
        String setCookie = resp.getHeaders().getFirst("Set-Cookie");
        assertThat(setCookie).isNotNull();
        assertThat(setCookie).contains("admin_token=");
    }

    // =========================================================================
    // 2. 登录：错误凭据
    // =========================================================================

    @Test
    void login_wrongCredentials_returns401() throws Exception {
        // 错误密码
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = objectMapper.writeValueAsString(Map.of("username", "admin", "password", "wrong-password"));
        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/admin/login"), entity, String.class);
        assertThat(resp.getStatusCode().value()).isEqualTo(401);
        JsonNode root = objectMapper.readTree(resp.getBody());
        assertThat(root.get("code").asInt()).isEqualTo(401);

        // 错误用户名
        String body2 = objectMapper.writeValueAsString(Map.of("username", "nonexistent", "password", "123456"));
        HttpEntity<String> entity2 = new HttpEntity<>(body2, headers);

        ResponseEntity<String> resp2 = restTemplate.postForEntity(url("/api/v1/admin/login"), entity2, String.class);
        assertThat(resp2.getStatusCode().value()).isEqualTo(401);
        JsonNode root2 = objectMapper.readTree(resp2.getBody());
        assertThat(root2.get("code").asInt()).isEqualTo(401);
    }

    // =========================================================================
    // 3. 拦截器鉴权：缺失/无效/有效令牌
    // =========================================================================

    @Test
    void adminInterceptor_missingOrInvalidToken_returns401() throws Exception {
        // 无令牌 → 401
        ResponseEntity<String> noTokenResp = restTemplate.exchange(
                url("/api/v1/admin/feedback"), HttpMethod.GET, new HttpEntity<>(null), String.class);
        assertThat(noTokenResp.getStatusCode().value()).isEqualTo(401);
        JsonNode noTokenBody = objectMapper.readTree(noTokenResp.getBody());
        assertThat(noTokenBody.get("code").asInt()).isEqualTo(401);

        // 无效 Bearer 令牌 → 401
        HttpHeaders invalidHeaders = new HttpHeaders();
        invalidHeaders.set("Authorization", "Bearer invalid-token-12345");
        ResponseEntity<String> invalidResp = restTemplate.exchange(
                url("/api/v1/admin/feedback"), HttpMethod.GET, new HttpEntity<>(invalidHeaders), String.class);
        assertThat(invalidResp.getStatusCode().value()).isEqualTo(401);
        JsonNode invalidBody = objectMapper.readTree(invalidResp.getBody());
        assertThat(invalidBody.get("code").asInt()).isEqualTo(401);

        // 登录获取有效令牌 → 200
        String token = loginAsAdmin();
        ResponseEntity<String> validResp = restTemplate.exchange(
                url("/api/v1/admin/feedback"), HttpMethod.GET, new HttpEntity<>(authHeaders(token)), String.class);
        assertThat(validResp.getStatusCode().value()).isEqualTo(200);
        JsonNode validBody = objectMapper.readTree(validResp.getBody());
        assertThat(validBody.get("code").asInt()).isZero();
    }

    // =========================================================================
    // 4. 留言列表：状态筛选与关键词搜索
    // =========================================================================

    @Test
    @Sql(scripts = "/db/reset_feedback_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
            config = @SqlConfig(encoding = "UTF-8"))
    void listFeedback_statusFilterAndKeywordSearch() throws Exception {
        String token = loginAsAdmin();

        // status=visible → 2 条（测试留言1、测试留言2）
        ResponseEntity<String> visibleResp = restTemplate.exchange(
                url("/api/v1/admin/feedback?status=visible"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        JsonNode visibleData = objectMapper.readTree(visibleResp.getBody()).get("data");
        assertThat(visibleData.get("content").size()).isEqualTo(2);
        assertThat(visibleData.get("totalElements").asInt()).isEqualTo(2);

        // status=hidden → 1 条（隐藏的留言）
        ResponseEntity<String> hiddenResp = restTemplate.exchange(
                url("/api/v1/admin/feedback?status=hidden"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        JsonNode hiddenData = objectMapper.readTree(hiddenResp.getBody()).get("data");
        assertThat(hiddenData.get("content").size()).isEqualTo(1);
        assertThat(hiddenData.get("totalElements").asInt()).isEqualTo(1);

        // keyword="留言1" → 1 条（content 匹配测试留言1）
        ResponseEntity<String> kw1Resp = restTemplate.exchange(
                url("/api/v1/admin/feedback?keyword=留言1"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        JsonNode kw1Data = objectMapper.readTree(kw1Resp.getBody()).get("data");
        assertThat(kw1Data.get("content").size()).isEqualTo(1);
        assertThat(kw1Data.get("totalElements").asInt()).isEqualTo(1);

        // keyword="用户B" → 1 条（nickname 匹配测试留言2）
        ResponseEntity<String> kw2Resp = restTemplate.exchange(
                url("/api/v1/admin/feedback?keyword=用户B"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        JsonNode kw2Data = objectMapper.readTree(kw2Resp.getBody()).get("data");
        assertThat(kw2Data.get("content").size()).isEqualTo(1);
        assertThat(kw2Data.get("totalElements").asInt()).isEqualTo(1);

        // page=0&size=2 → 2 条，total=3
        ResponseEntity<String> pagedResp = restTemplate.exchange(
                url("/api/v1/admin/feedback?page=0&size=2"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        JsonNode pagedData = objectMapper.readTree(pagedResp.getBody()).get("data");
        assertThat(pagedData.get("content").size()).isEqualTo(2);
        assertThat(pagedData.get("totalElements").asInt()).isEqualTo(3);
    }

    // =========================================================================
    // 5. 回复留言：设置与清除
    // =========================================================================

    @Test
    @Sql(scripts = "/db/reset_feedback_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
            config = @SqlConfig(encoding = "UTF-8"))
    void replyFeedback_updatesFields() throws Exception {
        String token = loginAsAdmin();

        // 设置回复
        HttpHeaders headers = authHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        String replyBody = objectMapper.writeValueAsString(Map.of("reply", "感谢反馈"));
        HttpEntity<String> replyEntity = new HttpEntity<>(replyBody, headers);

        ResponseEntity<String> replyResp = restTemplate.exchange(
                url("/api/v1/admin/feedback/1/reply"), HttpMethod.PUT, replyEntity, String.class);
        assertThat(replyResp.getStatusCode().value()).isEqualTo(200);
        JsonNode replyData = objectMapper.readTree(replyResp.getBody()).get("data");
        assertThat(replyData.get("adminReply").asText()).isEqualTo("感谢反馈");
        assertThat(replyData.has("replyAt")).isTrue();
        assertThat(replyData.get("replyAt").asText()).isNotBlank();
        assertThat(replyData.get("replyBy").asText()).isEqualTo("admin");

        // 清除回复（空字符串）
        String clearBody = objectMapper.writeValueAsString(Map.of("reply", ""));
        HttpEntity<String> clearEntity = new HttpEntity<>(clearBody, headers);

        ResponseEntity<String> clearResp = restTemplate.exchange(
                url("/api/v1/admin/feedback/1/reply"), HttpMethod.PUT, clearEntity, String.class);
        assertThat(clearResp.getStatusCode().value()).isEqualTo(200);
        JsonNode clearData = objectMapper.readTree(clearResp.getBody()).get("data");
        assertThat(clearData.has("adminReply")).isFalse();
        assertThat(clearData.has("replyAt")).isFalse();
        assertThat(clearData.has("replyBy")).isFalse();
    }

    // =========================================================================
    // 6. 更新留言状态：状态流转与非法值
    // =========================================================================

    @Test
    @Sql(scripts = "/db/reset_feedback_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
            config = @SqlConfig(encoding = "UTF-8"))
    void updateStatus_stateTransitions() throws Exception {
        String token = loginAsAdmin();
        HttpHeaders headers = authHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // visible → hidden
        String body1 = objectMapper.writeValueAsString(Map.of("status", "hidden"));
        ResponseEntity<String> resp1 = restTemplate.exchange(
                url("/api/v1/admin/feedback/1/status"), HttpMethod.PUT,
                new HttpEntity<>(body1, headers), String.class);
        assertThat(resp1.getStatusCode().value()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp1.getBody()).get("data").get("status").asText()).isEqualTo("hidden");

        // hidden → deleted
        String body2 = objectMapper.writeValueAsString(Map.of("status", "deleted"));
        ResponseEntity<String> resp2 = restTemplate.exchange(
                url("/api/v1/admin/feedback/1/status"), HttpMethod.PUT,
                new HttpEntity<>(body2, headers), String.class);
        assertThat(resp2.getStatusCode().value()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp2.getBody()).get("data").get("status").asText()).isEqualTo("deleted");

        // deleted → visible
        String body3 = objectMapper.writeValueAsString(Map.of("status", "visible"));
        ResponseEntity<String> resp3 = restTemplate.exchange(
                url("/api/v1/admin/feedback/1/status"), HttpMethod.PUT,
                new HttpEntity<>(body3, headers), String.class);
        assertThat(resp3.getStatusCode().value()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp3.getBody()).get("data").get("status").asText()).isEqualTo("visible");

        // 非法状态 → 400
        String invalidBody = objectMapper.writeValueAsString(Map.of("status", "invalid"));
        ResponseEntity<String> invalidResp = restTemplate.exchange(
                url("/api/v1/admin/feedback/1/status"), HttpMethod.PUT,
                new HttpEntity<>(invalidBody, headers), String.class);
        assertThat(invalidResp.getStatusCode().value()).isEqualTo(400);
        assertThat(objectMapper.readTree(invalidResp.getBody()).get("code").asInt()).isEqualTo(400);

        // 不存在的留言 → 404
        ResponseEntity<String> notFoundResp = restTemplate.exchange(
                url("/api/v1/admin/feedback/9999"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        assertThat(notFoundResp.getStatusCode().value()).isEqualTo(404);
        assertThat(objectMapper.readTree(notFoundResp.getBody()).get("code").asInt()).isEqualTo(404);
    }

    // =========================================================================
    // 7. 登录限流：5 次失败后第 6 次返回 429
    // =========================================================================

    @Test
    void loginRateLimit_after5Failures_returns429() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = objectMapper.writeValueAsString(Map.of("username", "admin", "password", "wrong"));

        // 前 5 次失败均返回 401
        for (int i = 0; i < 5; i++) {
            HttpEntity<String> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/admin/login"), entity, String.class);
            assertThat(resp.getStatusCode().value())
                    .as("第 %d 次失败登录应返回 401", i + 1)
                    .isEqualTo(401);
            assertThat(objectMapper.readTree(resp.getBody()).get("code").asInt()).isEqualTo(401);
        }

        // 第 6 次返回 429
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> resp = restTemplate.postForEntity(url("/api/v1/admin/login"), entity, String.class);
        assertThat(resp.getStatusCode().value()).isEqualTo(429);
        assertThat(objectMapper.readTree(resp.getBody()).get("code").asInt()).isEqualTo(429);
    }

    // =========================================================================
    // 8. 登出后会话失效：token 清除 + 旧 token 返回 401
    // =========================================================================

    @Test
    void logout_invalidatesSession_oldTokenReturns401() throws Exception {
        // 1. 登录获取有效令牌
        String token = loginAsAdmin();

        // 2. 验证令牌可用（GET /admin/feedback → 200）
        ResponseEntity<String> beforeLogout = restTemplate.exchange(
                url("/api/v1/admin/feedback"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        assertThat(beforeLogout.getStatusCode().value()).isEqualTo(200);

        // 3. 调用登出接口
        ResponseEntity<String> logoutResp = restTemplate.exchange(
                url("/api/v1/admin/logout"), HttpMethod.POST,
                new HttpEntity<>(authHeaders(token)), String.class);
        assertThat(logoutResp.getStatusCode().value()).isEqualTo(200);
        assertThat(objectMapper.readTree(logoutResp.getBody()).get("code").asInt()).isZero();

        // 4. Set-Cookie 应清除 admin_token（Max-Age=0）
        String setCookie = logoutResp.getHeaders().getFirst("Set-Cookie");
        assertThat(setCookie).isNotNull();
        assertThat(setCookie).contains("admin_token=");
        assertThat(setCookie).contains("Max-Age=0");

        // 5. 旧令牌应已失效（GET /admin/feedback → 401）
        ResponseEntity<String> afterLogout = restTemplate.exchange(
                url("/api/v1/admin/feedback"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        assertThat(afterLogout.getStatusCode().value()).isEqualTo(401);
        assertThat(objectMapper.readTree(afterLogout.getBody()).get("code").asInt()).isEqualTo(401);

        // 6. GET /admin/me 也应返回 401
        ResponseEntity<String> meResp = restTemplate.exchange(
                url("/api/v1/admin/me"), HttpMethod.GET,
                new HttpEntity<>(authHeaders(token)), String.class);
        assertThat(meResp.getStatusCode().value()).isEqualTo(401);
    }
}
