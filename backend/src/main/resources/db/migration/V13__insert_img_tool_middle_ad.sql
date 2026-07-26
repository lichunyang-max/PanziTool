-- ============================================================================
-- V13: 插入淘宝联盟广告数据 —— 图片工具中部广告位
-- ----------------------------------------------------------------------------
-- 广告位置：图片工具页中部横幅广告
-- 广告联盟：淘宝联盟
-- 商品：深睡控温夏凉被
-- ============================================================================

INSERT INTO ad_promotion 
    (ad_union, ad_union_symbol, ad_placement, pid, product_description, product_url, ad_url, ad_start, ad_end, ad_enabled, ad_location, ad_location_symbol)
SELECT 
    '淘宝联盟',
    'pub.alimama.com',
    '图片工具页中部横幅广告',
    'mm_10463602253_34291001_116303750060',
    '深睡控温夏凉被｜学生宿舍春夏床品优选，空调被可机洗单人夏夜舒适透气',
    '/images/ad/ad_img_tool1.jpg',
    'https://s.click.taobao.com/DCM5Ek',
    '2026-07-26 00:00:00',
    '2027-05-19 23:59:59',
    TRUE,
    '图片工具中部广告位',
    'img_tool_middle'
WHERE NOT EXISTS (
    SELECT 1 FROM ad_promotion WHERE ad_location_symbol = 'img_tool_middle'
);
