import ClientLayoutWrapper from "./clientLayoutWrapper";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>;
}
