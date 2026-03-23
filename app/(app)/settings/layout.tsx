import SettingsNav from "./_components/SettingsNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 p-4 md:grid-cols-[220px_1fr]">
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
