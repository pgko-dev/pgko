import type { ValiTranslation } from "../en/vali.js";

export const vali = {
  image: {
    invalidContent: "画像が無効か、対応していない形式です。別の画像を選択してください。",
  },
  bio: {
    invalid: "有効な自己紹介を入力してください",
    maxLength: "自己紹介は {{max}} 文字以内で入力してください",
  },
  name: {
    required: "ニックネームを入力してください",
    invalid: "有効なニックネームを入力してください",
    minLength: "ニックネームは {{min}} 文字以上にしてください",
    maxLength: "ニックネームは {{max}} 文字以内で入力してください",
    patternMismatch: "ニックネームに「,」「，」「،」などのコンマ記号は使えません",
  },
  email: {
    required: "メールアドレスを入力してください",
    invalid: "有効なメールアドレスを入力してください",
    maxLength: "メールアドレスは {{max}} 文字以内で入力してください",
  },
  password: {
    required: "パスワードを入力してください",
    invalid: "有効なパスワードを入力してください",
    minLength: "パスワードは {{min}} 文字以上にしてください",
    maxLength: "パスワードは {{max}} 文字以内で入力してください",
    patternMismatch: "パスワードには英小文字・英大文字・数字をそれぞれ 1 文字以上含めてください",
  },
  confirmPassword: {
    notMatch: "パスワードが一致しません。確認用パスワードを入力し直してください",
  },
  otp: {
    required: "認証コードを入力してください",
    invalid: "有効な 6 桁の認証コードを入力してください",
  },
  slug: {
    required: "ユーザー名を入力してください",
    invalid: "有効なユーザー名を入力してください",
    minLength: "ユーザー名は {{min}} 文字以上にしてください",
    maxLength: "ユーザー名は {{max}} 文字以内で入力してください",
    patternMismatch:
      "ユーザー名は英小文字（a–z）・数字（0–9）・ハイフン（-）のみ使用でき、先頭と末尾は英字または数字にしてください",
  },
  bundle: {
    title: {
      required: "タイトルを入力してください",
      invalid: "有効なタイトルを入力してください",
      maxLength: "タイトルは {{max}} 文字以内で入力してください",
    },
    artist: {
      required: "アーティスト名を入力してください",
      invalid: "有効なアーティスト名を入力してください",
      maxLength: "アーティスト名は {{max}} 文字以内で入力してください",
    },
    description: {
      invalid: "有効な説明を入力してください",
      maxLength: "説明は {{max}} 文字以内で入力してください",
    },
    tags: {
      maxLength: "タグは最大 {{max}} 個まで追加できます",
    },
    tag: {
      invalid: "有効なタグを入力してください",
      minLength: "タグは {{min}} 文字以上にしてください",
      maxLength: "タグは {{max}} 文字以内で入力してください",
      pattern: "タグには英小文字（a–z）・数字（0–9）・スペースのみ使用できます",
    },
    videoUrl: {
      invalid: "有効な動画 URL を入力してください",
      maxLength: "動画 URL は {{max}} 文字以内で入力してください",
    },
  },
} satisfies ValiTranslation;
