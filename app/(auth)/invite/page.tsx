import InvitePage from "./component/invite";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function Invite({ params }: Props) {
  return <InvitePage />;
}
