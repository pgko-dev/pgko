import type { ValiTranslation } from "../en/vali.js";

export const vali = {
  image: {
    invalidContent: "图片无效或格式不受支持，请选择其他图片。",
  },
  bio: {
    invalid: "请输入有效的个人简介",
    maxLength: "个人简介不能超过 {{max}} 个字符",
  },
  name: {
    required: "请输入昵称",
    invalid: "请输入有效的昵称",
    minLength: "昵称至少需要 {{min}} 个字符",
    maxLength: "昵称不能超过 {{max}} 个字符",
    patternMismatch: "昵称不能包含逗号或类似符号（例如：, ， ،）",
  },
  email: {
    required: "请输入邮箱地址",
    invalid: "请输入有效的邮箱地址",
    maxLength: "邮箱地址不能超过 {{max}} 个字符",
  },
  password: {
    required: "请输入密码",
    invalid: "请输入有效的密码",
    minLength: "密码至少需要 {{min}} 个字符",
    maxLength: "密码不能超过 {{max}} 个字符",
    patternMismatch: "密码须包含至少一个小写字母、一个大写字母和一个数字",
  },
  confirmPassword: {
    notMatch: "两次输入的密码不一致，请重新确认",
  },
  otp: {
    required: "请输入验证码",
    invalid: "请输入有效的 6 位验证码",
  },
  slug: {
    required: "请输入用户名",
    invalid: "请输入有效的用户名",
    minLength: "用户名至少需要 {{min}} 个字符",
    maxLength: "用户名不能超过 {{max}} 个字符",
    patternMismatch:
      "用户名须以字母或数字开头和结尾，中间仅可含小写字母（a–z）、数字（0–9）和连字符（-）",
  },
  bundle: {
    title: {
      required: "请输入标题",
      invalid: "请输入有效的标题",
      maxLength: "标题不能超过 {{max}} 个字符",
    },
    artist: {
      required: "请输入曲师",
      invalid: "请输入有效的曲师名称",
      maxLength: "曲师名称不能超过 {{max}} 个字符",
    },
    description: {
      invalid: "请输入有效的简介",
      maxLength: "简介不能超过 {{max}} 个字符",
    },
    tags: {
      maxLength: "最多可添加 {{max}} 个标签",
    },
    tag: {
      invalid: "请输入有效的标签",
      minLength: "标签至少需要 {{min}} 个字符",
      maxLength: "标签不能超过 {{max}} 个字符",
      pattern: "标签仅可包含小写字母（a–z）、数字（0–9）和空格",
    },
    videoUrl: {
      invalid: "请输入有效的视频链接",
      maxLength: "视频链接不能超过 {{max}} 个字符",
    },
  },
} satisfies ValiTranslation;
