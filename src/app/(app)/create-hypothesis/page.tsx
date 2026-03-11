import { permanentRedirect } from "next/navigation";

export default function CreateHypothesisRedirect() {
  permanentRedirect("/hypotheses/new");
}
