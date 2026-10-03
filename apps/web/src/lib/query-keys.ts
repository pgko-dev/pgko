import type { BundleListQuery, UserListQuery } from "@pgko.dev/schema";

export const QUERY_KEYS = {
  bundlePrivate: (bundleId?: string) => (bundleId ? ["bundle-private", bundleId] : []),
  bundlePublic: (bundleId?: string) => (bundleId ? ["bundle-public", bundleId] : []),
  bundleStats: (bundleId?: string) => (bundleId ? ["bundle-stats", bundleId] : []),
  bundleList: (filters: BundleListQuery, account = false) => [
    "bundle-list",
    { ...filters, account },
  ],
  bundleListAll: ["bundle-list"],
  userProfile: (jointID?: string) => (jointID ? ["user-profile", jointID] : []),
  userList: (filters: Omit<UserListQuery, "cursor">) => ["user-list", filters],
  serverConfig: ["server-config"],
  bundleCollaborationRequests: (bundleId?: string) =>
    bundleId ? ["bundle-collaboration-requests", bundleId] : [],
} as const;

export const MUTATION_KEYS = {
  slugAvailability: (slug: string) => ["slug-availability", slug],
  deleteAccount: "delete-account",
  signOut: "sign-out",
  updateProfile: "update-profile",
  uploadBundle: "upload-bundle",
  updateBundleMetadata: "update-bundle-metadata",
  releaseBundle: "release-bundle",
  deleteBundle: "delete-bundle",
  reuploadBundle: "reupload-bundle",
  replaceBundle: "replace-bundle",
  uploadCover: "upload-cover",
  deleteCover: "delete-cover",
  inviteCollaborator: "invite-collaborator",
  acceptCollaborationRequest: "accept-collaboration-request",
  declineCollaborationRequest: "decline-collaboration-request",
  cancelCollaborationRequest: "cancel-collaboration-request",
  dismissCollaborationRequest: "dismiss-collaboration-request",
  leaveCollaboration: "leave-collaboration",
  signIn: "sign-in",
  register: "register",
  resetPassword: "reset-password",
  requestPasswordReset: "request-password-reset",
  randomBundle: "random-bundle",
} as const;
