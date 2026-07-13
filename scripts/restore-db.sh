#!/usr/bin/env bash
# ============================================================================
# PanziPool PostgreSQL 数据库恢复脚本
# ----------------------------------------------------------------------------
# 功能：从指定的 gzip 压缩备份文件恢复 PostgreSQL 数据库。
#
# 使用方式：
#   ./scripts/restore-db.sh <backup_file.sql.gz>
#
# 示例：
#   ./scripts/restore-db.sh backups/panzipool_backup_20250101_010000.sql.gz
#
# 所需环境变量：
#   DB_HOST      数据库主机地址（默认 localhost）
#   DB_PORT      数据库端口（默认 5432）
#   DB_NAME      数据库名称（默认 panzipool）
#   DB_USER      数据库用户名（默认 postgres）
#   DB_PASSWORD  数据库密码（必填）
#
# 注意事项：
#   1. 恢复操作会覆盖目标数据库中的现有数据，请谨慎执行！
#   2. 恢复前建议先备份当前数据库（如果还有有效数据）。
#   3. 如果目标数据库不存在，需先手动创建：
#      createdb -h <host> -p <port> -U <user> panzipool
#   4. 备份文件使用 --no-owner --no-privileges 导出，
#      恢复时不需要原数据库的所有者和权限配置。
# ============================================================================

set -euo pipefail

# ==================== 配置（从环境变量读取，提供默认值） ====================
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-panzipool}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:?错误：环境变量 DB_PASSWORD 未设置，请提供数据库密码}"

# ==================== 参数校验 ====================
if [ "$#" -ne 1 ]; then
    echo "用法: $0 <backup_file.sql.gz>"
    echo "示例: $0 backups/panzipool_backup_20250101_010000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "[错误] 备份文件不存在: ${BACKUP_FILE}"
    exit 1
fi

# ==================== 前置检查 ====================
if ! command -v psql &> /dev/null; then
    echo "[错误] 未找到 psql 命令，请先安装 PostgreSQL 客户端工具。"
    echo "       Ubuntu/Debian: sudo apt install postgresql-client"
    echo "       CentOS/RHEL:   sudo yum install postgresql"
    exit 1
fi

if ! command -v gunzip &> /dev/null; then
    echo "[错误] 未找到 gunzip 命令，请先安装 gzip 工具。"
    exit 1
fi

# ==================== 确认恢复操作 ====================
echo "========================================"
echo "  PanziPool 数据库恢复"
echo "========================================"
echo "  主机:     ${DB_HOST}:${DB_PORT}"
echo "  数据库:   ${DB_NAME}"
echo "  用户:     ${DB_USER}"
echo "  备份文件: ${BACKUP_FILE}"
echo "========================================"
echo ""
echo "[警告] 恢复操作将覆盖目标数据库中的现有数据！"
read -p "确认要继续恢复吗？(输入 yes 继续): " confirm

if [ "${confirm}" != "yes" ]; then
    echo "[INFO] 用户取消恢复操作。"
    exit 0
fi

# ==================== 执行恢复 ====================
echo "[INFO] 开始恢复数据库..."

export PGPASSWORD="${DB_PASSWORD}"

# 解压备份文件并通过管道导入 psql
# gunzip -c 解压到标准输出（不修改原文件）
# psql 选项说明：
#   -h 主机  -p 端口  -U 用户  -d 数据库
#   -v ON_ERROR_STOP=1  遇到错误时停止执行（避免部分恢复）
#   -q  安静模式（减少输出）
if gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -v ON_ERROR_STOP=1 -q; then
    echo "[INFO] 数据库恢复成功！"
    echo "[INFO]   源备份文件: ${BACKUP_FILE}"
    echo "[INFO]   目标数据库: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
else
    echo "[错误] 数据库恢复失败！请检查错误信息。"
    unset PGPASSWORD
    exit 1
fi

unset PGPASSWORD

echo "[INFO] 恢复流程完成。"
