import type { ValiTranslation } from "../en/vali.js";

export const vali = {
  image: {
    invalidContent:
      "이미지가 유효하지 않거나 지원되지 않는 형식입니다. 다른 이미지를 선택해 주세요.",
  },
  bio: {
    invalid: "올바른 소개를 입력해 주세요.",
    maxLength: "소개는 {{max}}자 이하여야 합니다.",
  },
  name: {
    required: "닉네임을 입력해 주세요.",
    invalid: "올바른 닉네임을 입력해 주세요.",
    minLength: "닉네임은 {{min}}자 이상이어야 합니다.",
    maxLength: "닉네임은 {{max}}자 이하여야 합니다.",
    patternMismatch: "닉네임에는 쉼표 등 구두점 문자(예: , ， ،)를 사용할 수 없습니다.",
  },
  email: {
    required: "이메일 주소를 입력해 주세요.",
    invalid: "올바른 이메일 주소를 입력해 주세요.",
    maxLength: "이메일은 {{max}}자 이하여야 합니다.",
  },
  password: {
    required: "비밀번호를 입력해 주세요.",
    invalid: "올바른 비밀번호를 입력해 주세요.",
    minLength: "비밀번호는 {{min}}자 이상이어야 합니다.",
    maxLength: "비밀번호는 {{max}}자 이하여야 합니다.",
    patternMismatch: "비밀번호에는 소문자, 대문자, 숫자를 각각 하나 이상 포함해야 합니다.",
  },
  confirmPassword: {
    notMatch: "비밀번호가 일치하지 않습니다. 다시 확인해 주세요.",
  },
  otp: {
    required: "인증 코드를 입력해 주세요.",
    invalid: "올바른 6자리 인증 코드를 입력해 주세요.",
  },
  slug: {
    required: "사용자 이름을 입력해 주세요.",
    invalid: "올바른 사용자 이름을 입력해 주세요.",
    minLength: "사용자 이름은 {{min}}자 이상이어야 합니다.",
    maxLength: "사용자 이름은 {{max}}자 이하여야 합니다.",
    patternMismatch:
      "사용자 이름은 영문 소문자(a–z), 숫자(0–9), 하이픈(-)만 사용할 수 있으며, 처음과 끝은 영문 또는 숫자여야 합니다.",
  },
  bundle: {
    title: {
      required: "제목을 입력해 주세요.",
      invalid: "올바른 제목을 입력해 주세요.",
      maxLength: "제목은 {{max}}자 이하여야 합니다.",
    },
    artist: {
      required: "아티스트를 입력해 주세요.",
      invalid: "올바른 아티스트 이름을 입력해 주세요.",
      maxLength: "아티스트 이름은 {{max}}자 이하여야 합니다.",
    },
    description: {
      invalid: "올바른 설명을 입력해 주세요.",
      maxLength: "설명은 {{max}}자 이하여야 합니다.",
    },
    tags: {
      maxLength: "태그는 최대 {{max}}개까지 추가할 수 있습니다.",
    },
    tag: {
      invalid: "올바른 태그를 입력해 주세요.",
      minLength: "태그는 {{min}}자 이상이어야 합니다.",
      maxLength: "태그는 {{max}}자 이하여야 합니다.",
      pattern: "태그에는 영문 소문자(a–z), 숫자(0–9), 공백만 사용할 수 있습니다.",
    },
    videoUrl: {
      invalid: "올바른 동영상 URL을 입력해 주세요.",
      maxLength: "동영상 URL은 {{max}}자 이하여야 합니다.",
    },
  },
} satisfies ValiTranslation;
