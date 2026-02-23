import ClientLayoutWrapper from "./clientLayoutWrapper";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>;
}
