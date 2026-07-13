package com.panzipool.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 示例 DTO，用于演示 JSR-303 Bean Validation 各类约束的用法。
 *
 * <p>该类仅为 Task 2 骨架验证用途，后续 Task 4-6 将填充实际的业务 DTO
 * （如事件上报 DTO、点赞 DTO 等）。</p>
 */
@Schema(description = "示例请求 DTO（演示 JSR-303 校验）")
public class DemoRequest {

    @Schema(description = "名称", example = "json-formatter")
    @NotBlank(message = "名称不能为空")
    @Size(max = 50, message = "名称最长 50 个字符")
    private String name;

    @Schema(description = "年龄", example = "18")
    @NotNull(message = "年龄不能为空")
    @Min(value = 0, message = "年龄不能为负数")
    @Max(value = 150, message = "年龄不能超过 150")
    private Integer age;

    @Schema(description = "邮箱", example = "user@panzipool.com")
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Pattern(regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", message = "邮箱格式不正确")
    private String email;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
