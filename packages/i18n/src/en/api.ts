import type { Widen } from "../utils.js";

export const api = {
  error: {
    invalidCursor: "Invalid pagination cursor. Restart from the first page.",
    tooManyRequests: "You're sending too many requests. Please try again later.",
    unknown: "Something went wrong. Please try again later.",
    invalidResponse: "The server returned an invalid response. Please refresh the page.",
    bundleNotFound: "The song pack was not found or you don't have permission to access it.",
    noBeatmapAvailable: "No beatmaps available right now…",
    auth: {
      csrfInvalid: "Unable to verify where this request came from. Please refresh and try again.",
      unauthorized: "Please sign in to continue.",
      invalidCredentials: "Incorrect email or password.",
      emailAlreadyInUse: "An account with this email already exists.",
      slugAlreadyInUse: "That username is already taken. Please choose another.",
      emailSendFailed: "The email could not be sent. Please try again later.",
      registration: {},
      resetPassword: {
        invalidOrExpiredOtp: "This password reset code is invalid or expired.",
      },
    },
    user: {
      notFound: "No account was found with that information.",
      updateFailed: "The account could not be updated. Please try again.",
      invalidSlug: "The username format is invalid.",
      noFieldsToUpdate: "No fields were provided to update.",
    },
    upload: {
      error: {
        typeNotAccepted: "That file type is not supported. Upload a ZIP file.",
        noValidUgcFiles: "No valid UGC beatmaps were found in the ZIP archive.",
        processingFailed: "This upload could not be processed. Please try again later.",
        noValidSongs: "No valid UGC beatmaps could be processed.",
        uploadFailed: "The song pack could not be uploaded. Please try again.",
        uploadCanceled: "The upload was canceled.",
        missingBundleKey: "Song pack data is missing. Please upload again.",
        jobCreationFailed: "The upload job could not be started. Please try again.",
      },
      convert: {
        processingFailed: "Failed to process the file.",
        fileNotFound: "The file was not found.",
        beatmapFailed: "The beatmap could not be processed.",
      },
    },
    forbidden: "You don't have permission to do this.",
    resourceExpired: "This resource has expired and is no longer available.",
    collaboration: {
      cannotInviteSelf: "You cannot invite yourself as a collaborator.",
      alreadyCollaborator: "This user is already a collaborator on this song pack.",
      pendingRequestExists: "A collaboration request has already been sent to this user.",
      requestNotFound: "The collaboration request was not found.",
      tooManyCollaborators: "This song pack has reached the maximum number of collaborators.",
      cannotCancelDeclined: "You cannot cancel a declined request.",
      onlyDeclinedCanBeDismissed: "Only declined requests can be dismissed.",
      notAccepted: "This collaboration has not been accepted.",
      inviteFailed: "The collaboration invite could not be sent. Please try again.",
    },
  },
} as const;

export type ApiTranslation = Widen<typeof api>;
