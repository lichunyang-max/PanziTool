package com.panzipool.api.config;

import com.panzipool.api.web.ad.entity.AdPromotion;
import com.panzipool.api.web.ad.dao.AdPromotionRepository;
import com.panzipool.api.web.admin.dao.AdminUserRepository;
import com.panzipool.api.web.admin.entity.AdminUser;
import com.panzipool.api.web.tool.entity.Tool;
import com.panzipool.api.web.tool.dao.ToolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
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
            if (toolRepository.count() == 0) {
                log.info("tools 表为空，开始初始化种子工具");
                toolRepository.saveAll(buildSeedTools());
                log.info("工具种子数据初始化完成，共 {} 个", toolRepository.count());
                return;
            }
            // 按 slug 逐个检查，补充缺失的种子工具
            List<Tool> seedTools = buildSeedTools();
            for (Tool seedTool : seedTools) {
                if (toolRepository.findBySlug(seedTool.getSlug()).isEmpty()) {
                    log.info("补充缺失的种子工具: {}", seedTool.getSlug());
                    toolRepository.save(seedTool);
                }
            }
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

    @Bean
    public ApplicationRunner adminUserInitializer(AdminUserRepository adminUserRepository) {
        return args -> {
            if (adminUserRepository.existsByUsername("admin")) {
                log.debug("admin_users 表已存在 admin 账号，跳过初始化");
                return;
            }
            log.info("admin_users 表为空，创建默认管理员账号");
            AdminUser admin = new AdminUser();
            admin.setUsername("admin");
            admin.setPasswordHash(new BCryptPasswordEncoder().encode("123456"));
            admin.setDisplayName("超级管理员");
            admin.setEnabled(true);
            adminUserRepository.save(admin);
            log.info("默认管理员账号已创建: admin / 123456");
        };
    }

    private List<Tool> buildSeedTools() {
        LocalDateTime now = LocalDateTime.now();
        return List.of(
                tool("cron", "Cron表达式工具", "developer",
                        "cron,定时,表达式,任务调度",
                        "Cron表达式解析、校验、中文解释与触发时间预览工具", true, 0L, 0L, now),
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
                        "PNG/JPG/WEBP互转，透明背景处理", true, 2300L, 187L, now),
                tool("qr-code", "二维码生成器", "developer",
                        "qr,二维码,生成,logo,在线二维码",
                        "文本/链接/WiFi/邮箱二维码生成，支持自定义颜色、Logo嵌入与PNG/SVG导出", true, 0L, 0L, now),
                tool("id-photo", "AI证件照", "image",
                        "id-photo,ai,证件照,换底色,一寸,二寸",
                        "AI智能抠图换底色生成标准证件照，本地处理不上传", true, 0L, 0L, now),
                // ===== 第二批：开发者工具扩展（14 个，纯前端本地运算） =====
                tool("hex-encode", "Hex十六进制编解码", "developer",
                        "hex,十六进制,编码,解码,字节,二进制报文",
                        "字符串与十六进制互转，支持多种分隔符格式与字节调试，本地运算保障数据安全", true, 0L, 0L, now),
                tool("unicode-convert", "Unicode转中文", "developer",
                        "unicode,\\u,转中文,编码,解码,转义",
                        "\\uXXXX Unicode编码与中文互转，快速解析日志转义乱码，本地处理不上传", true, 0L, 0L, now),
                tool("base-convert", "进制转换器", "developer",
                        "进制转换,二进制,八进制,十进制,十六进制,base",
                        "2/8/10/16进制互相转换，支持位运算、颜色掩码计算调试", true, 0L, 0L, now),
                tool("image-base64", "图片Base64互转", "developer",
                        "图片base64,base64转图片,图片转base64,datauri",
                        "图片转Base64字符串，Base64还原图片预览，接口参数调试", true, 0L, 0L, now),
                tool("xml-formatter", "XML格式化校验", "developer",
                        "xml,格式化,美化,压缩,校验,soap",
                        "XML报文美化、压缩、语法校验，定位标签错误，适配SOAP接口", true, 0L, 0L, now),
                tool("yaml-formatter", "YAML格式化校验", "developer",
                        "yaml,格式化,校验,k8s,docker-compose,配置",
                        "YAML美化、校验缩进语法错误，适配K8s、docker-compose配置调试", true, 0L, 0L, now),
                tool("csv-json-convert", "CSV转JSON", "developer",
                        "csv,json,转换,表格,数据导出,mock",
                        "CSV表格与JSON互转，测试数据导出导入，Mock接口数据", true, 0L, 0L, now),
                tool("uuid-generator", "UUID生成器", "developer",
                        "uuid,guid,生成器,唯一标识,主键,请求id",
                        "批量生成UUID，用于测试主键、请求ID、业务唯一标识", true, 0L, 0L, now),
                tool("mock-data", "Mock数据生成", "developer",
                        "mock,随机数据,手机号,姓名,地址,测试数据",
                        "批量生成手机号、姓名、地址等模拟数据，快速构造接口测试入参", true, 0L, 0L, now),
                tool("string-toolkit", "字符串工具箱", "developer",
                        "字符串,去空格,大小写,字符统计,分割,拼接",
                        "文本去空格、大小写转换、字符统计、分割拼接，批量处理日志文本", true, 0L, 0L, now),
                tool("color-converter", "颜色转换器", "developer",
                        "颜色转换,hex,rgb,hsl,色值,前端样式",
                        "HEX/RGB/HSL色值互转，前端样式调试，设计稿色值转换", true, 0L, 0L, now),
                tool("html-escape", "HTML转义反转义", "developer",
                        "html转义,反转义,实体编码,xss,特殊字符",
                        "HTML特殊字符转义还原，处理XSS、页面标签解析调试", true, 0L, 0L, now),
                tool("js-css-beautify", "JS/CSS美化压缩", "developer",
                        "js美化,css美化,格式化,压缩,混淆还原",
                        "压缩混淆后的JS/CSS格式化还原，阅读线上压缩资源", true, 0L, 0L, now),
                tool("timezone-calculator", "时区时间计算器", "developer",
                        "时区,时间换算,时间差,utc,跨时区",
                        "多时区时间换算、时间差计算，排查跨时区业务时间bug", true, 0L, 0L, now)
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