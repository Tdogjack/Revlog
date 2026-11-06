import "server-only";
import {
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from "obscenity";

// Left out because they're everyday car talk (Hooker headers, Scat Pack, Dick
// Cepek, Wankel rotaries, "tranny" for transmission, "shitbox") or mild enough
// to leave to reports.
const ALLOWED = new Set([
  "arse",
  "ass",
  "bastard",
  "bollocks",
  "dick",
  "hooker",
  "piss",
  "prick",
  "scat",
  "shit",
  "tranny",
  "turd",
  "wank",
]);

const words = new DataSet<{ originalWord: string }>()
  .addAll(englishDataset)
  .removePhrasesIf((phrase) => ALLOWED.has(phrase.metadata?.originalWord ?? ""));

const matcher = new RegExpMatcher({
  ...words.build(),
  ...englishRecommendedTransformers,
});

export const BLOCKED_WORDING = "That wording isn't allowed in the community. Edit it and try again.";

// Screens public text for slurs and sexual terms, including common disguises.
export function hasBlockedWords(text: string) {
  return matcher.hasMatch(text);
}
