import type { ApiTranslation } from "../en/api.js";

export const api = {
  error: {
    invalidCursor: "分頁游標無效，請從第一頁重新開始。",
    tooManyRequests: "請求過於頻繁，請稍後再試",
    unknown: "出了點問題，請稍後再試",
    invalidResponse: "伺服器回傳了無效回應，請重新整理頁面",
    bundleNotFound: "找不到該曲包，或你沒有存取權限",
    noBeatmapAvailable: "目前沒有可用的譜面…",
    auth: {
      csrfInvalid: "無法驗證請求來源，請重新整理頁面後重試",
      unauthorized: "請先登入後再繼續",
      invalidCredentials: "電子郵件或密碼錯誤",
      emailAlreadyInUse: "該電子郵件已被註冊",
      slugAlreadyInUse: "該使用者名稱已被使用，請換一個",
      emailSendFailed: "郵件寄送失敗，請稍後再試",
      registration: {},
      resetPassword: {
        invalidOrExpiredOtp: "密碼重設驗證碼無效或已過期",
      },
    },
    user: {
      notFound: "找不到對應帳號",
      updateFailed: "帳號更新失敗，請重試",
      invalidSlug: "使用者名稱格式無效",
      noFieldsToUpdate: "沒有可更新的內容",
    },
    upload: {
      error: {
        typeNotAccepted: "不支援該檔案類型，請上傳 ZIP 壓縮檔",
        noValidUgcFiles: "ZIP 中未找到有效的 UGC 譜面",
        processingFailed: "上傳處理失敗，請稍後再試",
        noValidSongs: "未能成功處理任何 UGC 譜面",
        uploadFailed: "曲包上傳失敗，請重試",
        uploadCanceled: "上傳已取消",
        missingBundleKey: "缺少曲包資料，請重新上傳",
        jobCreationFailed: "無法開始上傳任務，請重試",
      },
      convert: {
        processingFailed: "檔案處理失敗",
        fileNotFound: "找不到該檔案",
        beatmapFailed: "譜面處理失敗",
      },
    },
    forbidden: "你沒有權限執行此操作",
    resourceExpired: "該資源已過期，無法存取",
    collaboration: {
      cannotInviteSelf: "不能邀請自己為合作成員",
      alreadyCollaborator: "該使用者已是本曲包的合作成員",
      pendingRequestExists: "已向該使用者發送過合作邀請",
      requestNotFound: "未找到該合作請求",
      tooManyCollaborators: "該曲包的合作成員數已達上限",
      cannotCancelDeclined: "無法取消已被拒絕的請求",
      onlyDeclinedCanBeDismissed: "只能移除已拒絕的請求",
      notAccepted: "此合作尚未被接受",
      inviteFailed: "合作邀請傳送失敗，請重試",
    },
  },
} satisfies ApiTranslation;
