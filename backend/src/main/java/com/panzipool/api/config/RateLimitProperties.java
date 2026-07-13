package com.panzipool.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 频率限制配置属性。
 *
 * <p>读取 application.yml 中 {@code panzipool.ratelimit} 下的配置项，
 * 支持通过环境变量覆盖（如 {@code PANZIPOOL_RATELIMIT_ANON_ID_PER_MINUTE}）。</p>
 */
@ConfigurationProperties(prefix = "panzipool.ratelimit")
public class RateLimitProperties {

    /** 同一 anon_id 每分钟最大请求数，默认 30 */
    private int anonIdPerMinute = 30;

    /** 同一 IP 每分钟最大请求数，默认 60 */
    private int ipPerMinute = 60;

    public int getAnonIdPerMinute() {
        return anonIdPerMinute;
    }

    public void setAnonIdPerMinute(int anonIdPerMinute) {
        this.anonIdPerMinute = anonIdPerMinute;
    }

    public int getIpPerMinute() {
        return ipPerMinute;
    }

    public void setIpPerMinute(int ipPerMinute) {
        this.ipPerMinute = ipPerMinute;
    }
}
