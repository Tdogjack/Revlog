import type { Tokens } from "@revlog/api";

// Browser previews only, where secure storage doesn't exist. Nothing is kept.
let tokens: Tokens | null = null;

export const currentTokens = () => tokens;
export const loadTokens = async () => tokens;
export const saveTokens = async (next: Tokens) => {
  tokens = next;
};
export const clearTokens = async () => {
  tokens = null;
};
