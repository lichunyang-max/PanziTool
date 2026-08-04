package com.panzipool.api.web.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Schema(description = "管理员更新留言状态请求")
@Data
public class AdminStatusRequest {

    @Schema(description = "目标状态：visible/hidden/deleted", example = "hidden")
    @NotBlank(message = "状态不能为空")
    @Pattern(regexp = "^(visible|hidden|deleted)$", message = "状态必须是 visible/hidden/deleted")
    private String status;
}
