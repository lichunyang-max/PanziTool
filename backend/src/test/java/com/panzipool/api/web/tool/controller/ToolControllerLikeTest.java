package com.panzipool.api.web.tool.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.panzipool.api.web.tool.dao.ToolLikeRepository;
import com.panzipool.api.web.tool.dao.ToolRepository;
import com.panzipool.api.web.tool.entity.Tool;
import com.panzipool.api.web.tool.entity.ToolLike;
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

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 点赞 API 集成测试（Task 5）。
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

    private static final String TEST_SLUG = "test-like-tool";
    private static final String VALID_ANON_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String ANOTHER_ANON_ID = "660e8400-e29b-41d4-a716-446655440001";

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @BeforeEach
    void setUp() {
        toolLikeRepository.deleteAllInBatch();
        toolRepository.findBySlug(TEST_SLUG).ifPresent(t -> toolRepository.deleteById(t.getId()));
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
        toolLikeRepository.deleteAllInBatch();
        toolRepository.findBySlug(TEST_SLUG).ifPresent(t -> toolRepository.deleteById(t.getId()));
    }

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

    @Test
    void firstLike_returns200WithCorrectCount() throws Exception {
        ResponseEntity<String> resp = postLike(TEST_SLUG, VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.get("data").get("like_count").asInt()).isEqualTo(1);
        assertThat(body.get("data").get("liked").asBoolean()).isTrue();
        assertThat(body.has("message")).isFalse();
    }

    @Test
    void duplicateLike_returns409WithCurrentCount() throws Exception {
        postLike(TEST_SLUG, VALID_ANON_ID);
        ResponseEntity<String> resp = postLike(TEST_SLUG, VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(409);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(409);
        assertThat(body.get("message").asText()).isEqualTo("您已经点过赞了");
        assertThat(body.get("data").get("like_count").asInt()).isEqualTo(1);
        assertThat(body.get("data").get("liked").asBoolean()).isFalse();
    }

    @Test
    void nextDayLike_returns200() throws Exception {
        Tool tool = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        ToolLike yesterdayLike = new ToolLike();
        yesterdayLike.setToolId(tool.getId());
        yesterdayLike.setAnonId(VALID_ANON_ID);
        yesterdayLike.setLikeDate(LocalDate.now().minusDays(1));
        toolLikeRepository.saveAndFlush(yesterdayLike);
        tool.setLikeCount(1L);
        toolRepository.save(tool);

        ResponseEntity<String> resp = postLike(TEST_SLUG, VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.get("data").get("like_count").asInt()).isEqualTo(2);
        assertThat(body.get("data").get("liked").asBoolean()).isTrue();

        assertThat(toolLikeRepository.countByToolId(tool.getId())).isEqualTo(2L);
    }

    @Test
    void likeCountSyncedToToolTable() throws Exception {
        postLike(TEST_SLUG, VALID_ANON_ID);
        postLike(TEST_SLUG, ANOTHER_ANON_ID);

        Tool tool = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(tool.getLikeCount()).isEqualTo(2L);
        assertThat(toolLikeRepository.countByToolId(tool.getId())).isEqualTo(2L);
    }

    @Test
    void duplicateLike_doesNotIncrementCount() throws Exception {
        postLike(TEST_SLUG, VALID_ANON_ID);
        postLike(TEST_SLUG, VALID_ANON_ID);

        Tool tool = toolRepository.findBySlug(TEST_SLUG).orElseThrow();
        assertThat(tool.getLikeCount()).isEqualTo(1L);
        assertThat(toolLikeRepository.countByToolId(tool.getId())).isEqualTo(1L);
    }

    @Test
    void nonExistentSlug_returns404() throws Exception {
        ResponseEntity<String> resp = postLike("nonexistent-tool", VALID_ANON_ID);

        assertThat(resp.getStatusCode().value()).isEqualTo(404);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(404);
        assertThat(body.get("message").asText()).isNotBlank();
        assertThat(body.has("data")).isFalse();
    }

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