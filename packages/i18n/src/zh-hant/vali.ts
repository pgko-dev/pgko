import type { ValiTranslation } from "../en/vali.js";

export const vali = {
  image: {
    invalidContent: "圖片無效或格式不受支援，請選擇其他圖片。",
  },
  bio: {
    invalid: "請輸入有效的個人簡介",
    maxLength: "個人簡介不能超過 {{max}} 個字元",
  },
  name: {
    required: "請輸入暱稱",
    invalid: "請輸入有效的暱稱",
    minLength: "暱稱至少需要 {{min}} 個字元",
    maxLength: "暱稱不能超過 {{max}} 個字元",
    patternMismatch: "暱稱不能包含逗號或類似符號（例如：, ， ،）",
  },
  email: {
    required: "請輸入電子郵件地址",
    invalid: "請輸入有效的電子郵件地址",
    maxLength: "電子郵件地址不能超過 {{max}} 個字元",
  },
  password: {
    required: "請輸入密碼",
    invalid: "請輸入有效的密碼",
    minLength: "密碼至少需要 {{min}} 個字元",
    maxLength: "密碼不能超過 {{max}} 個字元",
    patternMismatch: "密碼須包含至少一個小寫字母、一個大寫字母和一個數字",
  },
  confirmPassword: {
    notMatch: "兩次輸入的密碼不一致，請重新確認",
  },
  otp: {
    required: "請輸入驗證碼",
    invalid: "請輸入有效的 6 位驗證碼",
  },
  slug: {
    required: "請輸入使用者名稱",
    invalid: "請輸入有效的使用者名稱",
    minLength: "使用者名稱至少需要 {{min}} 個字元",
    maxLength: "使用者名稱不能超過 {{max}} 個字元",
    patternMismatch:
      "使用者名稱須以字母或數字開頭和結尾，中間僅可含小寫字母（a–z）、數字（0–9）和連字號（-）",
  },
  bundle: {
    title: {
      required: "請輸入標題",
      invalid: "請輸入有效的標題",
      maxLength: "標題不能超過 {{max}} 個字元",
    },
    artist: {
      required: "請輸入演出者",
      invalid: "請輸入有效的演出者名稱",
      maxLength: "演出者名稱不能超過 {{max}} 個字元",
    },
    description: {
      invalid: "請輸入有效的簡介",
      maxLength: "簡介不能超過 {{max}} 個字元",
    },
    tags: {
      maxLength: "最多可新增 {{max}} 個標籤",
    },
    tag: {
      invalid: "請輸入有效的標籤",
      minLength: "標籤至少需要 {{min}} 個字元",
      maxLength: "標籤不能超過 {{max}} 個字元",
      pattern: "標籤僅可包含小寫字母（a–z）、數字（0–9）和空白",
    },
    videoUrl: {
      invalid: "請輸入有效的影片連結",
      maxLength: "影片連結不能超過 {{max}} 個字元",
    },
  },
} satisfies ValiTranslation;
