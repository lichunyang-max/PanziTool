-- ============================================================================
-- V11: 插入京东联盟广告数据 —— 工具页底部广告位
-- ----------------------------------------------------------------------------
-- 广告位置：工具页底部横幅广告
-- 广告联盟：京东联盟
-- 商品：ikbc机械键盘
-- ============================================================================

INSERT INTO ad_promotion 
    (ad_union, ad_union_symbol, ad_placement, pid, product_description, product_url, ad_url, ad_start, ad_end, ad_enabled, ad_location, ad_location_symbol)
SELECT 
    '京东联盟',
    'union.jd.com',
    '工具页底部横幅广告',
    '2038390407_4106946728_3107402034',
    'ikbc机械键盘｜程序员码字办公外设优选，电竞游戏键盘办公打字手感好',
    '/images/ad/ad_tool1.jpg',
    'https://u.jd.com/96kaWxN',
    '2026-07-26 00:00:00',
    '2026-09-24 23:59:59',
    TRUE,
    '网站工具页底部广告位',
    'tool_footer'
WHERE NOT EXISTS (
    SELECT 1 FROM ad_promotion WHERE ad_location_symbol = 'tool_footer'
);
