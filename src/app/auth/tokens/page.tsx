import { permanentRedirect } from "next/navigation";

export default function TokensRedirect() {
  permanentRedirect("/auth/agents");
}
