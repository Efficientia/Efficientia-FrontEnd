export interface ApiProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}
