package com.panzipool.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 应用上下文启动冒烟测试。
 *
 * <p>使用默认 profile（H2 内存库），验证 Spring 上下文可正常加载。</p>
 */
@SpringBootTest
class PanziPoolApplicationTests {

    @Test
    void contextLoads() {
        // 仅验证上下文能成功启动，无需额外断言
    }
}
