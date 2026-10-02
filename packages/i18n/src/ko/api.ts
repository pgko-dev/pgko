import type { ApiTranslation } from "../en/api.js";

export const api = {
  error: {
    invalidCursor: "페이지 커서가 올바르지 않습니다. 첫 페이지부터 다시 시작해 주세요.",
    tooManyRequests: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    unknown: "문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    invalidResponse: "서버가 올바르지 않은 응답을 반환했습니다. 페이지를 새로고침해 주세요.",
    bundleNotFound: "곡팩을 찾을 수 없거나 접근 권한이 없습니다.",
    noBeatmapAvailable: "지금은 이용할 수 있는 비트맵이 없습니다…",
    auth: {
      csrfInvalid: "요청의 출처를 확인할 수 없습니다. 페이지를 새로고침한 후 다시 시도해 주세요.",
      unauthorized: "계속하려면 로그인해 주세요.",
      invalidCredentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
      emailAlreadyInUse: "이미 이 이메일로 가입된 계정이 있습니다.",
      slugAlreadyInUse: "이미 사용 중인 사용자 이름입니다. 다른 이름을 선택해 주세요.",
      emailSendFailed: "이메일을 보낼 수 없습니다. 잠시 후 다시 시도해 주세요.",
      registration: {},
      resetPassword: {
        invalidOrExpiredOtp: "비밀번호 재설정 코드가 올바르지 않거나 만료되었습니다.",
      },
    },
    user: {
      notFound: "해당 정보로 계정을 찾을 수 없습니다.",
      updateFailed: "계정을 업데이트할 수 없습니다. 다시 시도해 주세요.",
      invalidSlug: "사용자 이름 형식이 올바르지 않습니다.",
      noFieldsToUpdate: "업데이트할 항목이 없습니다.",
    },
    upload: {
      error: {
        typeNotAccepted: "지원하지 않는 파일 형식입니다. ZIP 파일을 업로드해 주세요.",
        noValidUgcFiles: "ZIP 안에 유효한 UGC 비트맵이 없습니다.",
        processingFailed: "업로드를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        noValidSongs: "처리할 수 있는 유효한 UGC 비트맵이 없습니다.",
        uploadFailed: "곡팩 업로드에 실패했습니다. 다시 시도해 주세요.",
        uploadCanceled: "업로드가 취소되었습니다.",
        missingBundleKey: "곡팩 데이터가 없습니다. 다시 업로드해 주세요.",
        jobCreationFailed: "업로드 작업을 시작할 수 없습니다. 다시 시도해 주세요.",
      },
      convert: {
        processingFailed: "파일 처리에 실패했습니다.",
        fileNotFound: "파일을 찾을 수 없습니다.",
        beatmapFailed: "비트맵을 처리할 수 없습니다.",
      },
    },
    forbidden: "이 작업을 수행할 권한이 없습니다.",
    resourceExpired: "이 리소스는 만료되어 더 이상 사용할 수 없습니다.",
    collaboration: {
      cannotInviteSelf: "본인을 협업자로 초대할 수 없습니다.",
      alreadyCollaborator: "이 사용자는 이미 이 곡팩의 협업자입니다.",
      pendingRequestExists: "이 사용자에게 이미 협업 초대가 전송되었습니다.",
      requestNotFound: "협업 요청을 찾을 수 없습니다.",
      tooManyCollaborators: "이 곡팩의 협업자 수가 상한에 도달했습니다.",
      cannotCancelDeclined: "거절된 요청은 취소할 수 없습니다.",
      onlyDeclinedCanBeDismissed: "거절된 요청만 삭제할 수 있습니다.",
      notAccepted: "이 협업은 아직 수락되지 않았습니다.",
      inviteFailed: "협업 초대를 보낼 수 없습니다. 다시 시도해 주세요.",
    },
  },
} satisfies ApiTranslation;
