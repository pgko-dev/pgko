import type { ApiTranslation } from "../en/api.js";

export const api = {
  error: {
    resourceVersionConflict:
      "編集中に曲パックが変更されました。再読み込みしてから保存してください。",
    visibilityLocked: "管理者がこの曲パックの公開設定をロックしています。",
    invalidSongId:
      "この曲パックに含まれなくなった曲があります。再読み込みしてから保存してください。",
    idempotencyConflict: "この再試行キーは別のリクエストで使用されています。",
    invalidIdempotencyKey: "有効な Idempotency-Key ヘッダーが必要です。",
    routeNotFound: "指定された API エンドポイントが見つかりません。",
    invalidCursor: "ページ送りのカーソルが無効です。最初のページからやり直してください。",
    tooManyRequests: "リクエストが多すぎます。しばらくしてからもう一度お試しください",
    unknown: "問題が発生しました。しばらくしてからもう一度お試しください",
    invalidResponse: "サーバーから無効な応答が返されました。ページを再読み込みしてください",
    bundleNotFound: "楽曲パックが見つからないか、アクセス権限がありません",
    noBeatmapAvailable: "現在利用できる譜面がありません…",
    auth: {
      csrfInvalid:
        "リクエストの送信元を確認できませんでした。ページを再読み込みしてもう一度お試しください",
      unauthorized: "続けるにはログインしてください",
      invalidCredentials: "メールアドレスまたはパスワードが正しくありません",
      emailAlreadyInUse: "このメールアドレスはすでに登録されています",
      slugAlreadyInUse: "そのユーザー名はすでに使われています。別の名前を選んでください",
      emailSendFailed: "メールを送信できませんでした。しばらくしてからもう一度お試しください",
      registration: {},
      resetPassword: {
        invalidOrExpiredOtp: "このパスワード再設定コードは無効か、有効期限が切れています",
      },
    },
    user: {
      notFound: "該当するアカウントが見つかりませんでした",
      updateFailed: "アカウントを更新できませんでした。もう一度お試しください",
      invalidSlug: "ユーザー名の形式が正しくありません",
      noFieldsToUpdate: "更新する項目が指定されていません",
    },
    upload: {
      error: {
        typeNotAccepted:
          "このファイル形式には対応していません。ZIP ファイルをアップロードしてください",
        noValidUgcFiles: "ZIP 内に有効な UGC 譜面が見つかりませんでした",
        processingFailed:
          "アップロードを処理できませんでした。しばらくしてからもう一度お試しください",
        noValidSongs: "有効な UGC 譜面を処理できませんでした",
        uploadFailed: "楽曲パックのアップロードに失敗しました。もう一度お試しください",
        uploadCanceled: "アップロードがキャンセルされました",
        missingBundleKey: "楽曲パックのデータがありません。もう一度アップロードしてください",
        jobCreationFailed: "アップロード処理を開始できませんでした。もう一度お試しください",
      },
      convert: {
        processingFailed: "ファイルの処理に失敗しました",
        fileNotFound: "ファイルが見つかりませんでした",
        beatmapFailed: "譜面を処理できませんでした",
      },
    },
    forbidden: "この操作を行う権限がありません",
    resourceExpired: "このリソースは有効期限が切れており、利用できません",
    collaboration: {
      cannotInviteSelf: "自分自身を合作者として招待することはできません",
      alreadyCollaborator: "このユーザーはすでにこの楽曲パックの合作者です",
      pendingRequestExists: "このユーザーにはすでに合作の招待が送られています",
      requestNotFound: "合作リクエストが見つかりませんでした",
      tooManyCollaborators: "この楽曲パックの合作者数が上限に達しています",
      cannotCancelDeclined: "辞退済みのリクエストは取り消せません",
      onlyDeclinedCanBeDismissed: "辞退済みのリクエストのみ削除できます",
      notAccepted: "この合作はまだ承諾されていません",
      inviteFailed: "合作の招待を送信できませんでした。もう一度お試しください",
    },
  },
} satisfies ApiTranslation;
