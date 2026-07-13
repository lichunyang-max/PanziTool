package com.panzipool.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.panzipool.api.entity.Tool;
import com.panzipool.api.repository.ToolLikeRepository;
import com.panzipool.api.repository.ToolRepository;
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
 * 点赞 API 集成测试（Task 5）。
 *
 * <p>通过真实 HTTP 调用（含 context-path /api/v1）验证：</p>
 * <ul>
 *   <li>首次点赞返回 200 + like_count（SubTask 5.1 / 5.3）</li>
 *   <li>重复点赞返回 409 + 当前 like_count（SubTask 5.2 / 5.3）</li>
 *   <li>tools.like_count 冗余计数同步更新（SubTask 5.4）</li>
 *   <li>不存在的 slug 返回 404（SubTask 5.1）</li>
 *   <li>anon_id 格式校验返回 400（SubTask 5.1）</li>
 * </ul>
 *
 * <p>使用默认 profile（H2 内存库 + Flyway）。为避免影响 ToolControllerTest 的种子数据，
 * 本测试使用独立的测试工具 slug（{@value #TEST_SLUG}），并在每个测试前后创建/清理。</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ToolControllerLikeTest {

    @LocalServerPort
    private int port;

    @Autowired
    private ToolRepository toolRepository;

    @Autowired
    private ToolLikeRepository toolLikeRepository;

    private final TestRestTemplate restTemplate = new TestRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 测试专用工具 slug，不与 V6 种子数据的 10 个工具冲突 */
    private static final String TEST_SLUG = "test-like-tool";
    private static final String VALID_ANON_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String ANOTHER_ANON_ID = "660e8400-e29b-41d4-a716-446655440001";

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @BeforeEach
    void setUp() {
        // 清理上一轮测试残留的点赞记录（全表，因无其他测试写入 tool_likes）
        toolLikeRepository.deleteAllInBatch();
        // 删除可能残留的测试工具
        toolRepository.findBySlug(TEST_SLUG).ifPresent(t -> toolRepository.deleteById(t.getId()));
        // 创建全新的测试工具，like_count=0
        Tool tool = new Tool();
        tool.setSlug(TEST_SLUG);
        tool.setName("测试点赞工具");
        tool.setCategory("developer");
        tool.setKeywords("test,like");
        tool.setDescription("点赞测试专用工具");
        tool.setEnabled(true);
        tool.setUseCount(0L);
        tool.setLikeCount(0L);
        toolRepository.save(tool);
    }

    @AfterEach
    void tearDown() {
        // 清理点赞记录
        toolLikeRepository.deleteAllInBatch();
        // 删除测试工具，恢复数据库到种子数据状态（10 个工具）
        toolRepository.findBySlug(TEST_SLUG).ifPresent(t -> toolRepository.deleteById(t.getId()));
    }

    /**
     * 发送点赞请求的辅助方法。
     */
    private ResponseEntity<String> postLike(String slug, String anonId) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = objectMapper.writeValueAsString(Map.of("anon_id", anonId));
        return restTemplate.exchange(
                url("/api/v1/tools/" + slug + "/like"),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);
    }

    // =========================================================================
    // SubTask 5.1 / 5.3: 首次点赞返回 200 + like_count
    // =========================================================================

    @Test
    void firstLike_returns200WithCorrectCount() throws Exception {
        ResponseEntity<String> resp = postLike(TEST_SLUG, VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.get("data").get("like_count").asInt()).isEqualTo(1);
        assertThat(body.get("data").get("liked").asBoolean()).isTrue();
        // 成功响应不应包含 message 字段
        assertThat(body.has("message")).isFalse();
    }

    // =========================================================================
    // SubTask 5.2 / 5.3: 重复点赞返回 409 Conflict + 当前 like_count
    // =========================================================================

    @Test
    void duplicateLike_returns409WithCurrentCount() throws Exception {
        // 首次点赞
        postLike(TEST_SLUG, VALID_ANON_ID);
        // 重复点赞（同一 anon_id）
        ResponseEntity<String> resp = postLike(TEST_SLUG, VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(409);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(409);
        assertThat(body.get("message").asText()).isEqualTo("您已经点过赞了");
        // 409 响应应携带 data（当前 like_count + liked=false），供前端同步修正
        assertThat(body.get("data").get("like_count").asInt()).isEqualTo(1);
        assertThat(body.get("data").get("liked").asBoolean()).isFalse();
    }

    // =========================================================================
    // SubTask 5.4: tools.like_count 冗余计数同步更新
    // =========================================================================

    @Test
    void likeCountSyncedToToolTable() throws Exception {
        // 两个不同匿名用户点赞
        postLike(TEST_SLUG, VALID_ANON_ID);
        postLike(TEST_SLUG, ANOTHER_ANON_ID);

        // 验证 tools 表的 like_count 冗余字段已同步递增
        Tool tool = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(tool.getLikeCount()).isEqualTo(2L);

        // 验证 tool_likes 表实际记录数与冗余计数一致
        assertThat(toolLikeRepository.countByToolId(tool.getId())).isEqualTo(2L);
    }

    @Test
    void duplicateLike_doesNotIncrementCount() throws Exception {
        postLike(TEST_SLUG, VALID_ANON_ID);
        postLike(TEST_SLUG, VALID_ANON_ID); // 重复，不应递增

        Tool tool = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(tool.getLikeCount()).isEqualTo(1L);
        assertThat(toolLikeRepository.countByToolId(tool.getId())).isEqualTo(1L);
    }

    // =========================================================================
    // SubTask 5.1: 不存在的 slug 返回 404
    // =========================================================================

    @Test
    void nonExistentSlug_returns404() throws Exception {
        ResponseEntity<String> resp = postLike("nonexistent-tool", VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(404);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(404);
        assertThat(body.get("message").asText()).isNotBlank();
        // 404 失败响应不应包含 data 字段
        assertThat(body.has("data")).isFalse();
    }

    // =========================================================================
    // SubTask 5.1: anon_id 格式校验（非 UUID 返回 400）
    // =========================================================================

    @Test
    void invalidAnonIdFormat_returns400() throws Exception {
        ResponseEntity<String> resp = postLike(TEST_SLUG, "not-a-uuid");

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(400);
        assertThat(body.get("message").asText()).contains("anon_id");
    }

    @Test
    void blankAnonId_returns400() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = objectMapper.writeValueAsString(Map.of("anon_id", ""));
        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/tools/" + TEST_SLUG + "/like"),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode responseBody = objectMapper.readTree(resp.getBody());
        assertThat(responseBody.get("code").asInt()).isEqualTo(400);
        assertThat(responseBody.get("message").asText()).contains("anon_id");
    }

    @Test
    void missingAnonIdField_returns400() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // 请求体不含 anon_id 字段
        String body = "{}";
        ResponseEntity<String> resp = restTemplate.exchange(
                url("/api/v1/tools/" + TEST_SLUG + "/like"),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);

        assertThat(resp.getStatusCode().value()).isEqualTo(400);
        JsonNode responseBody = objectMapper.readTree(resp.getBody());
        assertThat(responseBody.get("code").asInt()).isEqualTo(400);
    }

    // =========================================================================
    // 额外验证：不同 anon_id 对同一工具均可点赞
    // =========================================================================

    @Test
    void differentAnonIds_canBothLike() throws Exception {
        ResponseEntity<String> resp1 = postLike(TEST_SLUG, VALID_ANON_ID);
        ResponseEntity<String> resp2 = postLike(TEST_SLUG, ANOTHER_ANON_ID);

        assertThat(resp1.getStatusCode().value()).isEqualTo(200);
        assertThat(resp2.getStatusCode().value()).isEqualTo(200);

        JsonNode body1 = objectMapper.readTree(resp1.getBody());
        JsonNode body2 = objectMapper.readTree(resp2.getBody());
        assertThat(body1.get("data").get("like_count").asInt()).isEqualTo(1);
        assertThat(body2.get("data").get("like_count").asInt()).isEqualTo(2);
        assertThat(body1.get("data").get("liked").asBoolean()).isTrue();
        assertThat(body2.get("data").get("liked").asBoolean()).isTrue();
    }
}
