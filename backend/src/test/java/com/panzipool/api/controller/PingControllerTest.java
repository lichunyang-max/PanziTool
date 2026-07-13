package com.panzipool.api.controller;

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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 基础设施集成测试：通过真实 HTTP（含 context-path /api/v1）验证：
 * <ul>
 *   <li>统一响应信封格式（成功 / 失败）</li>
 *   <li>JSR-303 校验（@RequestBody / @RequestParam）</li>
 *   <li>全局异常处理（BusinessException）</li>
 *   <li>Actuator /actuator/health</li>
 *   <li>OpenAPI /docs-json</li>
 * </ul>
 *
 * <p>使用默认 profile（H2 内存库），无外部依赖。</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PingControllerTest {

    @LocalServerPort
    private int port;

    private final TestRestTemplate restTemplate = new TestRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @Test
    void ping_returnsSuccessEnvelope() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/ping"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.get("data").asText()).isEqualTo("pong");
        // 成功响应不应包含 message 字段
        assertThat(body.has("message")).isFalse();
    }

    @Test
    void echo_validBody_returnsSuccess() throws Exception {
        Map<String, Object> payload = Map.of("name", "json-formatter", "age", 18, "email", "user@panzipool.com");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/ping/echo"),
                HttpMethod.POST,
                new HttpEntity<>(objectMapper.writeValueAsString(payload), headers),
                String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.get("data").get("name").asText()).isEqualTo("json-formatter");
    }

    @Test
    void echo_invalidBody_returns400WithEnvelope() throws Exception {
        // name 为空、age 为负、email 非法 → 触发 @Valid 校验失败
        Map<String, Object> payload = Map.of("name", "", "age", -1, "email", "not-an-email");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/ping/echo"),
                HttpMethod.POST,
                new HttpEntity<>(objectMapper.writeValueAsString(payload), headers),
                String.class);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).isNotBlank();
        // 失败响应不应包含 data 字段
        assertThat(body.has("data")).isFalse();
    }

    @Test
    void greet_invalidQueryParam_returns400() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/ping/greet?name=invalid!name"), String.class);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).contains("name");
    }

    @Test
    void errorEndpoint_throwsBusinessException_returnsWithEnvelope() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/ping/error"), String.class);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).isEqualTo("这是一个演示业务异常");
    }

    @Test
    void actuatorHealth_returnsUp() throws Exception {
        // context-path=/api/v1 下，actuator 端点位于 /api/v1/actuator/health
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/actuator/health"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("status").asText()).isEqualTo("UP");
    }

    @Test
    void openApiDocsJson_isAccessible() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/docs-json"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("info").get("title").asText()).isEqualTo("PanziPool API");
    }
}
