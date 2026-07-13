#!/usr/bin/env bash
# ============================================================================
# PanziPool PostgreSQL 数据库备份脚本
# ----------------------------------------------------------------------------
# 功能：使用 pg_dump 导出数据库并 gzip 压缩，自动清理超过 30 天的旧备份。
#
# 使用方式：
#   ./scripts/backup-db.sh
#
# 所需环境变量：
#   DB_HOST      数据库主机地址（默认 localhost）
#   DB_PORT      数据库端口（默认 5432）
#   DB_NAME      数据库名称（默认 panzipool）
#   DB_USER      数据库用户名（默认 postgres）
#   DB_PASSWORD  数据库密码（必填）
#
# 建议配合 crontab 定时执行，例如每天凌晨 1 点备份：
#   0 1 * * * /path/to/PanziTool/scripts/backup-db.sh >> /var/log/panzipool-backup.log 2>&1
#
# 恢复流程：
#   1. 使用 restore-db.sh 脚本恢复：
#      ./scripts/restore-db.sh backups/panzipool_backup_20250101_010000.sql.gz
#   2. 或手动恢复：
#      gunzip -c backups/panzipool_backup_YYYYMMDD_HHmmss.sql.gz | psql -h <host> -p <port> -U <user> -d <dbname>
# ============================================================================

set -euo pipefail

# ==================== 配置（从环境变量读取，提供默认值） ====================
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-panzipool}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:?错误：环境变量 DB_PASSWORD 未设置，请提供数据库密码}"

# 备份保留天数
RETENTION_DAYS=30

# 脚本所在目录的上级即项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 备份目录（相对于项目根目录）
BACKUP_DIR="${PROJECT_ROOT}/backups"

# ==================== 前置检查 ====================
if ! command -v pg_dump &> /dev/null; then
    echo "[错误] 未找到 pg_dump 命令，请先安装 PostgreSQL 客户端工具。"
    echo "       Ubuntu/Debian: sudo apt install postgresql-client"
    echo "       CentOS/RHEL:   sudo yum install postgresql"
    exit 1
fi

# 创建备份目录（如果不存在）
mkdir -p "${BACKUP_DIR}"

# 生成备份文件名：panzipool_backup_YYYYMMDD_HHmmss.sql.gz
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/panzipool_backup_${TIMESTAMP}.sql.gz"

# ==================== 执行备份 ====================
echo "[INFO] 开始备份 PostgreSQL 数据库..."
echo "[INFO]   主机: ${DB_HOST}:${DB_PORT}"
echo "[INFO]   数据库: ${DB_NAME}"
echo "[INFO]   用户: ${DB_USER}"
echo "[INFO]   备份文件: ${BACKUP_FILE}"

# 使用 PGPASSWORD 环境变量传递密码（避免命令行暴露）
# pg_dump 选项说明：
#   -h 主机  -p 端口  -U 用户  -d 数据库
#   --no-owner   不输出设置对象所有权的命令（恢复时更灵活）
#   --no-privileges  不输出访问权限相关命令
export PGPASSWORD="${DB_PASSWORD}"

if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-owner --no-privileges \
    | gzip -9 > "${BACKUP_FILE}"; then
    # 获取备份文件大小（人类可读格式）
    FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "[INFO] 备份成功: ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "[错误] 备份失败！请检查数据库连接配置和网络。"
    # 清理可能生成的不完整备份文件
    rm -f "${BACKUP_FILE}"
    unset PGPASSWORD
    exit 1
fi

unset PGPASSWORD

# ==================== 清理过期备份（保留最近 30 天） ====================
echo "[INFO] 开始清理超过 ${RETENTION_DAYS} 天的旧备份..."

DELETED_COUNT=0
# 查找并删除超过指定天数的备份文件
while IFS= read -r -d '' old_file; do
    rm -f "${old_file}"
    echo "[INFO]   已删除过期备份: $(basename "${old_file}")"
    DELETED_COUNT=$((DELETED_COUNT + 1))
done < <(find "${BACKUP_DIR}" -name "panzipool_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print0)

if [ "${DELETED_COUNT}" -eq 0 ]; then
    echo "[INFO]   无过期备份需要清理。"
else
    echo "[INFO]   共清理 ${DELETED_COUNT} 个过期备份。"
fi

# 列出当前所有备份
echo "[INFO] 当前备份列表:"
ls -lh "${BACKUP_DIR}"/panzipool_backup_*.sql.gz 2>/dev/null | awk '{print "       " $NF " (" $5 ")"}' || echo "       (无)"

echo "[INFO] 备份流程完成。"
