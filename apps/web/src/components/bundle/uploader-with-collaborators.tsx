import { Link } from "@tanstack/react-router";
import { User } from "lucide-react";

import { AutoScrollMarquee } from "@/components/auto-scroll-marquee";

export type UploaderParty = {
  id: string;
  name: string;
  slug?: string | null;
};

type RowBodyProps = Readonly<{
  uploadedBy: UploaderParty;
  collaborators?: readonly UploaderParty[];
  noLinkUserId?: string;
}>;

function jointId(party: UploaderParty) {
  return party.slug ?? party.id;
}

function UploaderWithCollaboratorsCard({
  uploadedBy,
  collaborators = [],
  noLinkUserId,
}: RowBodyProps) {
  const isNoLink = (party: UploaderParty) => noLinkUserId != null && party.id === noLinkUserId;

  const nameLink = (party: UploaderParty) => {
    const id = jointId(party);
    if (isNoLink(party)) {
      return <span>{party.name}</span>;
    }
    return (
      <Link
        to="/users/$jointId"
        params={{ jointId: id }}
        className="pointer-events-auto relative z-20 text-primary hover:underline"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {party.name}
      </Link>
    );
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
      <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <AutoScrollMarquee>
          {nameLink(uploadedBy)}
          {collaborators.length > 0 ? (
            <>
              {" & "}
              {collaborators.map((c, index) => (
                <span key={c.id}>
                  {nameLink(c)}
                  {index < collaborators.length - 1 ? ", " : null}
                </span>
              ))}
            </>
          ) : null}
        </AutoScrollMarquee>
      </span>
    </div>
  );
}

function UploaderWithCollaboratorsPage({
  uploadedBy,
  collaborators = [],
  noLinkUserId,
}: RowBodyProps) {
  const isNoLink = (party: UploaderParty) => noLinkUserId != null && party.id === noLinkUserId;

  const nameLink = (party: UploaderParty) => {
    const id = jointId(party);
    if (isNoLink(party)) {
      return <span>{party.name}</span>;
    }
    return (
      <Link to="/users/$jointId" params={{ jointId: id }} className="text-primary hover:underline">
        {party.name}
      </Link>
    );
  };

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
      <User className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <AutoScrollMarquee>
          {nameLink(uploadedBy)}
          {collaborators.length > 0 ? (
            <>
              {" & "}
              {collaborators.map((c, index) => (
                <span key={c.id}>
                  {nameLink(c)}
                  {index < collaborators.length - 1 ? ", " : null}
                </span>
              ))}
            </>
          ) : null}
        </AutoScrollMarquee>
      </span>
    </div>
  );
}

type UploaderWithCollaboratorsRowProps = RowBodyProps &
  Readonly<{
    /**
     * `card` — bundle cards: compact type; profile targets avoid bubbling to the card.
     * `page` — bundle detail / manage header: router links.
     */
    layout: "card" | "page";
  }>;

export function UploaderWithCollaboratorsRow({
  layout,
  ...body
}: UploaderWithCollaboratorsRowProps) {
  if (layout === "card") {
    return <UploaderWithCollaboratorsCard {...body} />;
  }
  return <UploaderWithCollaboratorsPage {...body} />;
}
