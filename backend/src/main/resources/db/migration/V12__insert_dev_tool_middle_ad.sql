-- ============================================================================
-- V12: 插入京东联盟广告数据 —— 开发工具中部广告位
-- ----------------------------------------------------------------------------
-- 广告位置：开发工具页中部横幅广告
-- 广告联盟：京东联盟
-- 商品：零基础学Python教程
-- ============================================================================

INSERT INTO ad_promotion 
    (ad_union, ad_union_symbol, ad_placement, pid, product_description, product_url, ad_url, ad_start, ad_end, ad_enabled, ad_location, ad_location_symbol)
SELECT 
    '京东联盟',
    'union.jd.com',
    '开发工具页中部横幅广告',
    '2038390407_4106946728_31074407',
    '零基础学Python教程｜新手入门编程优选，爬虫开发实战程序设计核心技术',
    '/images/ad/ad_dev_tool1.jpg',
    'https://u.jd.com/9rkFqr3',
    '2026-07-26 00:00:00',
    '2026-09-24 23:59:59',
    TRUE,
    '开发工具中部广告位',
    'dev_tool_middle'
WHERE NOT EXISTS (
    SELECT 1 FROM ad_promotion WHERE ad_location_symbol = 'dev_tool_middle'
);
