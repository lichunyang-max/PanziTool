package com.panzipool.api.config;

import com.panzipool.api.web.ad.entity.AdPromotion;
import com.panzipool.api.web.ad.dao.AdPromotionRepository;
import com.panzipool.api.web.tool.entity.Tool;
import com.panzipool.api.web.tool.dao.ToolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 应用启动数据初始化器。
 *
 * <p>替代原 Flyway V6（工具种子数据）与 V11-V13（广告种子数据）：
 * 使用 JPA ddl-auto=update 管理表结构后，启动时检测表是否为空，
 * 为空则插入基础种子数据，避免依赖 SQL 迁移脚本。</p>
 *
 * <p>生产环境若表已存在数据，本初始化器不会覆盖；新增工具/广告请通过管理后台或手动 SQL。</p>
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    /**
     * 工具种子数据初始化。
     */
    @Bean
    public ApplicationRunner toolDataInitializer(ToolRepository toolRepository) {
        return args -> {
            if (toolRepository.count() > 0) {
                log.debug("tools 表已有数据，跳过种子数据初始化 (count={})", toolRepository.count());
                return;
            }
            log.info("tools 表为空，开始初始化 10 个种子工具");
            toolRepository.saveAll(buildSeedTools());
            log.info("工具种子数据初始化完成，共 {} 个", toolRepository.count());
        };
    }

    /**
     * 广告种子数据初始化。
     */
    @Bean
    public ApplicationRunner adDataInitializer(AdPromotionRepository adPromotionRepository) {
        return args -> {
            if (adPromotionRepository.count() > 0) {
                log.debug("ad_promotion 表已有数据，跳过种子数据初始化 (count={})", adPromotionRepository.count());
                return;
            }
            log.info("ad_promotion 表为空，开始初始化 3 条种子广告");
            adPromotionRepository.saveAll(buildSeedAds());
            log.info("广告种子数据初始化完成，共 {} 条", adPromotionRepository.count());
        };
    }

    private List<Tool> buildSeedTools() {
        LocalDateTime now = LocalDateTime.now();
        return List.of(
                tool("json-formatter", "JSON格式化", "developer",
                        "json,format,beautify,minify,validate",
                        "JSON美化、压缩、语法校验，错误定位提示", true, 12300L, 892L, now),
                tool("url-encode", "URL编码解码", "developer",
                        "url,encode,decode,uri,component",
                        "URL Encode/Decode，一键复制", true, 5100L, 312L, now),
                tool("base64", "Base64编码", "developer",
                        "base64,encode,decode,utf8",
                        "文本Base64编解码，UTF-8支持", true, 4300L, 256L, now),
                tool("timestamp", "时间戳转换", "developer",
                        "timestamp,unix,date,time,转换",
                        "秒/毫秒时间戳与日期互转", true, 6200L, 423L, now),
                tool("regex-tester", "正则测试", "developer",
                        "regex,regexp,正则,匹配,高亮",
                        "正则匹配、高亮、分组信息展示", true, 8700L, 651L, now),
                tool("jwt-decoder", "JWT解析", "developer",
                        "jwt,json,web,token,decode",
                        "Header/Payload解析，过期时间提示", true, 4800L, 287L, now),
                tool("hash", "哈希计算", "developer",
                        "hash,md5,sha1,sha256,摘要",
                        "MD5/SHA1/SHA256哈希计算", true, 3900L, 198L, now),
                tool("image-compress", "图片压缩", "image",
                        "image,compress,压缩,jpg,png,webp",
                        "本地压缩JPG/PNG/WEBP，不上传", true, 3500L, 412L, now),
                tool("image-crop", "图片裁剪", "image",
                        "image,crop,裁剪,resize,尺寸",
                        "裁剪、旋转、自定义尺寸导出", true, 2800L, 301L, now),
                tool("image-convert", "格式转换", "image",
                        "image,convert,转换,png,jpg,webp",
                        "PNG/JPG/WEBP互转，透明背景处理", true, 2300L, 187L, now)
        );
    }

    private static Tool tool(String slug, String name, String category,
                             String keywords, String description,
                             boolean enabled, long useCount, long likeCount,
                             LocalDateTime now) {
        Tool t = new Tool();
        t.setSlug(slug);
        t.setName(name);
        t.setCategory(category);
        t.setKeywords(keywords);
        t.setDescription(description);
        t.setEnabled(enabled);
        t.setUseCount(useCount);
        t.setLikeCount(likeCount);
        t.setCreatedAt(now);
        t.setUpdatedAt(now);
        return t;
    }

    private List<AdPromotion> buildSeedAds() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime nextYear = now.plusYears(1);
        return List.of(
                ad("阿里云", "promotion.aliyuncs.com", "首页中部横幅",
                        "mm_10463602253_3429100_25890111",
                        "阿里云轻量云服务器｜建站、程序测试优选，到手68元起",
                        "https://img.alicdn.com/imgextra/i4/2200723868159/O1CN01xxxxxx.png",
                        "https://www.aliyun.com/minisite/goods?userCode=xxx",
                        now, nextYear, "网站首页中部广告位", "home_middle"),
                ad("京东", "union.jd.com", "开发者工具中部",
                        "1000001897_1000001785_12910090",
                        "京东云开发者工具｜代码托管、CI/CD、监控告警一站式服务",
                        "https://img14.360buyimg.com/imagetools/jfs/t1/xxx.jpg",
                        "https://u.jd.com/jda_xxx",
                        now, nextYear, "开发者工具中部广告位", "dev_tool_middle"),
                ad("京东", "union.jd.com", "图片工具中部",
                        "1000001897_1000001785_12910091",
                        "京东云对象存储｜图片处理、CDN加速、安全防护",
                        "https://img14.360buyimg.com/imagetools/jfs/t1/xxx2.jpg",
                        "https://u.jd.com/jda_xxx2",
                        now, nextYear, "图片工具中部广告位", "img_tool_middle")
        );
    }

    private static AdPromotion ad(String adUnion, String adUnionSymbol, String adPlacement,
                                   String pid, String productDescription, String productUrl,
                                   String adUrl, LocalDateTime start, LocalDateTime end,
                                   String adLocation, String adLocationSymbol) {
        AdPromotion a = new AdPromotion();
        a.setAdUnion(adUnion);
        a.setAdUnionSymbol(adUnionSymbol);
        a.setAdPlacement(adPlacement);
        a.setPid(pid);
        a.setProductDescription(productDescription);
        a.setProductUrl(productUrl);
        a.setAdUrl(adUrl);
        a.setAdStart(start);
        a.setAdEnd(end);
        a.setAdEnabled(true);
        a.setAdLocation(adLocation);
        a.setAdLocationSymbol(adLocationSymbol);
        a.setCreatedAt(start);
        a.setUpdatedAt(start);
        return a;
    }
}