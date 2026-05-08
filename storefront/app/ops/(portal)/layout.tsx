import OpsShell from "../../../components/ops/OpsShell"

export default function OpsPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <OpsShell>{children}</OpsShell>
}
