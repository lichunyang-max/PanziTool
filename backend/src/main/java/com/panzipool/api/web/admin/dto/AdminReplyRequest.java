package com.panzipool.api.web.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Schema(description = "管理员回复留言请求")
@Data
public class AdminReplyRequest {

    @Schema(description = "回复内容，空字符串表示清除回复", example = "感谢您的建议，我们已经收到并会尽快处理！")
    @Size(min = 0, max = 1000, message = "回复内容不能超过1000个字符")
    private String reply;
}
