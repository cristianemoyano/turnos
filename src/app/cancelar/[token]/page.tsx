import CancelClient from "./CancelClient";

export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CancelClient token={token} />;
}
