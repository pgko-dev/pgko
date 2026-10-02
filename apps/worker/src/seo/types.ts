export type SeoMatch =
  | {
      type: "bundle";
      id: string;
      canonicalUrl: string;
    }
  | {
      type: "user";
      jointId: string;
      canonicalUrl: string;
    };
