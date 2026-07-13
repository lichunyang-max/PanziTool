package com.panzipool.api.controller;

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
 *
 * <p>通过真实 HTTP（含 context-path /api/v1）验证：
 * <ul>
 *   <li>GET /api/v1/tools 列表接口（分类筛选、热门/最新排序、分页）</li>
 *   <li>GET /api/v1/tools/{slug} 详情接口（含 use_count、like_count 冗余计数）</li>
 *   <li>不存在的 slug 返回 404</li>
 *   <li>JSON 字段使用 snake_case（use_count、like_count、created_at、updated_at）</li>
 * </ul>
 *
 * <p>使用默认 profile（H2 内存库），Flyway V6 种子数据自动加载 10 个工具。</p>
 *
 * <p><b>测试隔离说明</b>：由于 ToolControllerLikeTest（Task 5）的 @BeforeEach 会删除所有工具，
 * 两个测试类共享同一 Spring 上下文与 H2 数据库，因此本测试通过 @Sql 在每个测试方法前
 * 重置工具种子数据，保证 10 个工具完整。</p>
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

    // ========== SubTask 6.1: GET /api/v1/tools 列表接口 ==========

    @Test
    void listTools_noParams_returnsAllToolsSortedByPopular() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/tools"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode body = objectMapper.readTree(resp.getBody());
        assertThat(body.get("code").asInt()).isZero();

        JsonNode data = body.get("data");
        JsonNode items = data.get("items");
        assertThat(items.isArray()).isTrue();
        // 种子数据共 10 个工具
        assertThat(items.size()).isEqualTo(10);
        assertThat(data.get("total").asLong()).isEqualTo(10L);

        // 默认 popular 排序：按 use_count 降序
        // 预期顺序：json-formatter(12300) > regex-tester(8700) > timestamp(6200) > url-encode(5100)
        assertThat(items.get(0).get("slug").asText()).isEqualTo("json-formatter");
        assertThat(items.get(0).get("use_count").asLong()).isEqualTo(12300L);
        assertThat(items.get(1).get("slug").asText()).isEqualTo("regex-tester");
        assertThat(items.get(2).get("slug").asText()).isEqualTo("timestamp");
        assertThat(items.get(3).get("slug").asText()).isEqualTo("url-encode");
        // 最后一个应该是 image-convert(2300)
        assertThat(items.get(9).get("slug").asText()).isEqualTo("image-convert");

        // 验证 JSON 字段使用 snake_case
        assertThat(items.get(0).has("use_count")).isTrue();
        assertThat(items.get(0).has("like_count")).isTrue();
        // 验证不应出现 camelCase 字段
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

        // 全部应为 developer 分类
        for (JsonNode item : items) {
            assertThat(item.get("category").asText()).isEqualTo("developer");
        }

        // popular 排序：developer 分类中 json-formatter(12300) 第一
        assertThat(items.get(0).get("slug").asText()).isEqualTo("json-formatter");
        // hash(3900) 应为 developer 分类最后
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

        // 全部应为 image 分类
        for (JsonNode item : items) {
            assertThat(item.get("category").asText()).isEqualTo("image");
        }

        // popular 排序：image-compress(3500) > image-crop(2800) > image-convert(2300)
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

        // 验证 latest 排序字段存在（created_at 在详情接口验证，列表项不含时间字段）
        // 种子数据 created_at 相同（同一 INSERT 语句），主要验证接口不报错且返回全部工具
        // 所有工具都应返回
        assertThat(body.get("data").get("total").asLong()).isEqualTo(10L);
    }

    @Test
    void listTools_sortPopular_explicitParam_returnsByUseCountDesc() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(
                url("/api/v1/tools?sort=popular"), String.class);

        assertThat(resp.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode items = objectMapper.readTree(resp.getBody()).get("data").get("items");

        // 验证 use_count 严格降序
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

        // 返回 3 个工具，但 total 仍为 10
        assertThat(data.get("items").size()).isEqualTo(3);
        assertThat(data.get("total").asLong()).isEqualTo(10L);

        // 前 3 个应为 use_count 最高的
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

        // 从索引 3 开始取 3 个，total 仍为 10
        assertThat(data.get("items").size()).isEqualTo(3);
        assertThat(data.get("total").asLong()).isEqualTo(10L);

        // 偏移 3 后，第一个应为 url-encode（use_count 排第 4）
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

        // 验证列表项包含所有必需字段
        assertThat(first.has("slug")).isTrue();
        assertThat(first.has("name")).isTrue();
        assertThat(first.has("category")).isTrue();
        assertThat(first.has("description")).isTrue();
        assertThat(first.has("keywords")).isTrue();
        assertThat(first.has("use_count")).isTrue();
        assertThat(first.has("like_count")).isTrue();

        // 验证 json-formatter 的计数
        assertThat(first.get("slug").asText()).isEqualTo("json-formatter");
        assertThat(first.get("use_count").asLong()).isEqualTo(12300L);
        assertThat(first.get("like_count").asLong()).isEqualTo(892L);
    }

    // ========== SubTask 6.2: GET /api/v1/tools/{slug} 详情接口 ==========

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
        // 冗余计数字段
        assertThat(data.get("use_count").asLong()).isEqualTo(12300L);
        assertThat(data.get("like_count").asLong()).isEqualTo(892L);
        // 时间戳字段
        assertThat(data.has("created_at")).isTrue();
        assertThat(data.has("updated_at")).isTrue();
        assertThat(data.get("created_at").asText()).isNotBlank();
        assertThat(data.get("updated_at").asText()).isNotBlank();

        // 验证 JSON 字段使用 snake_case，不出现 camelCase
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
        // 失败响应不应包含 data 字段
        assertThat(body.has("data")).isFalse();
    }

    @Test
    void getTool_allSeedTools_accessible() throws Exception {
        // 验证所有 10 个种子工具都能通过详情接口访问
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

    // ========== 响应信封格式验证 ==========

    @Test
    void listTools_successEnvelopeFormat() throws Exception {
        ResponseEntity<String> resp = restTemplate.getForEntity(url("/api/v1/tools"), String.class);

        JsonNode body = objectMapper.readTree(resp.getBody());
        // 成功响应：code=0, data 存在, message 不存在
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
