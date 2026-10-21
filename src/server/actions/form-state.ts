/** Shape returned by staff form actions (used with useActionState). */
export interface FormState {
  ok?: boolean;
  message?: string;
  error?: string;
  /** Values shown once (e.g. temporary passwords). */
  secrets?: { label: string; value: string }[];
  /** CSV text offered as a download (e.g. created accounts). */
  csv?: { fileName: string; text: string };
  /** Changes on every result so clients can react to repeated identical results. */
  ts?: number;
}

export const initialFormState: FormState = {};
