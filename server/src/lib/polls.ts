export type PollInput = {
  question: string;
  options: string[];
  allowsMultiple: boolean;
};

export type PollValidationResult =
  | { ok: true; value: PollInput }
  | { ok: false; error: string };

export function validatePollInput(input: unknown): PollValidationResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Sondage invalide' };
  const payload = input as Record<string, unknown>;
  const question = typeof payload.question === 'string' ? payload.question.trim() : '';
  if (!question) return { ok: false, error: 'La question est obligatoire' };
  if (question.length > 240) return { ok: false, error: 'Question trop longue (240 caractères maximum)' };
  if (!Array.isArray(payload.options)) return { ok: false, error: 'Ajoute au moins deux choix' };

  const options = payload.options
    .map((option) => typeof option === 'string' ? option.trim() : '')
    .filter(Boolean);
  if (options.length < 2) return { ok: false, error: 'Ajoute au moins deux choix' };
  if (options.length > 10) return { ok: false, error: '10 choix maximum' };
  if (options.some((option) => option.length > 120)) {
    return { ok: false, error: 'Chaque choix est limité à 120 caractères' };
  }
  const normalized = options.map((option) => option.toLocaleLowerCase('fr-FR'));
  if (new Set(normalized).size !== options.length) return { ok: false, error: 'Les choix doivent être différents' };

  return {
    ok: true,
    value: {
      question,
      options,
      allowsMultiple: payload.allows_multiple === true,
    },
  };
}
