package com.panzipool.api.web.tool.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlConfig;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 工具元数据与计数查询 API 集成测试。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Sql(scripts = "/db/reset_tools_for_test.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD,
        config = @SqlConfig(encoding = "UTF-8"))
class ToolControllerTest {

    @LocalServerPort
    private int port;

    private final TestRestTemplate restTemplate = new TestRestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    @Test
    void listTools_noParams_returnsAllToolsSortedByPopular() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/tools"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();

        JsonNode data = body.get("data");
        JsonNode items = data.get("items");
        assertThat(items.isArray()).isTrue();
        assertThat(items.size()).isEqualTo(10);
        assertThat(data.get("total").asLong()).isEqualTo(10L);

        assertThat(items.get(0).get("slug").asText()).isEqualTo("json-formatter");
        assertThat(items.get(0).get("use_count").asLong()).isEqualTo(12300L);
        assertThat(items.get(1).get("slug").asText()).isEqualTo("regex-tester");
        assertThat(items.get(2).get("slug").asText()).isEqualTo("timestamp");
        assertThat(items.get(3).get("slug").asText()).isEqualTo("url-encode");
        assertThat(items.get(9).get("slug").asText()).isEqualTo("image-convert");

        assertThat(items.get(0).has("use_count")).isTrue();
        assertThat(items.get(0).has("like_count")).isTrue();
        assertThat(items.get(0).has("useCount")).isFalse();
        assertThat(items.get(0).has("likeCount")).isFalse();
    }

    @Test
    void listTools_categoryDeveloper_returns7Tools() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?category=developer"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();

        JsonNode data = body.get("data");
        JsonNode items = data.get("items");
        assertThat(items.size()).isEqualTo(7);
        assertThat(data.get("total").asLong()).isEqualTo(7L);

        for (JsonNode item : items) {
            assertThat(item.get("category").asText()).isEqualTo("developer");
        }

        assertThat(items.get(0).get("slug").asText()).isEqualTo("json-formatter");
        assertThat(items.get(6).get("slug").asText()).isEqualTo("hash");
    }

    @Test
    void listTools_categoryImage_returns3Tools() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?category=image"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();

        JsonNode data = body.get("data");
        JsonNode items = data.get("items");
        assertThat(items.size()).isEqualTo(3);
        assertThat(data.get("total").asLong()).isEqualTo(3L);

        for (JsonNode item : items) {
            assertThat(item.get("category").asText()).isEqualTo("image");
        }

        assertThat(items.get(0).get("slug").asText()).isEqualTo("image-compress");
        assertThat(items.get(1).get("slug").asText()).isEqualTo("image-crop");
        assertThat(items.get(2).get("slug").asText()).isEqualTo("image-convert");
    }

    @Test
    void listTools_sortLatest_returnsToolsSortedByCreatedAtDesc() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?sort=latest"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();

        JsonNode items = body.get("data").get("items");
        assertThat(items.size()).isEqualTo(10);
        assertThat(body.get("data").get("total").asLong()).isEqualTo(10L);
    }

    @Test
    void listTools_sortPopular_explicitParam_returnsByUseCountDesc() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?sort=popular"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode items = objectMapper.readTree(resp.getBody()).get("data").get("items");

        long prevUseCount = Long.MAX_VALUE;
        for (JsonNode item : items) {
            long currentUseCount = item.get("use_count").asLong();
            assertThat(currentUseCount).isLessThanOrEqualTo(prevUseCount);
            prevUseCount = currentUseCount;
        }
    }

    @Test
    void listTools_withLimit_returnsLimitedItemsTotalUnchanged() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?limit=3"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");

        assertThat(data.get("items").size()).isEqualTo(3);
        assertThat(data.get("total").asLong()).isEqualTo(10L);

        assertThat(data.get("items").get(0).get("slug").asText()).isEqualTo("json-formatter");
        assertThat(data.get("items").get(1).get("slug").asText()).isEqualTo("regex-tester");
        assertThat(data.get("items").get(2).get("slug").asText()).isEqualTo("timestamp");
    }

    @Test
    void listTools_withOffset_returnsOffsetItems() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?offset=3&limit=3"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");

        assertThat(data.get("items").size()).isEqualTo(3);
        assertThat(data.get("total").asLong()).isEqualTo(10L);

        assertThat(data.get("items").get(0).get("slug").asText()).isEqualTo("url-encode");
        assertThat(data.get("items").get(1).get("slug").asText()).isEqualTo("jwt-decoder");
        assertThat(data.get("items").get(2).get("slug").asText()).isEqualTo("base64");
    }

    @Test
    void listTools_offsetBeyondSize_returnsEmptyItems() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?offset=100"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");

        assertThat(data.get("items").size()).isZero();
        assertThat(data.get("total").asLong()).isEqualTo(10L);
    }

    @Test
    void listTools_itemsContainRedundantCountFields() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/tools"), String.class);

        JsonNode items = objectMapper.readTree(resp.getBody()).get("data").get("items");
        JsonNode first = items.get(0);

        assertThat(first.has("slug")).isTrue();
        assertThat(first.has("name")).isTrue();
        assertThat(first.has("category")).isTrue();
        assertThat(first.has("description")).isTrue();
        assertThat(first.has("keywords")).isTrue();
        assertThat(first.has("use_count")).isTrue();
        assertThat(first.has("like_count")).isTrue();

        assertThat(first.get("slug").asText()).isEqualTo("json-formatter");
        assertThat(first.get("use_count").asLong()).isEqualTo(12300L);
        assertThat(first.get("like_count").asLong()).isEqualTo(892L);
    }

    @Test
    void getTool_validSlug_returnsDetailWithCounts() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools/json-formatter"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();

        JsonNode data = body.get("data");
        assertThat(data.get("slug").asText()).isEqualTo("json-formatter");
        assertThat(data.get("name").asText()).isEqualTo("JSON格式化");
        assertThat(data.get("category").asText()).isEqualTo("developer");
        assertThat(data.get("description").asText()).contains("JSON");
        assertThat(data.get("keywords").asText()).contains("json");
        assertThat(data.get("use_count").asLong()).isEqualTo(12300L);
        assertThat(data.get("like_count").asLong()).isEqualTo(892L);
        assertThat(data.has("created_at")).isTrue();
        assertThat(data.has("updated_at")).isTrue();
        assertThat(data.get("created_at").asText()).isNotBlank();
        assertThat(data.get("updated_at").asText()).isNotBlank();

        assertThat(data.has("useCount")).isFalse();
        assertThat(data.has("likeCount")).isFalse();
        assertThat(data.has("createdAt")).isFalse();
        assertThat(data.has("updatedAt")).isFalse();
    }

    @Test
    void getTool_imageTool_returnsCorrectDetail() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools/image-compress"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode data = objectMapper.readTree(resp.getBody()).get("data");
        assertThat(data.get("slug").asText()).isEqualTo("image-compress");
        assertThat(data.get("name").asText()).isEqualTo("图片压缩");
        assertThat(data.get("category").asText()).isEqualTo("image");
        assertThat(data.get("use_count").asLong()).isEqualTo(3500L);
        assertThat(data.get("like_count").asLong()).isEqualTo(412L);
    }

    @Test
    void getTool_nonExistentSlug_returns404() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools/non-existent-tool"), String.class);

        assertThat(resp.getStatusCodeValue()).isEqualTo(404);
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isEqualTo(404);
        assertThat(body.get("message").asText()).isEqualTo("工具不存在");
        assertThat(body.has("data")).isFalse();
    }

    @Test
    void getTool_allSeedTools_accessible() throws Exception {
        String[] slugs = {
                "json-formatter", "url-encode", "base64", "timestamp", "regex-tester",
                "jwt-decoder", "hash", "image-compress", "image-crop", "image-convert"
        };

        for (String slug : slugs) {
            ResponseEntity<String> resp = restTemplate.getForEntity(
                    url("/api/v1/tools/" + slug), String.class);
            assertThat(resp.getStatusCode().is2xxSuccessful())
                    .as("工具 %s 应可访问", slug)
                    .isTrue();
            JsonNode data = objectMapper.readTree(resp.getBody()).get("data");
            assertThat(data.get("slug").asText()).isEqualTo(slug);
            assertThat(data.has("use_count")).isTrue();
            assertThat(data.has("like_count")).isTrue();
        }
    }

    @Test
    void listTools_successEnvelopeFormat() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/tools"), String.class);

        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.has("data")).isTrue();
        assertThat(body.has("message")).isFalse();
    }

    @Test
    void getTool_successEnvelopeFormat() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools/hash"), String.class);

        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();
        assertThat(body.has("data")).isTrue();
        assertThat(body.has("message")).isFalse();
    }
}